import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environment';
import { InternalTaskCategory } from '../models/internal-task-category.model';
import { Observable, of, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class InternalTaskService {

  private cache: InternalTaskCategory[] | null = null;

  constructor(private http: HttpClient) {}

  // ========= LOAD =========
  getAll(forceRefresh = false): Observable<InternalTaskCategory[]> {
    if (!forceRefresh && this.cache) {
      return of(this.cache);
    }

    return this.http
      .get<InternalTaskCategory[]>(`${environment.apiUrl}/internal-tasks`)
      .pipe(
        tap(data => (this.cache = data))
      );
  }

  // ========= HELPERS (PUROS) =========
  getMainTasks(tasks: InternalTaskCategory[]): InternalTaskCategory[] {
    return tasks.filter(t => t.isMainTask);
  }

  getSubTasks(
    tasks: InternalTaskCategory[],
    parentTaskId: number
  ): InternalTaskCategory[] {
    return tasks.filter(t => t.parentTaskId === parentTaskId);
  }

  getTaskById(
    tasks: InternalTaskCategory[],
    taskId: number
  ): InternalTaskCategory | undefined {
    return tasks.find(t => t.id === taskId);
  }

  // ========= CACHE =========
  clearCache(): void {
    this.cache = null;
  }
}