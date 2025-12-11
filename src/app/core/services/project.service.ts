  

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';
import { lastValueFrom } from 'rxjs';
import { HttpParams } from '@angular/common/http';


export interface ProjectPayload {
    officeId?: number | null;
    clientId?: number | null;
    softwareId?: number | null;
  projectCode: string | null;
  name: string | null;
  projectArea: number | null;
  areaUnit: string | null;
  projectType: string | null;
  notes: string | null;
  status: string | null;
  scope: string | null;
  trackedTime: number | null;
  realCost: number | null;
  clientName: string | null;
  officeName: string | null;
  softwareName: string | null;
  employeeIds?: number[];
  pmIds?: number[];
}



@Injectable({ providedIn: 'root' })
export class ProjectService {
    private phasesByProject: Map<string, any[]> = new Map();
    async getPhasesByProjectId(projectId: number): Promise<any[]> {
      const cacheKey = String(projectId);
      let phases = this.phasesByProject.get(cacheKey);
      if (!phases) {
        const base = (this.auth.getApiBase() || '').replace(/\/$/, '');
        const url = `${base}/projects/${projectId}/phases`;
        const token = this.auth.getState().token;
        const headers = new HttpHeaders({
          'Accept': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        });
        const obs$ = this.http.get<any[]>(url, { headers, withCredentials: true });
        phases = await lastValueFrom(obs$);
        this.phasesByProject.set(cacheKey, phases);
      }
      return phases;
    }
  /** Nuevo método para obtener proyectos como Observable */
// project.service.ts
getProjects(queryObj: any): Promise<{ items:any[], pageInfo:any }> {
  let params = new HttpParams();
  Object.entries(queryObj || {}).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '') {
      params = params.set(k, String(v));
    }
  });

  const base = (this.auth.getApiBase() || '').replace(/\/$/, '');
  const url = `${base}/projects/search`; // ajústalo si tu URL es distinta
  return this.http.get(url, { params }).toPromise().then((resp: any) => {
    // adapta según respuesta real del backend
    return {
      items: Array.isArray(resp?.content) ? resp.content : resp.items ?? [],
      pageInfo: resp.page ?? resp.pageInfo ?? { number: 0, totalPages: 0, totalElements: 0, size: queryObj.size }
    };
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



// Unificar: siempre usar /projects/search para filtros
async loadProjects(query: any): Promise<{ items: any[], pageInfo: any }> {
  const base = (this.auth.getApiBase() || '').replace(/\/$/, '');
  const url = `${base}/projects/search`;

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
