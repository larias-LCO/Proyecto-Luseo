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

  // ========= SAVE (normalize payload keys) =========
  /**
   * Normalize a frontend payload into backend expected snake_case fields
   * and perform create or update depending on presence of `id`.
   * Supported fields (frontend keys accepted in camelCase or snake_case):
   * id, name, issuedDate/issued_date, taskCategoryId/task_category_id,
   * projectId/project_id, projectPhaseId/project_phase_id,
   * createByEmployeeId/created_by_employee_id, status, endDate/end_date,
   * bimDate/bim_date, description_bim, description_electrical,
   * description_mechanical, description_plumbing, description_structural
   */
  saveTask(payload: any): Observable<GeneralTask> {
    const body: any = {};
    if (!payload) payload = {};
    if (payload.id !== undefined) body.id = payload.id;
    if (payload.name !== undefined) body.name = payload.name;
    // issued date (fallback to startDate if provided by form)
    body.issued_date = payload.issuedDate ?? payload.issued_date ?? payload.startDate ?? payload.start_date ?? null;
    // Ensure issued_date is in a full ISO datetime when only a date is provided
    if (body.issued_date) {
      try {
        const ds = String(body.issued_date).trim();
        // if it's like YYYY-MM-DD, append time to make it an ISO datetime
        if (/^\d{4}-\d{2}-\d{2}$/.test(ds)) {
          body.issued_date = `${ds}T00:00:00Z`;
        } else {
          body.issued_date = ds;
        }
      } catch (e) {
        // fallback: leave as-is
      }
    }
    // category
    body.task_category_id = payload.taskCategoryId ?? payload.task_category_id ?? payload.categoryId ?? payload.category_id ?? null;
    // project / phase
    body.project_id = payload.projectId ?? payload.project_id ?? null;
    body.project_phase_id = payload.projectPhaseId ?? payload.project_phase_id ?? null;
    // creator
    body.created_by_employee_id = payload.createByEmployeeId ?? payload.createdByEmployeeId ?? payload.created_by_employee_id ?? null;
    // status
    body.status = payload.status ?? null;
    // end date
    body.end_date = payload.endDate ?? payload.end_date ?? null;
    // bim
    body.bim_date = payload.bimDate ?? payload.bim_date ?? null;
    // descriptions
    body.description_bim = payload.description_bim ?? payload.descriptionBim ?? payload.description_bim ?? null;
    body.description_electrical = payload.description_electrical ?? payload.descriptionElectrical ?? null;
    body.description_mechanical = payload.description_mechanical ?? payload.descriptionMechanical ?? null;
    body.description_plumbing = payload.description_plumbing ?? payload.descriptionPlumbing ?? null;
    body.description_structural = payload.description_structural ?? payload.descriptionStructural ?? null;

    // ensure nulls for missing optional fields to keep API payload shape predictable
    const keys = [
      'name','issued_date','task_category_id','project_id','project_phase_id','created_by_employee_id','status','end_date','bim_date',
      'description_bim','description_electrical','description_mechanical','description_plumbing','description_structural'
    ];
    keys.forEach(k => { if (!(k in body)) body[k] = null; });

    // debug: log normalized body before sending
    try { console.log('GeneralTaskService.normalizedBody', body); } catch (e) {}

    if (body.id) {
      const idNum = Number(body.id);
      // remove id from body when sending update (id in URL)
      delete body.id;
      return this.update(idNum, body as Partial<GeneralTask>);
    }

    return this.create(body as Partial<GeneralTask>);
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
    return tasks.filter(t => (t as any).personalTask || (t as any).personal_task);
  }

  /**
   * Limpiar cache (logout, cambio de cuenta, etc)
   */
  clearCache(): void {
    this.cache = null;
  }
}
