import { HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';

export interface Enums {
  areaUnit: string[];
  type: string[];
  status: string[];
  scope: string[];
  phaseNames?: string[];
  phaseStatuses?: string[];
}

@Injectable({ providedIn: 'root' })
export class EnumsService {
  private baseUrl: string;

  constructor(private http: HttpClient, private authService: AuthService) {
    this.baseUrl = `${this.authService.getApiBase()}/projects/enums`;
  }

  /** 🔹 Cargar enums desde el backend (incluyendo phase enums si existen) */
  async loadEnums(): Promise<Enums> {
    try {
      const data = await firstValueFrom(this.http.get<any>(this.baseUrl));
      return {
        areaUnit: Array.isArray(data.areaUnit) ? data.areaUnit : [],
        type: Array.isArray(data.type) ? data.type : [],
        status: Array.isArray(data.status) ? data.status : [],
        scope: Array.isArray(data.scope) ? data.scope : [],
        phaseNames: Array.isArray(data.phaseNames) ? data.phaseNames : [],
        phaseStatuses: Array.isArray(data.phaseStatuses) ? data.phaseStatuses : [],
      };
    } catch (e) {
      console.warn('❌ Error cargando enums desde el backend:', e);
      return { areaUnit: [], type: [], status: [], scope: [], phaseNames: [], phaseStatuses: [] };
    }
  }
    /** Cargar enums de phases desde el backend */
  async loadPhaseEnums(): Promise<{ names: string[]; statuses: string[] }> {
    try {
      const token = this.authService.getState?.().token;
      const headers = token ? { headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` }) } : {};
      const url = `${this.authService.getApiBase()}/project-phases/enums`;
      const data = await firstValueFrom(this.http.get<any>(url, headers));
      return {
        names: Array.isArray(data?.names) ? data.names : [],
        statuses: Array.isArray(data?.statuses) ? data.statuses : []
      };
    } catch (e) {
      return { names: [], statuses: [] };
    }
  }

  /** Helper para elegir phase activa por defecto */
  pickDefaultPhaseId(phases: any[]): string {
    if (!Array.isArray(phases) || phases.length === 0) return '';
    const active = phases.filter(p => String(p?.status || '').toUpperCase() === 'ACTIVE');
    if (active.length === 1) return String(active[0].id ?? '');
    if (phases.length === 1) return String(phases[0].id ?? '');
    return '';
  }

  
}
