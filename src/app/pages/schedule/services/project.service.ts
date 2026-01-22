import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environment';
import { Observable, of, tap, map } from 'rxjs';

// Reutilizamos los enums y modelos de report-hours
export enum AreaUnit {
  SQUARE_METERS = 'SQUARE_METERS',
  SQUARE_FEET = 'SQUARE_FEET',
  ACRES = 'ACRES',
  HECTARES = 'HECTARES'
}

export enum ProjectType {
  RESIDENTIAL = 'RESIDENTIAL',
  COMMERCIAL = 'COMMERCIAL',
  INDUSTRIAL = 'INDUSTRIAL',
  INFRASTRUCTURE = 'INFRASTRUCTURE',
  MIXED_USE = 'MIXED_USE'
}

export enum ProjectScope {
  NATIONAL = 'NATIONAL',
  INTERNATIONAL = 'INTERNATIONAL'
}

export enum ProjectState {
  PLANNING = 'PLANNING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ON_HOLD = 'ON_HOLD',
  CANCELLED = 'CANCELLED'
}

export interface Project {
  id: number;
  projectCode: string;
  name: string;

  projectArea: number | null;
  areaUnit: AreaUnit;

  projectType: ProjectType;
  scope: ProjectScope;
  status: ProjectState;

  notes: string | null;

  // Datos de tablas relacionadas
  clientName: string;
  officeName: string;

  softwareName: string;
  softwareDescription: string;

  estimatedCost: number | null;
  realCost: number | null;

  estimatedTime: number | null;
  realTime: number | null;

  floridaTrackedTime: number | null;

  // Relaciones empleados (tabla relacionada)
  employeeIds: number[];
  employeeNames: string[];

  departments: string[];
  roles: string[];

  pmIds: number[];
  pmNames: string[];
}

interface ProjectCache {
  data: Project[];
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class ProjectService {

  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos
  private cache: ProjectCache | null = null;

  constructor(private http: HttpClient) {}

  /**
   * Obtener todos los proyectos
   * @param forceRefresh ignora cache
   */
  getAll(forceRefresh = false): Observable<Project[]> {
    const now = Date.now();

    if (
      !forceRefresh &&
      this.cache &&
      now - this.cache.timestamp < this.CACHE_TTL
    ) {
      return of(this.cache.data);
    }

    return this.http.get<Project[]>(`${environment.apiUrl}/projects`).pipe(
      map(projects =>
        [...projects].sort((a, b) =>
          a.projectCode.localeCompare(b.projectCode)
        )
      ),
      tap(projects => {
        this.cache = {
          data: projects,
          timestamp: now
        };
      })
    );
  }

  /**
   * Obtener un proyecto por ID
   */
  getById(id: number): Observable<Project> {
    return this.http.get<Project>(`${environment.apiUrl}/projects/${id}`);
  }

  /**
   * Crear un proyecto
   */
  create(payload: Partial<Project>): Observable<Project> {
    return this.http
      .post<Project>(`${environment.apiUrl}/projects`, payload)
      .pipe(
        tap(() => this.clearCache())
      );
  }

  /**
   * Editar un proyecto
   */
  edit(project: Project): Observable<Project> {
    return this.http
      .put<Project>(`${environment.apiUrl}/projects/${project.id}`, project)
      .pipe(
        tap(() => this.clearCache())
      );
  }

  /**
   * Eliminar un proyecto
   */
  delete(id: number): Observable<void> {
    return this.http
      .delete<void>(`${environment.apiUrl}/projects/${id}`)
      .pipe(
        tap(() => this.clearCache())
      );
  }

  /**
   * Filtrar proyectos por año (según código o lógica futura)
   */
  filterByYear(projects: Project[], year: number): Project[] {
    return projects.filter(p =>
      p.projectCode?.includes(year.toString())
    );
  }

  /**
   * Filtrar solo proyectos donde el empleado está asignado
   */
  filterByEmployee(projects: Project[], employeeId: number): Project[] {
    return projects.filter(p =>
      p.employeeIds?.includes(employeeId)
    );
  }

  /**
   * Filtrar proyectos por tipo
   */
  filterByType(projects: Project[], type: ProjectType): Project[] {
    return projects.filter(p => p.projectType === type);
  }

  /**
   * Filtrar proyectos por estado
   */
  filterByStatus(projects: Project[], status: ProjectState): Project[] {
    return projects.filter(p => p.status === status);
  }

  /**
   * Obtener proyectos activos (en progreso o planificación)
   */
  getActiveProjects(projects: Project[]): Project[] {
    return projects.filter(p =>
      p.status === ProjectState.IN_PROGRESS ||
      p.status === ProjectState.PLANNING
    );
  }

  /**
   * Limpiar cache
   */
  clearCache(): void {
    this.cache = null;
  }
}
