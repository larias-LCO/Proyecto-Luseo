import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environment';
import { TaskCategory } from '../models/task-category.model';
import { Observable, of, tap } from 'rxjs';

interface TaskCategoryCache {
  data: TaskCategory[];
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class TaskCategoryService {

  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutos (las categorías cambian poco)
  private cache: TaskCategoryCache | null = null;

  constructor(private http: HttpClient) {}

  /**
   * Obtener todas las categorías de tareas
   * @param forceRefresh ignora cache
   */
  getAll(forceRefresh = false): Observable<TaskCategory[]> {
    const now = Date.now();

    if (
      !forceRefresh &&
      this.cache &&
      now - this.cache.timestamp < this.CACHE_TTL
    ) {
      return of(this.cache.data);
    }

    return this.http.get<TaskCategory[]>(
      `${environment.apiUrl}/task-categories`
    ).pipe(
      tap(categories => {
        this.cache = {
          data: categories,
          timestamp: now
        };
      })
    );
  }

  /**
   * Obtener una categoría por ID
   */
  getById(id: number): Observable<TaskCategory> {
    return this.http.get<TaskCategory>(
      `${environment.apiUrl}/task-categories/${id}`
    );
  }

  /**
   * Crear una nueva categoría
   */
  create(payload: Partial<TaskCategory>): Observable<TaskCategory> {
    return this.http
      .post<TaskCategory>(`${environment.apiUrl}/task-categories`, payload)
      .pipe(
        tap(() => this.clearCache())
      );
  }

  /**
   * Actualizar una categoría
   */
  update(id: number, payload: Partial<TaskCategory>): Observable<TaskCategory> {
    return this.http
      .put<TaskCategory>(`${environment.apiUrl}/task-categories/${id}`, payload)
      .pipe(
        tap(() => this.clearCache())
      );
  }

  /**
   * Eliminar una categoría
   */
  delete(id: number): Observable<void> {
    return this.http
      .delete<void>(`${environment.apiUrl}/task-categories/${id}`)
      .pipe(
        tap(() => this.clearCache())
      );
  }

  /**
   * Obtener color de una categoría por ID desde cache
   */
  getCategoryColor(categoryId: number): string {
    if (!this.cache) return '#6c757d'; // color por defecto

    const category = this.cache.data.find(c => c.id === categoryId);
    return category?.colorHex || '#6c757d';
  }

  /**
   * Limpiar cache
   */
  clearCache(): void {
    this.cache = null;
  }
}
