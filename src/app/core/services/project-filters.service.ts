import { Injectable } from '@angular/core';
import { Employee } from '../../core/services/catalogs.service';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { AuthService } from './auth.service';
// import removed: CreateProjectComponent is not needed in this service

interface CacheData {
  employees: Employee[];
  employeesById: Map<number, Employee>;
  allPMIds: Set<number>;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectFiltersService {
  private cache: CacheData = {
    employees: [],
    employeesById: new Map(),
    allPMIds: new Set(),
  };

  // Palabras clave para detectar "Project Manager"
  private readonly PM_KEYWORDS = [
    'projectmanager',
    'gerentedelproyecto',
    'jefedeproyecto',
    'responsabledeproyecto',
    'gerenteproyecto',
    'projectlead',
    'productmanager'
  ];

  constructor(
    private http: HttpClient,
    private auth: AuthService,
  ) {}

  

  /** Guarda empleados (ya cargados desde los catálogos de tu app) */
  setEmployees(employees: Employee[]): void {
    this.cache.employees = employees;
    // Normalizamos IDs a number para consistencia interna
    this.cache.employeesById = new Map(employees.map(e => [Number(e.id), e]));
  }

  /** Acceso público de solo lectura a todos los empleados en caché */
  get employeesAll(): Employee[] {
    return this.cache.employees;
  }

  /** Verifica coincidencia de texto (case insensitive) */
  private matchesContains(value: string | undefined, needle: string | undefined): boolean {
    if (!needle) return true;
    if (!value) return false;
    return value.toLowerCase().includes(needle.toLowerCase());
  }

  /** Normaliza nombres de cargos */
  private normalizeJobName(name: string | undefined): string {
    return (name || '').toLowerCase().replace(/\s+/g, '').replace(/_/g, '').trim();
  }

  /** Determina si el empleado es (o parece) Project Manager */
  private isLikelyPM(empOrName: Employee | string): boolean {
    // Si viene objeto, usamos el puesto (jobPositionName) para detectar manager
    if (empOrName && typeof empOrName === 'object') {
      const roleText = (empOrName.jobTitle || '') + '';
      const normalized = this.normalizeJobName(roleText);
      if (normalized.includes('manager')) return true;
      // Continúa a ver keywords
    }

    const ref = typeof empOrName === 'string' ? empOrName : (empOrName?.jobTitle || '');
    const n = this.normalizeJobName(ref);
    return this.PM_KEYWORDS.some(k => n === k || n.includes(k));
  }

  /** Llama al backend de proyectos para obtener una página (maneja texto/JSON) */
  private async fetchProjects(params: HttpParams): Promise<any> {
    const base = (this.auth.getApiBase() || '').replace(/\/$/, '');
    const url = `${base}/projects/search`;
    const token = this.auth.getState().token;
    let headers = new HttpHeaders({ 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' });
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);

    const resp: any = await this.http
      .get(url, { params, headers, observe: 'response', responseType: 'text', withCredentials: true })
      .toPromise();

    const raw = (resp?.body ?? '').toString();
    if (!raw || /^\s*$/.test(raw)) return {};
    if (/^\s*</.test(raw)) throw new Error('Non-JSON response received');
    try { return JSON.parse(raw); } catch { throw new Error('Invalid JSON from /projects/search'); }
  }

  /** Filtra empleados con los parámetros activos de búsqueda */
  filterEmployees(criteria: { onlyPM?: boolean; q?: string; job?: string; dept?: string; roleList?: string[] }): Employee[] {
    const { onlyPM, q, job, dept, roleList } = criteria || {};
    let list = this.cache.employees.slice();

    // Filtrar solo PMs: si ya tenemos el set global de PM IDs úsalo; si no, usa heurística por jobTitle/roles
    if (onlyPM) {
      const pmIds = this.cache.allPMIds;
      if (pmIds && pmIds.size > 0) {
        list = list.filter(e => pmIds.has(Number(e.id)));
      } else {
        list = list.filter(e => {
          // roles es string opcional; considera "manager" como indicio
          const rolesText = (e.roles || '').toLowerCase();
          return rolesText.includes('manager') || this.isLikelyPM(e);
        });
      }
    }

    // Filtro por lista de roles permitidos (por nombre de rol en jobTitle o roles)
    if (roleList && roleList.length) {
      const target = roleList.map(r => r.toLowerCase());
      list = list.filter(e => {
        const jt = (e.jobTitle || '').toLowerCase();
        const rl = (e.roles || '').toLowerCase();
        return target.some(t => jt.includes(t) || rl.includes(t));
      });
    }

    // Búsqueda libre por nombre/puesto/departamento
    if (q && q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter(e =>
        this.matchesContains(e.name, needle) ||
        this.matchesContains(e.jobTitle, needle) ||
        this.matchesContains(e.department as any, needle)
      );
    }

    // Filtro por puesto exacto (valor del select)
    if (job && job.trim()) {
      list = list.filter(e => (e.jobTitle || '').toLowerCase() === job.toLowerCase());
    }

    // Filtro por departamento exacto (valor del select)
    if (dept && dept.trim()) {
      // Employee.department es string según el modelo
      list = list.filter(e => (e.department || '').toLowerCase() === dept.toLowerCase());
    }

    return list;
  }


  /** Construye la lista global de IDs de Project Managers (desde backend /projects/search) */
  async buildAllPMIds(force = false): Promise<void> {
    if (!force && this.cache.allPMIds.size > 0) return;

    const pageSize = 200;
    let page = 0;
    let totalPages = 1;
    const all = new Set<number>();
    let safety = 1000;

    try {
      do {
        const params = new HttpParams()
          .set('page', page.toString())
          .set('size', pageSize.toString())
          .set('sort', 'projectCode,asc');

  const data: any = await this.fetchProjects(params);
        const content = Array.isArray(data?.content) ? data.content : [];

        content.forEach((p: any) => {
          if (Array.isArray(p.pmIds)) {
            p.pmIds.forEach((id: number) => all.add(Number(id)));
          }
        });

        const dtoPage = data?.page;
        if (dtoPage?.totalPages) {
          totalPages = dtoPage.totalPages;
          page++;
        } else if (Number.isFinite(data?.totalPages) && data.totalPages > 0) {
          totalPages = data.totalPages;
          page++;
        } else {
          page++;
          if (content.length < pageSize) break;
        }

        safety--;
      } while (page < totalPages && safety > 0);
    } catch (e) {
      console.warn('Error construyendo lista global de PMs, usando fallback:', e);
      this.cache.employees
        .filter(e => this.isLikelyPM(e))
        .forEach(e => all.add(Number(e.id)));
    }

    this.cache.allPMIds = all;
  }

  async ensureAllPMs(force = false): Promise<void> {
    await this.buildAllPMIds(force);
  }

  /** Devuelve la lista de PMs disponibles (para llenar filtro de gerente/proyecto) */
  async getManagerFilterOptions(force = false): Promise<{ id: number; name: string }[]> {
    await this.ensureAllPMs(force);

    const ids = Array.from(this.cache.allPMIds);
    const people = ids
      .map(id => this.cache.employeesById.get(Number(id)))
      .filter(Boolean)
      .map(e => ({ id: Number(e!.id), name: e!.name }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    return people;
  }

  // NUEVAS UTILIDADES DE FILTRO Y ORDENAMIENTO (adaptadas del JS)
  // -------------------------------------------------------------

  /** Ordena cualquier lista alfabéticamente por nombre */
  sortByName<T extends { name?: string }>(list: T[]): T[] {
    return list.slice().sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
    );
  }

  /** Rellena las opciones de un select con valores ordenados */
  fillLookup(select: HTMLSelectElement, list: { name: string }[]): void {
    if (!select) return;
    select.innerHTML = '';
    const optionAll = document.createElement('option');
    optionAll.value = '';
    optionAll.textContent = 'All';
    select.appendChild(optionAll);

    this.sortByName(list).forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.name;
      opt.textContent = item.name;
      select.appendChild(opt);
    });
  }






}
