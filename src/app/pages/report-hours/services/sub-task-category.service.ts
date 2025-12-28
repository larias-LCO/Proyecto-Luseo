import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environment';
import { SubTaskCategory } from '../models/sub-task-category.model';
import { Observable, of, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SubTaskCategoryService {

  private cache: SubTaskCategory[] | null = null;

  constructor(private http: HttpClient) {}

  // ========= LOAD ALL =========
  getAll(forceRefresh = false): Observable<SubTaskCategory[]> {
    if (!forceRefresh && this.cache) {
      return of(this.cache);
    }

    return this.http
      .get<SubTaskCategory[]>(`${environment.apiUrl}/subtask-categories`)
      .pipe(
        tap(data => (this.cache = data))
      );
  }

  // ========= CREATE =========
  create (subTaskCategory: SubTaskCategory): Observable<SubTaskCategory> {
    return this.http
      .post<SubTaskCategory>(`${environment.apiUrl}/subtask-categories`, subTaskCategory)
      .pipe(
        tap(() => this.clearCache())
      );
  }


  // ========= EDIT =========
  edit (subTaskCategory: SubTaskCategory): Observable<SubTaskCategory> {
    return this.http
      .put<SubTaskCategory>(`${environment.apiUrl}/subtask-categories/${subTaskCategory.id}`, subTaskCategory)
      .pipe(
        tap(() => this.clearCache())
      );
  }


  // ========= DELETE =========
  delete (id: number): Observable<void> {
    return this.http
      .delete<void>(`${environment.apiUrl}/subtask-categories/${id}`)
      .pipe(
        tap(() => this.clearCache())
      );
  }

  clearCache(): void {
    this.cache = null;
  }
}