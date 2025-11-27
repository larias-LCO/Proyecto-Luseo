import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';

export interface Office { id: number | string; name: string; }
export interface Client { id: number | string; name: string; }
export interface Software { id: number | string; name: string; }
export interface Department { id: number | string; name: string; }
export interface JobPosition { id: number | string; name: string; }
export interface Employee {
  id: number;
  name: string;
  jobTitle?: string;
  department?: string;
   roles?: string;       // por si viene role (ej. "Manager")
  // ...otros campos si los tienes
}


@Injectable({ providedIn: 'root' })
export class CatalogsService {
  private baseUrl: string;  // URL base de la API (sin prefijos adicionales)

  ENUMS = { areaUnit: [], type: [], status: [], scope: [] }; // aquí

  constructor(private http: HttpClient, private authService: AuthService) {
    // Base directa: ej. https://...ngrok... o /api (via proxy). Los endpoints van colgando directo aquí.
    this.baseUrl = this.authService.getApiBase().replace(/\/$/, '');
  }


  getOffices() {
    return firstValueFrom(this.http.get<Office[]>(`${this.baseUrl}/offices`));
  }

  getClients() {
    return firstValueFrom(this.http.get<Client[]>(`${this.baseUrl}/clients`));
  }

  getSoftware() {
    return firstValueFrom(this.http.get<Software[]>(`${this.baseUrl}/software`));
  }

  getDepartments() {
    return firstValueFrom(this.http.get<Department[]>(`${this.baseUrl}/departments`));
  }

  getJobs() {
    return firstValueFrom(this.http.get<JobPosition[]>(`${this.baseUrl}/job-positions`));
  }

  getEmployees() {
    return firstValueFrom(this.http.get<Employee[]>(`${this.baseUrl}/employees`));
  }

  // Estos endpoints pueden diferir según backend; si usas EnumsService para projects, puedes no usarlos
  getTypes() { return firstValueFrom(this.http.get<any[]>(`${this.baseUrl}/projects/types`)); }

  getScopes() { return firstValueFrom(this.http.get<any[]>(`${this.baseUrl}/projects/scopes`)); }

  getStatuses() { 
    return firstValueFrom(this.http.get<any[]>(`${this.baseUrl}/projects/statuses`));
  }


  // Método que los carga todos en paralelo
  async loadAllCatalogs() {
    const [offices, clients, software, departments, jobPositions, employees] = await Promise.all([
      this.getOffices(),
      this.getClients(),
      this.getSoftware(),
      this.getDepartments(),
      this.getJobs(),
      this.getEmployees(),
    ]);


    return { offices, clients, software, departments, jobPositions, employees };
  }
}
