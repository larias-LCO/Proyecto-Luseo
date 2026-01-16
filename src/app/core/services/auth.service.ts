import { Injectable, signal } from '@angular/core';
// import { environment } from '../../../../environment';

export type AuthState = {
  authenticated: boolean;
  username?: string;
  token?: string;
  role?: string[];
  employeeId?: number;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private storageTokenKeys = ['auth.token', 'token'];
  private usernameKey = 'auth.username';
  private rolesKey = 'auth.roles';
  private apiBase = 'https://api-pruebas.luseoeng.com';
  // private apiBase = environment.apiBase;

  state = signal<AuthState>({ authenticated: false });

  constructor() {
       // Sync across tabs - escuchar cambios en auth.state Y en las claves individuales
    window.addEventListener('storage', (e) => {
      if (!e.key) return;
      // Escuchar cambios en auth.state (usado por auth-sync.ts) O en las claves individuales
      if (e.key === 'auth.state' || [...this.storageTokenKeys, this.usernameKey, this.rolesKey].includes(e.key)) {
        console.log('[AuthService] Detectado cambio en localStorage:', e.key);
        this.loadFromStorage();
      }
    });
    this.loadFromStorage();
    
    // Exponer método de debug global
    (window as any).debugAuthService = () => this.debugAuth();
  }

  debugAuth() {
    console.group('🔍 DEBUG AUTH SERVICE');
    console.log('Estado actual:', this.state());
    console.log('auth.state (raw):', localStorage.getItem('auth.state'));
    console.log('auth.token:', localStorage.getItem('auth.token'));
    console.log('auth.roles:', localStorage.getItem('auth.roles'));
    console.log('isOwner():', this.isOwner());
    console.log('isAdmin():', this.isAdmin());
    console.log('isUser():', this.isUser());
    console.groupEnd();
  }

  configure(apiBase: string) {
    this.apiBase = apiBase || '';
  }

  loadFromStorage() {
    // PRIORIDAD 1: Intentar cargar desde auth.state (usado por auth-sync.ts)
    try {
      const authStateJson = localStorage.getItem('auth.state');
      if (authStateJson) {
        const authState = JSON.parse(authStateJson);
        // console.log('[AuthService] Cargando desde auth.state:', authState);
        
        const token = authState.token;
        const username = authState.username;
        const employeeId = authState.employeeId;
        
        // Convertir rol de string a array para compatibilidad
        let roles: string[] | undefined = undefined;
        
        if (authState.role) {
          // Si es string, convertir a array
          roles = typeof authState.role === 'string' ? [authState.role] : 
                  (Array.isArray(authState.role) ? authState.role : undefined);
        }
        
        // Si no hay rol directo, intentar extraer de authorities
        if (!roles && authState.authorities && Array.isArray(authState.authorities)) {
          roles = authState.authorities.map((a: string) => {
            if (typeof a === 'string' && a.startsWith('ROLE_')) {
              return a.substring(5); // Quitar "ROLE_" prefix
            }
            return a;
          }).filter(Boolean);
        }
        
        if (token) {
          // console.log('[AuthService] ✓ Estado cargado desde auth.state - Roles:', roles);
          this.state.set({ 
            authenticated: true, 
            token, 
            username, 
            role: roles, 
            employeeId 
          });
          
          // Sincronizar también en las claves individuales para compatibilidad
          if (token) this.setStoredToken(token);
          if (username) localStorage.setItem(this.usernameKey, username);
          if (roles) localStorage.setItem(this.rolesKey, JSON.stringify(roles));
          
          return; // Salir, ya tenemos todo
        }
      }
    } catch (e) {
      console.warn('[AuthService] Error al cargar auth.state:', e);
    }
    
    // PRIORIDAD 2: Cargar desde claves individuales (fallback)
    const token = this.getStoredToken();
    const username = localStorage.getItem(this.usernameKey) || undefined;
    const rolesJson = localStorage.getItem(this.rolesKey);
    let roles: string[] | undefined = undefined;
    
    // Intentar obtener roles desde localStorage primero
    if (rolesJson) {
      try {
        const parsed = JSON.parse(rolesJson);
        // Normalizar a array: si es string, convertir a array
        if (typeof parsed === 'string') {
          roles = [parsed];
        } else if (Array.isArray(parsed)) {
          roles = parsed;
        }
      } catch (e) {
        console.warn('[AuthService] Error parsing roles from localStorage:', e);
      }
    }
    
    // Fallback: try to decode roles and employeeId from JWT if not explicitly stored
    let employeeId: number | undefined = undefined;
    if (token) {
      const decoded = this.decodeJwt(token);
      
      // Si no tenemos roles de localStorage, intentar obtenerlos del token
      if (!roles) {
        const rawRoles = decoded?.roles
          ?? decoded?.authorities
          ?? decoded?.scopes
          ?? decoded?.scope
          ?? decoded?.role
          ?? decoded?.claims?.roles;
        
        if (Array.isArray(rawRoles)) {
          roles = rawRoles.map((r: any) => typeof r === 'string' ? r : (r?.name || r?.role || r?.authority || r?.rol || r?.roleName || r?.label)).filter(Boolean);
        } else if (typeof rawRoles === 'string' && rawRoles) {
          // Si es un string simple, crear array con ese valor
          roles = [rawRoles];
        }
      }
      
      // EmployeeId
      if (decoded && (decoded.employeeId !== undefined || decoded.employee_id !== undefined)) {
        employeeId = Number(decoded.employeeId ?? decoded.employee_id);
        if (isNaN(employeeId)) employeeId = undefined;
      }
    } 
    // console.log('[AuthService] Roles cargados desde claves individuales:', roles);

    this.state.set({ authenticated: !!token, token: token || undefined, username, role: roles, employeeId });
  }

  

  private getStoredToken(): string | null {
    for (const k of this.storageTokenKeys) {
      const v = localStorage.getItem(k);
      if (v) return v;
    }
    return null;
  }

  private setStoredToken(token: string | null) {
    // Prefer first key; clear others
    for (let i = 0; i < this.storageTokenKeys.length; i++) {
      const k = this.storageTokenKeys[i];
      if (i === 0 && token) localStorage.setItem(k, token);
      else localStorage.removeItem(k);
    }
  }

  async bootstrap(options?: { apiBase?: string }) {
    if (options?.apiBase !== undefined) this.configure(options.apiBase);
    this.loadFromStorage();
  }

  private decodeJwt(token: string): any | undefined {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return undefined;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
      const json = atob(padded);
      return JSON.parse(json);
    } catch {
      return undefined;
    }
  }

  private getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp('(^|; )' + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  async login(login: string, password: string): Promise<void> {
    const base = this.apiBase.replace(/\/$/, '');
    const url = `${base}/auth/login`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ login, password }),
      credentials: 'include'
    });
    if (!res.ok) {
      let msg = `Login failed: ${res.status}`;
      try { const err = await res.json(); if (err?.message) msg = err.message; } catch {}
      throw new Error(msg);
    }
    const data = await res.json().catch(() => ({} as any));
    const token = data?.token || data?.accessToken || data?.jwt || '';
    const username = data?.username || login;
    
    // Normalizar roles: siempre convertir a array
    let roles: string[] | undefined = undefined;
    if (Array.isArray(data?.roles)) {
      roles = data.roles.map((r: any) => typeof r === 'string' ? r : (r?.name || r?.role || r?.authority || r?.rol || r?.roleName || r?.label)).filter(Boolean);
    } else if (typeof data?.role === 'string' && data.role) {
      // Si viene como string único, convertir a array
      roles = [data.role];
    } else if (typeof data?.roles === 'string' && data.roles) {
      roles = [data.roles];
    }
    
    // Si no hay roles en la respuesta, intentar extraerlos del token JWT
    if (!roles || roles.length === 0) {
      console.log('[AuthService] No se encontraron roles en la respuesta, decodificando token...');
      const decoded = this.decodeJwt(token);
      if (decoded) {
        const rawRoles = decoded?.roles
          ?? decoded?.authorities
          ?? decoded?.scopes
          ?? decoded?.scope
          ?? decoded?.role
          ?? decoded?.accountRole
          ?? decoded?.claims?.roles;
        
        if (Array.isArray(rawRoles)) {
          roles = rawRoles.map((r: any) => typeof r === 'string' ? r : (r?.name || r?.role || r?.authority || r?.rol || r?.roleName || r?.label)).filter(Boolean);
        } else if (typeof rawRoles === 'string' && rawRoles) {
          roles = [rawRoles];
        }
        console.log('[AuthService] Roles extraídos del token:', roles);
      }
    }
    
    if (!token) throw new Error('Token missing in response');
    this.setStoredToken(token);
    localStorage.setItem(this.usernameKey, username);
    if (roles && roles.length > 0) {
      console.log('[AuthService] Guardando roles en localStorage:', roles);
      localStorage.setItem(this.rolesKey, JSON.stringify(roles));
    } else {
      console.warn('[AuthService] ⚠️ No se pudieron obtener roles del servidor ni del token');
      localStorage.removeItem(this.rolesKey);
    }
    
    // Decodificar employeeId del token si existe
    let employeeId: number | undefined = undefined;
    try {
      const decoded = this.decodeJwt(token);
      if (decoded && (decoded.employeeId !== undefined || decoded.employee_id !== undefined)) {
        employeeId = Number(decoded.employeeId ?? decoded.employee_id);
        if (isNaN(employeeId)) employeeId = undefined;
      }
    } catch {}
    
    console.log('[AuthService] Login exitoso. Roles:', roles, 'EmployeeId:', employeeId);
    this.state.set({ authenticated: true, username, token, role: roles, employeeId });
    
    // IMPORTANTE: Sincronizar con auth-sync.ts guardando en auth.state también
    try {
      const authState = {
        token,
        username,
        role: roles && roles.length > 0 ? roles[0] : '', // auth-sync usa string, no array
        authorities: roles && roles.length > 0 ? roles.map(r => `ROLE_${r}`) : [],
        employeeId,
        expiresAtMillis: data?.expiresAtMillis || (Date.now() + 3600000), // 1 hora por defecto
        openMode: data?.openMode || false,
        serverDeltaMs: 0
      };
      console.log('[AuthService] Sincronizando con auth.state:', authState);
      localStorage.setItem('auth.state', JSON.stringify(authState));
    } catch (e) {
      console.error('[AuthService] Error al sincronizar con auth.state:', e);
    }
  }

  logout(): void {
    this.setStoredToken(null);
    localStorage.removeItem(this.usernameKey);
    localStorage.removeItem(this.rolesKey);
    localStorage.removeItem('auth.state'); // Limpiar también auth.state
    this.state.set({ authenticated: false });
  }

  getState(): AuthState {
    return this.state();
  }

  getApiBase(): string {
    return this.apiBase;
  }

  getRoles(): string[] {
    const roles = this.state().role || [];
    return roles;
  }

  hasRole(role: string): boolean {
    const roles = (this.state().role || []).map(r => r.toUpperCase());
    return roles.includes(role.toUpperCase());
  }

  isAdmin(): boolean {
    const result = this.hasRole('ADMIN');
    return result;
  }

  isOwner(): boolean {
    const result = this.hasRole('OWNER');
    return result;
  }

  isUser(): boolean {
    const result = this.hasRole('USER');
    return result;
  }

fetchWithAuth(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = this.getStoredToken();
  const headers = new Headers(init.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const xsrf = this.getCookie('XSRF-TOKEN') || this.getCookie('xsrf-token');
  if (xsrf && !headers.has('X-XSRF-TOKEN')) {
    headers.set('X-XSRF-TOKEN', xsrf);
  }
  if (!headers.has('X-Requested-With')) {
    headers.set('X-Requested-With', 'XMLHttpRequest');
  }
  return fetch(input, { ...init, headers, credentials: 'include', mode: 'cors' });
}
}
