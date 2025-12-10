  

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';
import { lastValueFrom } from 'rxjs';
import { HttpParams } from '@angular/common/http';


export interface ProjectPayload {
  projectCode: string | null;
  name: string | null;
  projectArea: number | null;
  areaUnit: string | null;
  projectType: string | null;
  notes: string | null;
  status: string | null;
  scope: string | null;
  trackedTime: number | null;
  cost: number | null;
  clientId: number | null;
  officeId: number | null;
  softwareId: number | null;
  employeeIds?: number[];
  pmIds?: number[];
}



@Injectable({ providedIn: 'root' })
export class ProjectService {
  /** Nuevo método para obtener proyectos como Observable */
  getProjects(query: any) {
    const base = (this.auth.getApiBase() || '').replace(/\/$/, '');
    const url = `${base}/projects`;
    const token = this.auth.getState().token;
    const headers = new HttpHeaders({
      'Accept': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<any>(url, {
      headers,
      params,
      withCredentials: true
    });
  }
  constructor(private auth: AuthService, private http: HttpClient) {}

  // Crea un proyecto y devuelve una Promesa con la respuesta
  async createProject(payload: ProjectPayload): Promise<any> {
    const base = (this.auth.getApiBase() || '').replace(/\/$/, '');
    const url = `${base}/projects`;

    const token = this.auth.getState().token;
    const headers = new HttpHeaders({
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });

    const obs$ = this.http.post<any>(url, payload, { headers, withCredentials: true });
    return await lastValueFrom(obs$);
  }


async getProjectById(id: number) {
  const base = (this.auth.getApiBase() || '').replace(/\/$/, '');
  const url = `${base}/projects/${id}`;

  const token = this.auth.getState().token;
  const headers = new HttpHeaders({
    'Accept': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  });

  const obs$ = this.http.get<any>(url, { headers, withCredentials: true });
  return await lastValueFrom(obs$);
}

async updateProject(id: number, payload: ProjectPayload): Promise<any> {
  const base = (this.auth.getApiBase() || '').replace(/\/$/, '');
  const url = `${base}/projects/${id}`;

  const token = this.auth.getState().token;
  const headers = new HttpHeaders({
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  });

  const obs$ = this.http.put<any>(url, payload, { headers, withCredentials: true });
  return await lastValueFrom(obs$);
}


async loadProjects(query: any): Promise<{ items: any[], pageInfo: any }> {
  const base = (this.auth.getApiBase() || '').replace(/\/$/, '');
  const url = `${base}/projects`;

  const token = this.auth.getState().token;

  const headers = new HttpHeaders({
    'Accept': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  });

  // Construir HttpParams desde el objeto query
  let params = new HttpParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      params = params.set(key, String(value));
    }
  });

  console.log('🌐 Request URL:', url);
  console.log('🔑 Request params:', params.toString());
  console.log('📦 Query object:', query);

  const obs$ = this.http.get<any>(url, {
    headers,
    params,
    withCredentials: true
  });

  const response = await lastValueFrom(obs$);



  // Si la respuesta es un array directo, usarlo directamente
 const items = Array.isArray(response)
  ? response
  : (response?.items ??
     response?.content ??
     response?._embedded?.projects ??
     []);
     
  const p = response?.page ?? response;

  const pageInfo = {
    number: p?.number ?? 0,
    size: p?.size ?? items.length,
    totalPages: p?.totalPages ?? 1,
    totalElements: p?.totalElements ?? items.length
  };

  return { items, pageInfo };
}

}
