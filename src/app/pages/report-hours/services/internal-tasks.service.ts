import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environment';
import { InternalTaskLog } from '../models/internal-task-log.model';
import { Observable, of, tap } from 'rxjs';

interface InternalTaskLogCache {
  data: InternalTaskLog[];
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class InternalTaskLogService {

  private readonly CACHE_TTL = 2 * 60 * 1000; // 2 min
  private cache: InternalTaskLogCache | null = null;

  constructor(private http: HttpClient) {}

  // ========= LOAD =========
  getAll(forceRefresh = false): Observable<InternalTaskLog[]> {
    const now = Date.now();

    if (
      !forceRefresh &&
      this.cache &&
      now - this.cache.timestamp < this.CACHE_TTL
    ) {
      return of(this.cache.data);
    }

    return this.http
      .get<InternalTaskLog[]>(`${environment.apiUrl}/internal-task-logs`)
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
  create(payload: Partial<InternalTaskLog>): Observable<InternalTaskLog> {
    return this.http
      .post<InternalTaskLog>(
        `${environment.apiUrl}/internal-task-logs`,
        payload
      )
      .pipe(
        tap(() => this.clearCache())
      );
  }

  // ========= UPDATE =========
  update(
    logId: number,
    payload: Partial<InternalTaskLog> ): Observable<InternalTaskLog> {
    return this.http
      .put<InternalTaskLog>(
        `${environment.apiUrl}/internal-task-logs/${logId}`,
        payload
      )
      .pipe(
        tap(() => this.clearCache())
      );
  }

  // ========= DELETE =========
  delete (logId: number): Observable<void> {
    return this.http
      .delete<void>(
        `${environment.apiUrl}/internal-task-logs/${logId}`
      )
      .pipe(
        tap(() => this.clearCache())
      );
  }

  // ========= FILTERS =========
  filterByEmployee(
    logs: InternalTaskLog[],
    employeeId: number
  ): InternalTaskLog[] {
    return logs.filter(l => l.createdByEmployeeId === employeeId);
  }

  filterByDateRange(
    logs: InternalTaskLog[],
    start: string,
    end: string
  ): InternalTaskLog[] {
    return logs.filter(
      l => l.logDate >= start && l.logDate <= end
    );
  }

  filterByInternalTask(
    logs: InternalTaskLog[],
    internalTaskId: number
  ): InternalTaskLog[] {
    return logs.filter(l => l.internalTaskId === internalTaskId);
  }

  // ========= CACHE =========
  clearCache(): void {
    this.cache = null;
  }
}