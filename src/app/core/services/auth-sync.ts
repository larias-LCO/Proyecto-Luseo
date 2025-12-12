// sincronizacion de pestañas 
// Tipos globales para compatibilidad con Angular/TypeScript
declare global {
  interface Window {
    RouterAccessor?: { router?: { url: string; navigate: (commands: any[]) => void } };
    _tasksDataCache?: { tasks?: any[]; lastUpdate?: number };
    _fcStateCache?: any;
    fcInstances?: Record<string, any>;
    clearProjectsCache?: () => void;
    clearTasksCache?: () => void;
    clearReportHoursCache?: () => void;
    clearEmployeesCache?: () => void;
    projectsCache?: any;
  }
}
(() => {
  const STORAGE_KEY = 'auth.state';
  const LOCK_KEY = 'auth.refresh.lock';
  const CHANNEL_NAME = 'auth';
  const ACTIVITY_KEY = 'auth.lastActivity';
  const DEFAULT_SAFETY_MS = 2 * 60 * 1000;
  const DEFAULT_SKEW_MS = 30 * 1000;
  const LOGOUT_MARKER_KEY = 'auth.logout';
  const LOGOUT_MARKER_TTL_MS = 100;

  const TOKEN_REFRESH_BEFORE_EXPIRY = 5 * 60 * 1000;
  const INACTIVITY_LOGOUT_TIME = 60 * 60 * 1000;
  const HEARTBEAT_INTERVAL = 2 * 60 * 1000;
  const MIN_ACTIVITY_FOR_REFRESH = 15 * 60 * 1000;

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
    employeeId?: number;
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
  let heartbeatTimer: number | null = null;
  let lastActivityTime = Date.now();
  const listeners = new Set<(state: AuthState) => void>();

  function normRole(raw?: any): string {
    if (!raw) return '';
    const s = String(raw).trim().toUpperCase();
    return s.startsWith('ROLE_') ? s.slice(5) : s;
  }

  function inferRoleFromAuthorities(auths?: any): string {
    if (!auths) return '';
    const arr = Array.isArray(auths) ? auths : [auths];
    const set = new Set<string>(arr.map(normRole).filter(Boolean));
    if (set.has('OWNER')) return 'OWNER';
    if (set.has('ADMIN')) return 'ADMIN';
    if (set.has('USER')) return 'USER';
    return Array.from(set)[0] || '';
  }

  function inferRoleFromData(data: any, fallback?: string): string {
    if (!data) return fallback || '';
    const direct = normRole((data.role || data.accountRole));
    if (direct) return direct;
    const rolesField = (data.roles as any);
    if (Array.isArray(rolesField)) {
      const fromList = rolesField
        .map((r: any) => typeof r === 'string' ? r : (r && (r.name || r.role || r.authority || r.rol || r.roleName || r.label)))
        .map(normRole)
        .find(Boolean);
      if (fromList) return fromList as string;
    } else if (typeof rolesField === 'string') {
      const one = normRole(rolesField);
      if (one) return one;
    } else if (rolesField && typeof rolesField === 'object') {
      const one = normRole(rolesField.name || rolesField.role || rolesField.authority || rolesField.rol || rolesField.roleName || rolesField.label);
      if (one) return one;
    }
    const fromAuth = inferRoleFromAuthorities(data.authorities);
    if (fromAuth) return fromAuth;
    return fallback || '';
  }

  function ensureAuthoritiesForRole(role: string, authorities?: string[]): string[] {
    if (authorities && Array.isArray(authorities) && authorities.length > 0) return authorities;
    const r = normRole(role);
    return r ? [`ROLE_${r}`] : [];
  }

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

  function redirectToLogin(reason?: string) {
  try {
    const routerAccessor = (window as any).RouterAccessor;
    const router = routerAccessor?.router;
    if (router && !router.url.includes('/login')) {
      try { sessionStorage.setItem('auth.logout.reason', String(reason || '')); } catch {}
      router.navigate(['/login']);
      return;
    }
  } catch {
    // Si algo falla o Router no existe, usa recarga completa
  }

  if (!location.pathname.includes('/login')) {
    try { sessionStorage.setItem('auth.logout.reason', String(reason || '')); } catch {}
    location.href = '/login';
  }
}
  function handleTokenExpired() {
    cancelSchedule();
    logout().catch(() => {}).finally(() => {
      redirectToLogin('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
    });
  }

// Exposición del API se realiza al final para evitar duplicaciones


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
    const { type, payload, timestamp } = msg.data as any;
    if (type === 'state') {
      state = payload || {};
      emit();
      scheduleFromState();
    } else if (type === 'logout') {
      clearState();
      redirectToLogin(); // 🔹 redirige si recibe broadcast de logout
    } else if (type === 'activity' && timestamp) {
      if (timestamp > lastActivityTime) {
        lastActivityTime = timestamp;
      }
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
    const roleNorm = inferRoleFromData(user, user?.role);
    const authorities = ensureAuthoritiesForRole(roleNorm, user?.authorities);
    saveState({
      token,
      expiresAtMillis,
      username: user?.username,
      role: roleNorm,
      authorities,
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
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  function scheduleFromState() {
    cancelSchedule();
    if (!state?.token || !state?.expiresAtMillis) return;
    const nowClient = Date.now();
    const delta = Number(state.serverDeltaMs || 0);
    const nowServer = nowClient + delta;
    const dueServer = Number(state.expiresAtMillis) - TOKEN_REFRESH_BEFORE_EXPIRY;
    const delay = Math.max(0, dueServer - nowServer);
    refreshTimer = window.setTimeout(async () => {
      const lastActivity = getLastActivityTime();
      const timeSinceActivity = Date.now() - lastActivity;
      if (timeSinceActivity < MIN_ACTIVITY_FOR_REFRESH) {
        try {
          await refreshToken();
        } catch {
          handleTokenExpired();
        }
      } else {
        const nowServer2 = Date.now() + Number(state.serverDeltaMs || 0);
        const timeUntilExpiry = Number(state.expiresAtMillis) - nowServer2;
        if (timeUntilExpiry > 0) {
          setTimeout(() => { handleTokenExpired(); }, timeUntilExpiry + 1000);
        } else {
          handleTokenExpired();
        }
      }
    }, delay);

    heartbeatTimer = window.setInterval(() => {
      if (!state?.token || !state?.expiresAtMillis) return;
      const now = Date.now();
      const delta2 = Number(state.serverDeltaMs || 0);
      const nowServer2 = now + delta2;
      const timeUntilExpiry = Number(state.expiresAtMillis) - nowServer2;
      const lastActivity = getLastActivityTime();
      const timeSinceActivity = now - lastActivity;
      if (timeSinceActivity > INACTIVITY_LOGOUT_TIME) {
        cancelSchedule();
        logout().then(() => {
          redirectToLogin('Sesión cerrada por inactividad');
        });
        return;
      }
      if (timeUntilExpiry <= 0) {
        handleTokenExpired();
        return;
      }
      if (timeUntilExpiry < TOKEN_REFRESH_BEFORE_EXPIRY) {
        if (timeSinceActivity < MIN_ACTIVITY_FOR_REFRESH) {
          refreshToken().catch(() => { handleTokenExpired(); });
        }
      }
    }, HEARTBEAT_INTERVAL);
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
    // Limpiar caches de la aplicación antes de limpiar estado
    try {
      if ((window as any)._tasksDataCache) {
        (window as any)._tasksDataCache.tasks = [];
        (window as any)._tasksDataCache.lastUpdate = 0;
      }
      if ((window as any)._fcStateCache) {
        (window as any)._fcStateCache = {};
      }
      if ((window as any).fcInstances) {
        try {
          Object.values((window as any).fcInstances).forEach((inst: any) => {
            if (inst && inst.calendar && typeof inst.calendar.destroy === 'function') {
              try { inst.calendar.destroy(); } catch {}
            }
          });
          (window as any).fcInstances = {};
        } catch {}
      }
      if ((window as any).clearProjectsCache && typeof (window as any).clearProjectsCache === 'function') {
        (window as any).clearProjectsCache();
      }
      if ((window as any).clearTasksCache && typeof (window as any).clearTasksCache === 'function') {
        (window as any).clearTasksCache();
      }
      if ((window as any).clearReportHoursCache && typeof (window as any).clearReportHoursCache === 'function') {
        (window as any).clearReportHoursCache();
      }
      if ((window as any).clearEmployeesCache && typeof (window as any).clearEmployeesCache === 'function') {
        (window as any).clearEmployeesCache();
      }
      if ((window as any).projectsCache) {
        (window as any).projectsCache = null;
      }
    } catch {}
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
    const roleNorm = inferRoleFromData(data, state.role);
    const authorities = ensureAuthoritiesForRole(roleNorm, (data.authorities as string[]) || state.authorities);
    saveState({
      openMode: !!data.openMode,
      username: data.username || state.username,
      role: roleNorm,
      authorities,
      serverDeltaMs,
      employeeId: data.employeeId != null ? Number(data.employeeId) : state.employeeId,
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
      try {
        const res = await fetch(url('/auth/refresh'), {
          method: 'POST',
          headers: { ...authHeader() },
        });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            handleTokenExpired();
          }
          throw new Error(`Refresh failed: ${res.status}`);
        }
        const data = await res.json();
        const roleNorm = inferRoleFromData(data, state.role || data.role);
        const authorities = ensureAuthoritiesForRole(roleNorm, (data.authorities as string[]) || state.authorities || (roleNorm ? [`ROLE_${roleNorm}`] : []));
        setAuth(data.token, data.expiresAtMillis, {
          username: data.username,
          role: roleNorm,
          authorities,
          openMode: state.openMode,
          serverDeltaMs: state.serverDeltaMs,
        });
        return getState();
      } catch (e: any) {
        if (typeof e?.message === 'string' && (e.message.includes('401') || e.message.includes('403'))) {
          handleTokenExpired();
        }
        throw e;
      }
    });
  }

  async function fetchWithAuth(input: RequestInfo, init?: RequestInit): Promise<Response> {
    recordActivity();
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
      } catch {
        handleTokenExpired();
      }
    }
    return res;
  }

  function onAuthChange(cb: (state: AuthState) => void): () => void {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }

  function recordActivity() {
    lastActivityTime = Date.now();
    try {
      localStorage.setItem(ACTIVITY_KEY, String(lastActivityTime));
    } catch {}
    broadcast({ type: 'activity', timestamp: lastActivityTime });
  }

  function getLastActivityTime(): number {
    try {
      const stored = localStorage.getItem(ACTIVITY_KEY);
      if (stored) {
        const storedTime = parseInt(stored, 10);
        return Math.max(lastActivityTime, storedTime);
      }
    } catch {}
    return lastActivityTime;
  }

  async function bootstrap(opts?: AuthConfig): Promise<AuthState> {
    config = { ...config, ...(opts || {}) };
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.includes('/login');
    state = loadState();
    if (!isLoginPage && (!state || !state.token)) {
      redirectToLogin('Debes iniciar sesión para acceder a esta página');
      throw new Error('No authenticated - redirecting to login');
    }
    if (!isLoginPage && state && state.token && state.expiresAtMillis) {
      const now = Date.now();
      const delta = Number(state.serverDeltaMs || 0);
      const nowServer = now + delta;
      if (nowServer >= state.expiresAtMillis) {
        // limpiar y redirigir si está expirado
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {}
        redirectToLogin('Tu sesión ha expirado');
        throw new Error('Token expired - redirecting to login');
      }
    }
    if (state) {
      const roleNorm = normRole(state.role) || inferRoleFromAuthorities(state.authorities);
      const authorities = ensureAuthoritiesForRole(roleNorm, state.authorities);
      state = { ...state, role: roleNorm, authorities };
    }
    emit();
    scheduleFromState();
    if (!(bootstrap as any)._listenersSetup) {
      (bootstrap as any)._listenersSetup = true;
      const activityEvents = ['mousedown','mousemove','keydown','scroll','touchstart','wheel','focus','blur'];
      activityEvents.forEach(event => {
        window.addEventListener(event, recordActivity, { passive: true } as any);
      });
    }
    try {
      await me();
    } catch {}
    return getState();
  }

  // Exponer API una vez, incluyendo cerrarSesion y redirectToLogin
  (window as any).Auth = {
    bootstrap,
    login,
    logout,
    me,
    refreshToken,
    fetchWithAuth,
    onAuthChange,
    getState,
    redirectToLogin,
    cerrarSesion,
    recordActivity,
  };
})();

// Hacer este archivo un módulo externo para permitir `declare global`
export {};