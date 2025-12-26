import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environment';
import { SubTaskCategory } from '../models/sub-task-category.model';
import { Observable, of, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SubTaskCategoryService {

  private cache: SubTaskCategory[] | null = null;

  constructor(private http: HttpClient) {}

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

  clearCache(): void {
    this.cache = null;
  }
}