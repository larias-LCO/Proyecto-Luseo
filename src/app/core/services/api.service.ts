import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = ''; // Valor por defecto


  constructor(private auth: AuthService, private http: HttpClient) {
    try {
      this.baseUrl = (this.auth.getApiBase() || '').replace(/\/$/, '');
    } catch (_e) {
      this.baseUrl = '';
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint && endpoint.startsWith('/') ? endpoint : '/' + String(endpoint || '')}`;
    const res = await this.auth.fetchWithAuth(url, { method: 'GET' });
    if (!res.ok) throw new Error(`GET ${endpoint} failed: ${res.status}`);
    return res.json();
  }

  async post<T>(endpoint: string, body: any): Promise<T> {
    const url = `${this.baseUrl}${endpoint && endpoint.startsWith('/') ? endpoint : '/' + String(endpoint || '')}`;
    const res = await this.auth.fetchWithAuth(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`POST ${endpoint} failed: ${res.status}`);
    return res.json();
  }

  async put<T>(endpoint: string, body: any): Promise<T> {
    const url = `${this.baseUrl}${endpoint && endpoint.startsWith('/') ? endpoint : '/' + String(endpoint || '')}`;
    const res = await this.auth.fetchWithAuth(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`PUT ${endpoint} failed: ${res.status}`);
    return res.json();
  }

  async delete(endpoint: string): Promise<void> {
    const url = `${this.baseUrl}${endpoint && endpoint.startsWith('/') ? endpoint : '/' + String(endpoint || '')}`;
    const res = await this.auth.fetchWithAuth(url, { method: 'DELETE' });
    if (!res.ok) throw new Error(`DELETE ${endpoint} failed: ${res.status}`);
  }
}
