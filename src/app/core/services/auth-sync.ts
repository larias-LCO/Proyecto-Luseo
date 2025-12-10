// sincronizacion de pestañas 
(() => {
  const STORAGE_KEY = 'auth.state';
  const LOCK_KEY = 'auth.refresh.lock';
  const CHANNEL_NAME = 'auth';
  const DEFAULT_SAFETY_MS = 2 * 60 * 1000;
  const DEFAULT_SKEW_MS = 30 * 1000;
  const LOGOUT_MARKER_KEY = 'auth.logout';
  const LOGOUT_MARKER_TTL_MS = 100;

  const tabId = Math.random().toString(36).slice(2);

  let bc: BroadcastChannel | null = null;
  try {
    bc = new BroadcastChannel(CHANNEL_NAME);
  } catch (e) {
    // Ignorar si no existe BroadcastChannel
  }

  interface AuthState {
    token?: string;
    expiresAtMillis?: number;
    username?: string;
    role?: string;
    authorities?: string[];
    openMode?: boolean;
    serverDeltaMs?: number;
  }

  interface AuthConfig {
    apiBase?: string;
    safetyMs?: number;
    skewMs?: number;
  }

  let config: AuthConfig = {
    apiBase: '',
    safetyMs: DEFAULT_SAFETY_MS,
    skewMs: DEFAULT_SKEW_MS,
  };

  let state: AuthState = loadState();
  let refreshTimer: number | null = null;
  const listeners = new Set<(state: AuthState) => void>();

  function loadState(): AuthState {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || {};
    } catch {
      return {};
    }
  }

  // 🔹 NUEVA FUNCIÓN: redirigir al login
function cerrarSesion() {
  // Borrar estado de autenticación
  localStorage.removeItem("auth.state");

  // Redirigir a login también en esta pestaña
  window.location.href = "/login";
}

  function redirectToLogin() {
  try {
    const routerAccessor = (window as any).RouterAccessor;
    const router = routerAccessor?.router;
    if (router && !router.url.includes('/login')) {
      router.navigate(['/login']);
      return;
    }
  } catch {
    // Si algo falla o Router no existe, usa recarga completa
  }

  if (!location.pathname.includes('/login')) {
    location.href = '/login';
  }
}

(window as any).Auth = { 
  bootstrap, 
  login, 
  logout, 
  me, 
  refreshToken, 
  fetchWithAuth, 
  onAuthChange, 
  getState,
  redirectToLogin
};


  function saveState(newState: Partial<AuthState>) {
    state = { ...state, ...newState };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    emit();
    broadcast({ type: 'state', payload: state });
  }

  function clearState() {
    state = {};
    localStorage.removeItem(STORAGE_KEY);
    emit();
    broadcast({ type: 'state', payload: state });
    redirectToLogin(); // 🔹 redirige al login al limpiar sesión
  }

  function onStorage(ev: StorageEvent) {
    if (ev.key === STORAGE_KEY && ev.newValue !== ev.oldValue) {
      try {
        state = JSON.parse(ev.newValue || 'null') || {};
      } catch {
        state = {};
      }
      emit();
      scheduleFromState();
    }
    if (ev.key === LOGOUT_MARKER_KEY) {
      clearState();
      redirectToLogin(); // 🔹 redirige si otra pestaña cierra sesión
    }
  }

 function onBroadcast(msg: MessageEvent) {
    if (!msg?.data) return;
    const { type, payload } = msg.data;
    if (type === 'state') {
      state = payload || {};
      emit();
      scheduleFromState();
    } else if (type === 'logout') {
      clearState();
      redirectToLogin(); // 🔹 redirige si recibe broadcast de logout
    }
  }

 window.addEventListener('storage', onStorage);
  if (bc) bc.addEventListener('message', onBroadcast);

  function broadcast(message: any) {
    if (bc) {
      try {
        bc.postMessage(message);
      } catch {}
    }
  }

  function emit() {
    listeners.forEach(cb => {
      try {
        cb(getState());
      } catch {}
    });
  }

  function getState(): AuthState {
    return { ...state };
  }

  function setAuth(token: string, expiresAtMillis: number, user?: Partial<AuthState>) {
    cancelSchedule();
    saveState({
      token,
      expiresAtMillis,
      username: user?.username,
      role: user?.role,
      authorities: user?.authorities,
      openMode: user?.openMode,
      serverDeltaMs: user?.serverDeltaMs,
    });
    scheduleFromState();
  }
  

  function cancelSchedule() {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
  }

  function scheduleFromState() {
    cancelSchedule();
    if (!state?.token || !state?.expiresAtMillis) return;
    const nowClient = Date.now();
    const delta = Number(state.serverDeltaMs || 0);
    const nowServer = nowClient + delta;
    const dueServer = Number(state.expiresAtMillis) - (config.safetyMs! + config.skewMs!);
    const delay = Math.max(0, dueServer - nowServer);
    refreshTimer = window.setTimeout(() => {
      refreshToken().catch(() => {});
    }, delay);
  }

  function withLock<T>(task: () => Promise<T>): Promise<T> {
    const lockOwner = `${tabId}-${Date.now()}`;
    const now = Date.now();
    const LOCK_TTL = 30 * 1000;
    const current = localStorage.getItem(LOCK_KEY);

    if (current) {
      try {
        const lock = JSON.parse(current);
        if (now - lock.ts < LOCK_TTL) {
          return Promise.reject(new Error('Locked'));
        }
      } catch {}
    }

    localStorage.setItem(LOCK_KEY, JSON.stringify({ owner: lockOwner, ts: now }));

    return Promise.resolve()
      .then(task)
      .finally(() => {
        const c2 = localStorage.getItem(LOCK_KEY);
        try {
          const lock2 = JSON.parse(c2 || '{}');
          if (lock2.owner === lockOwner) {
            localStorage.removeItem(LOCK_KEY);
          }
        } catch {
          localStorage.removeItem(LOCK_KEY);
        }
      });
  }

 function authHeader(): Record<string, string> {
    return state?.token ? { Authorization: `Bearer ${state.token}` } : {};
  }

  function url(path: string): string {
    return (config.apiBase || '') + path;
  }

  async function login(login: string, password: string): Promise<AuthState> {
    const res = await fetch(url('/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password }),
    });
    if (!res.ok) throw new Error(`Login failed: ${res.status}`);
    const data = await res.json();
    setAuth(data.token, data.expiresAtMillis, {
      username: data.username,
      role: data.role,
      authorities: data.role ? [`ROLE_${data.role}`] : [],
    });
    return getState();
  }

  async function logout() {
    if (state?.token) {
      try {
        await fetch(url('/auth/logout'), {
          method: 'POST',
          headers: { ...authHeader() },
        });
      } catch {}
    }
    clearState();
    try {
      localStorage.setItem(LOGOUT_MARKER_KEY, String(Date.now()));
      setTimeout(() => {
        try {
          localStorage.removeItem(LOGOUT_MARKER_KEY);
        } catch {}
      }, LOGOUT_MARKER_TTL_MS);
    } catch {}
    broadcast({ type: 'logout' });
    redirectToLogin(); // 🔹 redirige también en esta pestaña
  }

  async function me(): Promise<AuthState> {
    const res = await fetch(url('/auth/me'), { headers: { ...authHeader() } });
    if (!res.ok) throw new Error(`Me failed: ${res.status}`);
    const data = await res.json();
    const serverDeltaMs = Number(data.serverTimeMillis) - Date.now();
    saveState({
      openMode: !!data.openMode,
      username: data.username || state.username,
      role: data.role || state.role,
      authorities: data.authorities || state.authorities,
      serverDeltaMs,
    });
    if (state.token && data.tokenExpiresAtMillis) {
      saveState({ expiresAtMillis: data.tokenExpiresAtMillis });
      scheduleFromState();
    }
    return getState();
  }

  async function refreshToken(): Promise<AuthState> {
    if (!state?.token) throw new Error('No token');
    return withLock(async () => {
      const res = await fetch(url('/auth/refresh'), {
        method: 'POST',
        headers: { ...authHeader() },
      });
      if (!res.ok) throw new Error(`Refresh failed: ${res.status}`);
      const data = await res.json();
      setAuth(data.token, data.expiresAtMillis, {
        username: data.username,
        role: data.role,
        authorities: data.role ? [`ROLE_${data.role}`] : [],
        openMode: state.openMode,
        serverDeltaMs: state.serverDeltaMs,
      });
      return getState();
    });
  }

  async function fetchWithAuth(input: RequestInfo, init?: RequestInit): Promise<Response> {
    init = init || {};
    init.headers = { ...(init.headers || {}), ...authHeader() };
    // Si input es una ruta relativa, conviértela a absoluta usando url(path)
    let realInput = input;
    if (typeof input === 'string' && input.startsWith('/')) {
      realInput = url(input);
    }
    let res = await fetch(realInput, init);
    if (res.status === 401 && state?.token) {
      try {
        await refreshToken();
        init.headers = { ...(init.headers || {}), ...authHeader() };
        res = await fetch(realInput, init);
      } catch {}
    }
    return res;
  }

  function onAuthChange(cb: (state: AuthState) => void): () => void {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }

  async function bootstrap(opts?: AuthConfig): Promise<AuthState> {
    config = { ...config, ...(opts || {}) };
    state = loadState();
    emit();
    scheduleFromState();
    try {
      await me();
    } catch {}
    return getState();
  }

  (window as any).Auth = { bootstrap, login, logout, me, refreshToken, fetchWithAuth, onAuthChange, getState };
})();