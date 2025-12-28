import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environment';
import { Employee } from '../models/employee.model';
import { Observable, map, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class EmployeeService {

  private readonly baseUrl = `${environment.apiUrl}/employees`;

  // ===== Cache en memoria =====
  private employeesCache: Employee[] | null = null;
  private departmentMapCache: Map<number, number | null> | null = null;

  constructor(private http: HttpClient) {}

  // =====================================================
  // GET: Empleado por ID (ej: empleado logueado)
  // =====================================================
  getById(id: number): Observable<Employee> {
    return this.http.get<Employee>(`${this.baseUrl}/${id}`, {
      withCredentials: true
    });
  }

  // =====================================================
  // GET: Todos los empleados
  // =====================================================
  getAll(forceRefresh = false): Observable<Employee[]> {
    if (this.employeesCache && !forceRefresh) {
      return new Observable(obs => {
        obs.next(this.employeesCache!);
        obs.complete();
      });
    }

    return this.http.get<Employee[]>(this.baseUrl, {
      withCredentials: true
    }).pipe(
      tap(employees => this.employeesCache = employees)
    );
  }

  // =====================================================
  // GET: Mapa employeeId -> departmentId
  // (clave para filtros de coordinador)
  // =====================================================
  getEmployeeDepartmentMap(forceRefresh = false): Observable<Map<number, number | null>> {

    if (this.departmentMapCache && !forceRefresh) {
      return new Observable(obs => {
        obs.next(this.departmentMapCache!);
        obs.complete();
      });
    }

    return this.getAll(forceRefresh).pipe(
      map(employees => {
        const mapDept = new Map<number, number | null>();
        employees.forEach(emp => {
          mapDept.set(emp.id, emp.departmentId ?? null);
        });
        this.departmentMapCache = mapDept;
        return mapDept;
      })
    );
  }

  // =====================================================
  // POST: Crear empleado
  // =====================================================
  create(employee: Partial<Employee>): Observable<Employee> {
    return this.http.post<Employee>(this.baseUrl, employee, {
      withCredentials: true
    }).pipe(
      tap(() => this.clearCache())
    );
  }

  // =====================================================
  // PUT: Actualizar empleado
  // =====================================================
  update(id: number, employee: Partial<Employee>): Observable<Employee> {
    return this.http.put<Employee>(`${this.baseUrl}/${id}`, employee, {
      withCredentials: true
    }).pipe(
      tap(() => this.clearCache())
    );
  }

  // =====================================================
  // DELETE: Eliminar empleado
  // =====================================================
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`, {
      withCredentials: true
    }).pipe(
      tap(() => this.clearCache())
    );
  }

  // =====================================================
  // Limpieza de cache (logout, refresh global, etc)
  // =====================================================
  clearCache() {
    this.employeesCache = null;
    this.departmentMapCache = null;
  }
}