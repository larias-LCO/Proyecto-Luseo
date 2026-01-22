import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../../environment';
import { GeneralTask } from '../models/general-task.model';
import { Observable, of, tap, map } from 'rxjs';
import { mapGeneralTasksFromBackend } from '../utils/mappers/general-task.mapper';

interface GeneralTaskCache {
  data: GeneralTask[];
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class GeneralTaskService {

  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos
  private cache: GeneralTaskCache | null = null;

  constructor(private http: HttpClient) {}

  /**
   * Obtener todas las general tasks
   * @param forceRefresh ignora cache
   */
  getAll(forceRefresh = false): Observable<GeneralTask[]> {
    const now = Date.now();

    if (
      !forceRefresh &&
      this.cache &&
      now - this.cache.timestamp < this.CACHE_TTL
    ) {
      return of(this.cache.data);
    }

    return this.http.get<any[]>(`${environment.apiUrl}/general-tasks`).pipe(
      map(rawTasks => mapGeneralTasksFromBackend(rawTasks)),
      tap(tasks => {
        this.cache = {
          data: tasks,
          timestamp: now
        };
      })
    );
  }

  /**
   * Obtener general tasks por rango de fechas
   * Usa el endpoint /search con parámetros de fecha
   */
  getByDateRange(startDate: string, endDate: string): Observable<GeneralTask[]> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http.get<any[]>(
      `${environment.apiUrl}/general-tasks/search`,
      { params }
    ).pipe(
      map(rawTasks => mapGeneralTasksFromBackend(rawTasks))
    );
  }

  /**
   * Obtener general tasks por empleado
   * Usa el endpoint /search con parámetro employeeId
   */
  getByEmployee(employeeId: number): Observable<GeneralTask[]> {
    const params = new HttpParams().set('employeeId', employeeId.toString());
    
    return this.http.get<any[]>(
      `${environment.apiUrl}/general-tasks/search`,
      { params }
    ).pipe(
      map(rawTasks => mapGeneralTasksFromBackend(rawTasks))
    );
  }

  /**
   * Obtener general tasks por proyecto
   * Usa el endpoint /by-project con query param
   */
  getByProject(projectId: number): Observable<GeneralTask[]> {
    const params = new HttpParams().set('projectId', projectId.toString());
    
    return this.http.get<any[]>(
      `${environment.apiUrl}/general-tasks/by-project`,
      { params }
    ).pipe(
      map(rawTasks => mapGeneralTasksFromBackend(rawTasks))
    );
  }

  /**
   * Obtener una general task por ID
   */
  getById(id: number): Observable<GeneralTask> {
    return this.http.get<any>(
      `${environment.apiUrl}/general-tasks/${id}`
    ).pipe(
      map(rawTask => mapGeneralTasksFromBackend([rawTask])[0])
    );
  }

  // ========= CREATE =========
  create(payload: Partial<GeneralTask>): Observable<GeneralTask> {
    return this.http
      .post<GeneralTask>(`${environment.apiUrl}/general-tasks`, payload)
      .pipe(
        tap(() => this.clearCache())
      );
  }

  // ========= UPDATE =========
  update(id: number, payload: Partial<GeneralTask>): Observable<GeneralTask> {
    return this.http
      .put<GeneralTask>(`${environment.apiUrl}/general-tasks/${id}`, payload)
      .pipe(
        tap(() => this.clearCache())
      );
  }

  // ========= DELETE =========
  delete(id: number): Observable<void> {
    return this.http
      .delete<void>(`${environment.apiUrl}/general-tasks/${id}`)
      .pipe(
        tap(() => this.clearCache())
      );
  }

  // ========= SEARCH & FILTERS =========
  
  /**
   * Buscar general tasks por nombre
   * Usa el endpoint /by-name
   */
  getByName(name: string): Observable<GeneralTask[]> {
    const params = new HttpParams().set('name', name);
    
    return this.http.get<any[]>(
      `${environment.apiUrl}/general-tasks/by-name`,
      { params }
    ).pipe(
      map(rawTasks => mapGeneralTasksFromBackend(rawTasks))
    );
  }

  /**
   * Buscar general tasks con múltiples criterios
   * Usa el endpoint /search
   */
  search(searchParams: {
    name?: string;
    projectId?: number;
    employeeId?: number;
    categoryId?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Observable<GeneralTask[]> {
    let params = new HttpParams();
    
    if (searchParams.name) params = params.set('name', searchParams.name);
    if (searchParams.projectId) params = params.set('projectId', searchParams.projectId.toString());
    if (searchParams.employeeId) params = params.set('employeeId', searchParams.employeeId.toString());
    if (searchParams.categoryId) params = params.set('categoryId', searchParams.categoryId.toString());
    if (searchParams.status) params = params.set('status', searchParams.status);
    if (searchParams.startDate) params = params.set('startDate', searchParams.startDate);
    if (searchParams.endDate) params = params.set('endDate', searchParams.endDate);
    
    return this.http.get<any[]>(
      `${environment.apiUrl}/general-tasks/search`,
      { params }
    ).pipe(
      map(rawTasks => mapGeneralTasksFromBackend(rawTasks))
    );
  }

  /**
   * Obtener enums disponibles
   */
  getEnums(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/general-tasks/enums`);
  }

  /**
   * Obtener múltiples general tasks por IDs
   * Usa el endpoint /bulk
   */
  getBulk(ids: number[]): Observable<GeneralTask[]> {
    const params = new HttpParams().set('ids', ids.join(','));
    
    return this.http.get<any[]>(
      `${environment.apiUrl}/general-tasks/bulk`,
      { params }
    ).pipe(
      map(rawTasks => mapGeneralTasksFromBackend(rawTasks))
    );
  }

  // ========= LOCAL FILTERS =========

  /**
   * Filtrar general tasks por categoría
   */
  filterByCategory(tasks: GeneralTask[], categoryId: number): GeneralTask[] {
    return tasks.filter(t => t.taskCategoryId === categoryId);
  }

  /**
   * Filtrar general tasks por proyecto
   */
  filterByProjectLocal(tasks: GeneralTask[], projectId: number): GeneralTask[] {
    return tasks.filter(t => t.projectId === projectId);
  }

  /**
   * Filtrar general tasks por estado
   */
  filterByStatus(tasks: GeneralTask[], status: string): GeneralTask[] {
    return tasks.filter(t => t.status === status);
  }

  /**
   * Filtrar tareas personales
   */
  filterPersonalTasks(tasks: GeneralTask[]): GeneralTask[] {
    return tasks.filter(t => t.personalTask || t.personal_task);
  }

  /**
   * Limpiar cache (logout, cambio de cuenta, etc)
   */
  clearCache(): void {
    this.cache = null;
  }
}
