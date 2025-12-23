import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LoginRequest, AuthResponse, AuthMeResponse} from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {

  constructor(
    private http: HttpClient
  ) {}

  login(req: LoginRequest) {
    const base = (window as any).Auth?.getState?.()?.apiBase || 'https://api-pruebas.luseoeng.com';
    const url = `${base.replace(/\/$/, '')}/auth/login`;
    return this.http.post<AuthResponse>(url, req, {
      withCredentials: true
    });
  }

  me() {
    const base = (window as any).Auth?.getState?.()?.apiBase || 'https://api-pruebas.luseoeng.com';
    const url = `${base.replace(/\/$/, '')}/auth/me`;
    return this.http.get<AuthMeResponse>(url, {
      withCredentials: true
    });
  }

  refresh() {
    const base = (window as any).Auth?.getState?.()?.apiBase || 'https://api-pruebas.luseoeng.com';
    const url = `${base.replace(/\/$/, '')}/auth/refresh`;
    return this.http.post<AuthResponse>(url, {}, {
      withCredentials: true
    });
  }

  logout() {
    const base = (window as any).Auth?.getState?.()?.apiBase || 'https://api-pruebas.luseoeng.com';
    const url = `${base.replace(/\/$/, '')}/auth/logout`;
    return this.http.post<void>(url, {}, {
      withCredentials: true
    });
  }
}