import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environment';
import { Project } from '../models/project.model';
import { Observable, of, tap, map } from 'rxjs';

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

  // ========= CREATE =========
  create(payload: Partial<Project>): Observable<Project> {
    return this.http
      .post<Project>(`${environment.apiUrl}/projects`, payload)
      .pipe(
        tap(() => this.clearCache())
      );
  }

  // ========= EDIT =========
  edit(project: Project): Observable<Project> {
    return this.http
      .put<Project>(`${environment.apiUrl}/projects/${project.id}`, project)
      .pipe(
        tap(() => this.clearCache())
      );
  }

  // ========= DELETE =========
  delete(id: number): Observable<void> {
    return this.http
      .delete<void>(`${environment.apiUrl}/projects/${id}`)
      .pipe(
        tap(() => this.clearCache())
      );
  }

  /**
   * Limpiar cache (logout, cambio de cuenta, etc)
   */
  clearCache(): void {
    this.cache = null;
  }

  /**
   * Filtrar proyectos por año (según código o lógica futura)
   * Se deja preparado para reportHours
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
   * Buscar proyectos por texto libre
   * (nombre, código, cliente)
   */
  search(projects: Project[], term: string): Project[] {
    const value = term.toLowerCase();

    return projects.filter(p =>
      p.name.toLowerCase().includes(value) ||
      p.projectCode.toLowerCase().includes(value) ||
      p.clientName.toLowerCase().includes(value)
    );
  }
}