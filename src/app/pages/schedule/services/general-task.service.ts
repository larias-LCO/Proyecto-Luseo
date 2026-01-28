import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../../environment';
import { GeneralTask } from '../models/general-task.model';
import { Observable, of, tap, map } from 'rxjs';
import { mapGeneralTasksFromBackend } from '../utils/mappers/general-task.mapper';
import { AuthStateService } from '../../report-hours/auth/services/auth-state.service';

interface GeneralTaskCache {
  data: GeneralTask[];
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class GeneralTaskService {

  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos
  private cache: GeneralTaskCache | null = null;

  constructor(private http: HttpClient, private authState: AuthStateService) {}

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
    const isPresent = (a: any) => a !== undefined;

    if (isPresent(payload.id)) body.id = payload.id; // Keep id for update
    if (isPresent(payload.name)) body.name = payload.name;

    // helper to normalize various date inputs to SQL date string YYYY-MM-DD
    const formatLocalDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const normalizeToDateOnly = (d: any) => {
      if (d === null || d === undefined) return d;
      if (d instanceof Date) return formatLocalDate(d);
      const s = String(d).trim();
      if (s === '') return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      if (s.includes('T')) return s.split('T')[0];
      // fallback: try parse as date
      const dt = new Date(s);
      if (!isNaN(dt.getTime())) return formatLocalDate(dt);
      return s;
    };

    // issued date (fallback to startDate if provided by form) -> send YYYY-MM-DD (snake_case)
    const issuedRaw = payload.issuedDate ?? payload.issued_date ?? payload.startDate ?? payload.start_date;
    if (isPresent(issuedRaw)) {
      const normalized = normalizeToDateOnly(issuedRaw);
      body.issuedDate = normalized;
      body.issued_date = body.issued_date ?? normalized;
    }

    // category (ids coerced to numbers)
    if (isPresent(payload.taskCategoryId) || isPresent(payload.task_category_id) || isPresent(payload.categoryId) || isPresent(payload.category_id)) {
      const raw = payload.taskCategoryId ?? payload.task_category_id ?? payload.categoryId ?? payload.category_id;
      const n = Number(raw);
      const normalized = Number.isNaN(n) ? raw : n;
      body.taskCategoryId = normalized;
      body.task_category_id = body.task_category_id ?? normalized;
    }
    // project / phase
    if (isPresent(payload.projectId) || isPresent(payload.project_id)) {
      const raw = payload.projectId ?? payload.project_id;
      const n = Number(raw);
      const normalized = Number.isNaN(n) ? raw : n;
      body.projectId = normalized;
      body.project_id = body.project_id ?? normalized;
    }
    if (isPresent(payload.projectPhaseId) || isPresent(payload.project_phase_id)) {
      const raw = payload.projectPhaseId ?? payload.project_phase_id;
      const n = Number(raw);
      const normalized = Number.isNaN(n) ? raw : n;
      body.projectPhaseId = normalized;
      body.project_phase_id = body.project_phase_id ?? normalized;
    }
    // creator
    if (isPresent(payload.createByEmployeeId) || isPresent(payload.createdByEmployeeId) || isPresent(payload.created_by_employee_id)) {
      const raw = payload.createByEmployeeId ?? payload.createdByEmployeeId ?? payload.created_by_employee_id;
      const n = Number(raw);
      const normalized = Number.isNaN(n) ? raw : n;
      body.createdByEmployeeId = normalized;
      body.created_by_employee_id = body.created_by_employee_id ?? normalized;
    }
    // status
    if (isPresent(payload.status)) body.status = payload.status;
    // end date -> send YYYY-MM-DD (snake_case)
    if (isPresent(payload.endDate) || isPresent(payload.end_date)) {
      const normalized = normalizeToDateOnly(payload.endDate ?? payload.end_date);
      body.endDate = normalized;
      body.end_date = body.end_date ?? normalized;
    }
    // bim -> send YYYY-MM-DD (snake_case)
    if (isPresent(payload.bimDate) || isPresent(payload.bim_date)) {
      const normalized = normalizeToDateOnly(payload.bimDate ?? payload.bim_date);
      body.bimDate = normalized;
      body.bim_date = body.bim_date ?? normalized;
    }
    // descriptions (snake_case)

    if (isPresent(payload.description) || isPresent(payload.description_text)) {
      const rawDesc = payload.description ?? payload.description_text;
      body.description = rawDesc;
      body.description = body.description ?? rawDesc;
    }
    if (isPresent(payload.description_bim) || isPresent(payload.descriptionBim)) {
      body.descriptionBim = payload.descriptionBim ?? payload.description_bim;
      body.description_bim = body.description_bim ?? (payload.descriptionBim ?? payload.description_bim);
    }
    if (isPresent(payload.description_electrical) || isPresent(payload.descriptionElectrical)) {
      body.descriptionElectrical = payload.descriptionElectrical ?? payload.description_electrical;
      body.description_electrical = body.description_electrical ?? (payload.descriptionElectrical ?? payload.description_electrical);
    }
    if (isPresent(payload.description_mechanical) || isPresent(payload.descriptionMechanical)) {
      body.descriptionMechanical = payload.descriptionMechanical ?? payload.description_mechanical;
      body.description_mechanical = body.description_mechanical ?? (payload.descriptionMechanical ?? payload.description_mechanical);
    }
    if (isPresent(payload.description_plumbing) || isPresent(payload.descriptionPlumbing)) {
      body.descriptionPlumbing = payload.descriptionPlumbing ?? payload.description_plumbing;
      body.description_plumbing = body.description_plumbing ?? (payload.descriptionPlumbing ?? payload.description_plumbing);
    }
    if (isPresent(payload.description_structural) || isPresent(payload.descriptionStructural)) {
      body.descriptionStructural = payload.descriptionStructural ?? payload.description_structural;
      body.description_structural = body.description_structural ?? (payload.descriptionStructural ?? payload.description_structural);
    }

    // debug: log normalized body before sending (moved later for create/update clarity)

    const isUpdate = body.id !== undefined && body.id !== null;

    if (isUpdate) {
      const idNum = Number(body.id);
      delete body.id; // id is in URL for update
      try {
        // remove undefined/null keys before update to avoid sending explicit undefined values
        Object.keys(body).forEach((k) => {
          if (body[k] === null || body[k] === undefined) {
            delete body[k];
          }
        });
      } catch (e) {}
      try { console.log('GeneralTaskService.normalizedBody (update)', body); } catch (e) {}
      return this.update(idNum, body as Partial<GeneralTask>);
    }

    // For create: prefer createdByEmployeeId from report-hours auth state
    try {
      if (!isUpdate) {
        const authEmp = this.authState?.employeeId;
        if (authEmp !== undefined && authEmp !== null) {
          // Set both camelCase and snake_case aliases
          body.createdByEmployeeId = body.createdByEmployeeId ?? authEmp;
          body.created_by_employee_id = body.created_by_employee_id ?? authEmp;
          body.create_by_employee_id = body.create_by_employee_id ?? authEmp;
        }
      }
    } catch (e) {}

    // For create: remove optional keys with null/undefined to avoid strict backend validation
    // Keep required keys even if null so backend can return explicit validation errors
    // Note: projectId may be optional for some categories (e.g., OutOfOffice), so do not force it here
    const required = ['name', 'issuedDate', 'issued_date', 'taskCategoryId', 'task_category_id'];
    try {
      Object.keys(body).forEach((k) => {
        if ((body[k] === null || body[k] === undefined) && required.indexOf(k) === -1) {
          delete body[k];
        }
      });
    } catch (e) {}

    // Add common alias keys some backends expect (safe to include)
    try {
      if (body.created_by_employee_id !== undefined && body.create_by_employee_id === undefined) {
        body.create_by_employee_id = body.created_by_employee_id;
      }
      if (body.task_category_id !== undefined && body.category_id === undefined) {
        body.category_id = body.task_category_id;
      }
    } catch (e) {}

    try { console.log('GeneralTaskService.normalizedBody (create)', body); } catch (e) {}
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
