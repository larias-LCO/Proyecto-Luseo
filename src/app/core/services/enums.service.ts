import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';

export interface Enums {
  areaUnit: string[];
  type: string[];
  status: string[];
  scope: string[];
}

@Injectable({ providedIn: 'root' })
export class EnumsService {
  private baseUrl: string;

  constructor(private http: HttpClient, private authService: AuthService) {
    this.baseUrl = `${this.authService.getApiBase()}/projects/enums`;
  }

  /** 🔹 Cargar enums desde el backend */
  async loadEnums(): Promise<Enums> {
    try {
      const data = await firstValueFrom(this.http.get<Enums>(this.baseUrl));
      return {
        areaUnit: Array.isArray(data.areaUnit) ? data.areaUnit : [],
        type: Array.isArray(data.type) ? data.type : [],
        status: Array.isArray(data.status) ? data.status : [],
        scope: Array.isArray(data.scope) ? data.scope : [],
      };
    } catch (e) {
      console.warn('❌ Error cargando enums desde el backend:', e);
      return { areaUnit: [], type: [], status: [], scope: [] };
    }
  }
}
