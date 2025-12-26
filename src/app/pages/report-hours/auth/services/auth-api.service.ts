import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LoginRequest, AuthResponse, AuthMeResponse} from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {

  constructor(
    private http: HttpClient
  ) {}

  login(req: LoginRequest) {
    const base = 'https://api-pruebas.luseoeng.com';
    const url = `${base}/auth/login`;
    return this.http.post<AuthResponse>(url, req, {
      withCredentials: true
    });
  }

  me() {
    const base = 'https://api-pruebas.luseoeng.com';
    const url = `${base}/auth/me`;
    return this.http.get<AuthMeResponse>(url, {
      withCredentials: true
    });
  }

  refresh() {
    const base = 'https://api-pruebas.luseoeng.com';
    const url = `${base}/auth/refresh`;
    return this.http.post<AuthResponse>(url, {}, {
      withCredentials: true
    });
  }

  logout() {
    const base = 'https://api-pruebas.luseoeng.com';
    const url = `${base}/auth/logout`;
    return this.http.post<void>(url, {}, {
      withCredentials: true
    });
  }
}