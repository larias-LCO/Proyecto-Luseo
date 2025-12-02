import { Injectable, signal } from '@angular/core';

export type AuthState = {
  authenticated: boolean;
  username?: string;
  token?: string;
  roles?: string[];
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private storageTokenKeys = ['auth.token', 'token'];
  private usernameKey = 'auth.username';
  private rolesKey = 'auth.roles';
  private apiBase = 'https://api.luseoeng.com';

  state = signal<AuthState>({ authenticated: false });

  constructor() {
    // Sync across tabs
    window.addEventListener('storage', (e) => {
      if (!e.key) return;
      if ([...this.storageTokenKeys, this.usernameKey].includes(e.key)) {
        this.loadFromStorage();
      }
    });
    this.loadFromStorage();
  }

  configure(apiBase: string) {
    this.apiBase = apiBase || '';
  }

  private loadFromStorage() {
    const token = this.getStoredToken();
    const username = localStorage.getItem(this.usernameKey) || undefined;
    const rolesJson = localStorage.getItem(this.rolesKey);
    let roles = rolesJson ? (JSON.parse(rolesJson) as string[]) : undefined;
    // Fallback: try to decode roles from JWT if not explicitly stored
    if ((!roles || roles.length === 0) && token) {
      const decoded = this.decodeJwt(token);
      const rawRoles = decoded?.roles
        ?? decoded?.authorities
        ?? decoded?.scopes
        ?? decoded?.scope
        ?? decoded?.role
        ?? decoded?.claims?.roles;
      if (Array.isArray(rawRoles)) {
        roles = rawRoles.map((r: any) => typeof r === 'string' ? r : (r?.name || r?.role || r?.authority || r?.rol || r?.roleName || r?.label)).filter(Boolean);
      } else if (typeof rawRoles === 'string') {
        // could be comma/space separated
        const parts = rawRoles.split(/[ ,]+/).map(s => s.trim()).filter(Boolean);
        roles = parts.length ? parts : undefined;
      }
    }
    this.state.set({ authenticated: !!token, token: token || undefined, username, roles });
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
    const roles: string[] | undefined = Array.isArray(data?.roles)
      ? data.roles.map((r: any) => typeof r === 'string' ? r : (r?.name || r?.role || r?.authority || r?.rol || r?.roleName || r?.label)).filter(Boolean)
      : (typeof data?.role === 'string' ? [data.role] : undefined);
    if (!token) throw new Error('Token missing in response');
    this.setStoredToken(token);
    localStorage.setItem(this.usernameKey, username);
    if (roles) localStorage.setItem(this.rolesKey, JSON.stringify(roles));
    else localStorage.removeItem(this.rolesKey);
    this.state.set({ authenticated: true, username, token, roles });
  }

  logout(): void {
    this.setStoredToken(null);
    localStorage.removeItem(this.usernameKey);
    localStorage.removeItem(this.rolesKey);
    this.state.set({ authenticated: false });
  }

  getState(): AuthState {
    return this.state();
  }

  getApiBase(): string {
    return this.apiBase;
  }

  getRoles(): string[] {
    return this.state().roles || [];
  }

  hasRole(role: string): boolean {
    const roles = (this.state().roles || []).map(r => r.toUpperCase());
    return roles.includes(role.toUpperCase());
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
  // Log para depuración
  console.log('[fetchWithAuth] URL:', input);
  console.log('[fetchWithAuth] Headers:', Array.from(headers.entries()));
  console.log('[fetchWithAuth] Credentials:', 'include');
  return fetch(input, { ...init, headers, credentials: 'include', mode: 'cors' });
}
}
