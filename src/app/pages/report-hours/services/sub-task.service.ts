import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environment';
import { SubTask } from '../models/sub-task.model';
import { Observable, of, tap } from 'rxjs';

interface SubTaskCache {
  data: SubTask[];
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class SubTaskService {

  private readonly CACHE_TTL = 3 * 60 * 1000; // 3 min
  private cache: SubTaskCache | null = null;

  constructor(private http: HttpClient) {}

  // ========= LOAD =========
  getAll(forceRefresh = false): Observable<SubTask[]> {
    const now = Date.now();

    if (
      !forceRefresh &&
      this.cache &&
      now - this.cache.timestamp < this.CACHE_TTL
    ) {
      return of(this.cache.data);
    }

    return this.http
      .get<SubTask[]>(`${environment.apiUrl}/sub-tasks`)
      .pipe(
        tap(data => {
          this.cache = {
            data,
            timestamp: now
          };
        })
      );
  }

  // ========= CREATE =========
  create(payload: Partial<SubTask>): Observable<SubTask> {
    return this.http
      .post<SubTask>(`${environment.apiUrl}/sub-tasks`, payload)
      .pipe(
        tap(() => this.clearCache())
      );
  }

  // ========= FILTERS (PUROS) =========
  filterByEmployee(subtasks: SubTask[], employeeId: number): SubTask[] {
    return subtasks.filter(s => s.createdByEmployeeId === employeeId);
  }

  filterByProject(subtasks: SubTask[], projectId: number): SubTask[] {
    return subtasks.filter(s => s.projectId === projectId);
  }

  filterByDateRange(
    subtasks: SubTask[],
    start: string,
    end: string
  ): SubTask[] {
    return subtasks.filter(s =>
      s.issueDate >= start && s.issueDate <= end
    );
  }

  // ========= CACHE =========
  clearCache(): void {
    this.cache = null;
  }
}