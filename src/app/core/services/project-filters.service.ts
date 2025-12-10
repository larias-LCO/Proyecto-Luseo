// Declaraciones globales necesarias para init
declare var API: string;
declare var setUserInfo: (state: any) => void;
declare var loadPhaseEnums: () => Promise<void>;
declare var fillEnums: () => void;
declare var wireEvents: () => void;
declare var loadCatalogs: () => Promise<void>;
declare var ALLOWED_TEAM_JOBS: Set<string>;
declare function normalizeJobName(name: string): string;
declare global {
  interface Window {
    Auth: {
      bootstrap: (opts: { apiBase: string }) => Promise<any>;
      onAuthChange: (cb: (state: any) => void) => void;
    };
    el: {
      f_q?: HTMLInputElement | HTMLSelectElement;
      f_office?: HTMLSelectElement;
      f_client?: HTMLSelectElement;
      f_software?: HTMLSelectElement;
      f_status?: HTMLSelectElement;
      f_type?: HTMLSelectElement;
      f_scope?: HTMLSelectElement;
      f_manager?: HTMLSelectElement;
      f_department?: HTMLSelectElement;
      f_size?: HTMLInputElement | HTMLSelectElement;
      team_job?: HTMLSelectElement;
      team_dept?: HTMLSelectElement;
      pm_dept?: HTMLSelectElement;
    };
    ensureAllPMs: (force?: boolean) => Promise<void>;
    loadEnums: () => Promise<void>;
  }
}
// Inicialización global de la app y filtros
(async function init() {
  try {
    const state = await window.Auth.bootstrap({ apiBase: API });
    setUserInfo(state);
    window.Auth.onAuthChange(setUserInfo);
  } catch (e) {}

  // Load enums from backend, then fill selects
  if (window.loadEnums) { await window.loadEnums(); }
  // Load phase enums (names and status)
  try { await loadPhaseEnums(); } catch (e) {}
  fillEnums();

  wireEvents();
  try { await loadCatalogs(); } catch (e) {}

  // Populate create modal filters (team job and dept)
  try {
    if (window.el.team_job) {
      window.el.team_job.innerHTML = '';
      window.el.team_job.appendChild(option('', 'All Job Positions'));
      const teamJobs = (cache.jobs || []).filter(j => ALLOWED_TEAM_JOBS.has(normalizeJobName(j.name)));
      teamJobs.forEach(j => window.el.team_job.appendChild(option(j.name, j.name)));
    }
    if (window.el.team_dept) {
      window.el.team_dept.innerHTML = '';
      window.el.team_dept.appendChild(option('', 'All Departments'));
      (cache.depts || []).forEach(d => window.el.team_dept.appendChild(option(d.name, d.name)));
    }
    if (window.el.pm_dept) {
      window.el.pm_dept.innerHTML = '';
      window.el.pm_dept.appendChild(option('', 'All Departments'));
      (cache.depts || []).forEach(d => window.el.pm_dept.appendChild(option(d.name, d.name)));
    }
  } catch (e) { console.warn('Error populating create modal filters:', e); }

  // Build global PM list once at startup (after catalogs so we can map IDs to names)
  // Run in background so UI (projects list) can load faster; refresh manager filter when ready
  try { window.ensureAllPMs(true).then(() => fillManagerFilterFromProjects()).catch(() => { }); } catch (e) { }
})();
// Declarar searchState como global
declare var searchState: {
  filters: {
    q: string;
    officeId: string;
    clientId: string;
    softwareId: string;
    status: string;
    type: string;
    scope: string;
    managerId: string;
    departmentId: string;
  };
  size: number;
  page: number;
};
// Lee los controles de filtro de la UI y actualiza searchState.filters y size/page
function applySearchFromUI() {
  try {
    searchState.filters.q = (window.el.f_q && window.el.f_q.value) ? String(window.el.f_q.value).trim() : '';
    searchState.filters.officeId = (window.el.f_office && window.el.f_office.value) ? String(window.el.f_office.value) : '';
    searchState.filters.clientId = (window.el.f_client && window.el.f_client.value) ? String(window.el.f_client.value) : '';
    searchState.filters.softwareId = (window.el.f_software && window.el.f_software.value) ? String(window.el.f_software.value) : '';
    searchState.filters.status = (window.el.f_status && window.el.f_status.value) ? String(window.el.f_status.value) : '';
    searchState.filters.type = (window.el.f_type && window.el.f_type.value) ? String(window.el.f_type.value) : '';
    searchState.filters.scope = (window.el.f_scope && window.el.f_scope.value) ? String(window.el.f_scope.value) : '';
    searchState.filters.managerId = (window.el.f_manager && window.el.f_manager.value) ? String(window.el.f_manager.value) : '';
    searchState.filters.departmentId = (window.el.f_department && window.el.f_department.value) ? String(window.el.f_department.value) : '';
    // page size
    const sizeVal = window.el.f_size && window.el.f_size.value ? parseInt(window.el.f_size.value, 10) : NaN;
    if (Number.isFinite(sizeVal) && sizeVal > 0) searchState.size = sizeVal;
    // when applying filters, reset page
    searchState.page = 0;
  } catch (e) { console.warn('applySearchFromUI error', e); }
}
// Declarar el objeto el en window para acceso global
declare global {
  interface Window {
    el: {
      f_q?: HTMLInputElement | HTMLSelectElement;
      f_office?: HTMLSelectElement;
      f_client?: HTMLSelectElement;
      f_software?: HTMLSelectElement;
      f_status?: HTMLSelectElement;
      f_type?: HTMLSelectElement;
      f_scope?: HTMLSelectElement;
      f_manager?: HTMLSelectElement;
      f_department?: HTMLSelectElement;
      f_size?: HTMLInputElement | HTMLSelectElement;
    };
    ensureAllPMs: (force?: boolean) => Promise<void>;
  }
}

// Exponer ensureAllPMs globalmente llamando a buildAllPMIds
window.ensureAllPMs = async function(force = false) {
  return await buildAllPMIds(force);
};
// Utilidad global para llenar el filtro de gerente desde los proyectos
async function fillManagerFilterFromProjects() {
  if (!window.el || !window.el.f_manager) {
    console.warn('fillManagerFilterFromProjects: window.el.f_manager is null/undefined');
    return;
  }
  const select = window.el.f_manager;
  // Render immediately from cache (may be empty) so UI isn't blocked.
  const renderList = () => {
    const first = select.querySelector('option');
    const prev = select.value;
    select.innerHTML = '';
    if (first) select.appendChild(first);
    const ids = Array.from(cache.allPMIds || []);

    const people = ids
      .map(id => {
        const emp = cache.employeesById.get(id);
        if (!emp) console.warn('fillManagerFilterFromProjects: No employee found for PM ID:', id);
        return emp;
      })
      .filter(Boolean)
      .map(e => ({ id: e.id, name: e.name }))
      .sort((a, b) => (a.name || '').toString().localeCompare((b.name || '').toString(), undefined, { sensitivity: 'base' }));

    people.forEach(p => select.appendChild(option(p.id, p.name)));

    // restore selection when possible; otherwise default to All
    if (prev && Array.from(select.options).some((o: HTMLOptionElement) => String(o.value) === String(prev))) {
      select.value = prev;
    } else {
      select.value = '';
    }
  };
  // Initial immediate render
  try { renderList(); } catch (e) { /* ignore rendering failures silently */ }
  // Refresh in background if needed
  window.ensureAllPMs(false).then(() => { try { renderList(); } catch (e) { } }).catch(() => { });
}
// Utilidad global para construir el set de IDs de Project Managers
async function buildAllPMIds(force: boolean) {
  // Minimal/noise implementation: only warn on real failures or when falling back
  if (!force && cache.allPMIds && cache.allPMIds.size > 0) return; // already built
  const pageSize = 1000; // larger page size to reduce requests and number of calls
  let page = 0, totalPages = 1;
  const all = new Set<number>();
  try {
    let keepGoing = true;
    let safety = 1000; // hard cap to avoid infinite loops in case of backend anomalies
    do {
      const q = qs({ page, size: pageSize, sort: 'projectCode,asc' });
      const data = await apiGet('/projects/search?' + q);
      const content = Array.isArray(data?.content) ? data.content : [];

      content.forEach(p => {
        // Try multiple sources for PM IDs (preferred: pmIds, otherwise other fields or assignments)
        let foundPMs = false;
        if (Array.isArray(p.pmIds) && p.pmIds.length > 0) {
          p.pmIds.forEach((id: any) => all.add(Number(id)));
          foundPMs = true;
        }
        if (!foundPMs && p.projectManagerId) { all.add(Number(p.projectManagerId)); foundPMs = true; }
        if (!foundPMs && p.pmId) { all.add(Number(p.pmId)); foundPMs = true; }
        if (!foundPMs && Array.isArray(p.assignments)) {
          const pmAssignments = p.assignments.filter((a: any) => {
            const role = (a.role || a.assignmentRole || '').toLowerCase();
            return role.includes('pm') || role.includes('project manager') || role.includes('manager');
          });
          if (pmAssignments.length > 0) {
            pmAssignments.forEach((a: any) => {
              const empId = a.employeeId || a.employee_id || (a.employee && a.employee.id);
              if (empId) all.add(Number(empId));
            });
          }
        }
        // intentionally no per-project logging here to avoid noise
      });

      const dtoPage = data && data.page ? data.page : null;
      if (dtoPage && (dtoPage.totalPages ?? 0) > 0) {
        totalPages = dtoPage.totalPages;
        page++;
        keepGoing = page < totalPages;
      } else if (Number.isFinite(data?.totalPages) && data.totalPages > 0) {
        totalPages = data.totalPages;
        page++;
        keepGoing = page < totalPages;
      } else {
        // No totalPages provided: continue until the last page returned less than pageSize
        page++;
        keepGoing = content.length === pageSize;
      }
      safety--;
    } while (keepGoing && safety > 0);
  } catch (e) {
    // Keep a single warning so developers can see something went wrong
    console.warn('Could not build global PM list from backend pages:', e);
  }

  // Final fallback: if no PMs found, use all employees with PM-capable job positions
  if (all.size === 0) {
    console.warn('buildAllPMIds: No PMs found in projects, using fallback: all PM-capable employees');
    const pmEmployees = (cache.employees || []).filter(isLikelyPM);
    pmEmployees.forEach((e: any) => all.add(Number(e.id)));
  }

  cache.allPMIds = all;
}


// Definición global de ENUMS y apiGet para evitar errores de compilación
declare var ENUMS: any;
declare function apiGet(url: string): Promise<any>;

// Extender Window para loadEnums
declare global {
  interface Window {
    loadEnums: () => Promise<void>;
  }
}

// Definir función option para crear elementos <option>
function option(value: string, label: string): HTMLOptionElement {
  const opt = document.createElement('option');
  opt.value = value;
  opt.textContent = label;
  return opt;
}

// Utilidad para llenar un <select> con opciones ordenadas
function fillSelect(
  sel: HTMLSelectElement,
  items: any[],
  map: { value: (item: any) => string; label: (item: any) => string }
): void {
  sel.innerHTML = '';
  const toLabel = (it: any) => (map.label(it) ?? '').toString();
  (items || []).slice().sort((a: any, b: any) => toLabel(a).localeCompare(toLabel(b), undefined, { sensitivity: 'base' }))
    .forEach((it: any) => sel.appendChild(option(map.value(it), map.label(it))));
}

// Utilidad para cargar enums desde el backend y exponerlos globalmente
window.loadEnums = async function loadEnums(): Promise<void> {
  try {
    const data = await apiGet('/projects/enums');
    ENUMS = {
      areaUnit: Array.isArray(data?.areaUnit) ? data.areaUnit : [],
      type: Array.isArray(data?.type) ? data.type : [],
      status: Array.isArray(data?.status) ? data.status : [],
      scope: Array.isArray(data?.scope) ? data.scope : []
    };
  } catch (e) {
    console.warn('Could not load enums from backend:', e);
    ENUMS = { areaUnit: [], type: [], status: [], scope: [] };
  }
};
// Cache global para filtros y datos relacionados
let cache = {
  employees: [],
  employeesById: new Map(),
  offices: [],
  clients: [],
  software: [],
  jobs: [],
  depts: [],
  projects: [],
  phasesByProject: {}, // { [projectId: string]: Phase[] }
  page: { number: 0, totalPages: 0, totalElements: 0, size: 10 },
  allPMIds: new Set(), // Agregado para buildAllPMIds global
};
// Definir función qs para serializar parámetros de consulta
function qs(obj: Record<string, any>): string {
  return Object.entries(obj)
    .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v))
    .join('&');
}

// Exponer isLikelyPM globalmente (usando la heurística de la clase)
function isLikelyPM(empOrName: any): boolean {
  if (empOrName && typeof empOrName === 'object') {
    const roleText = (empOrName.jobTitle || '') + '';
    const normalized = (roleText || '').toLowerCase().replace(/\s+/g, '').replace(/_/g, '').trim();
    if (normalized.includes('manager')) return true;
  }
  const ref = typeof empOrName === 'string' ? empOrName : (empOrName?.jobTitle || '');
  const n = (ref || '').toLowerCase().replace(/\s+/g, '').replace(/_/g, '').trim();
  const PM_KEYWORDS = [
    'projectmanager',
    'gerentedelproyecto',
    'jefedeproyecto',
    'responsabledeproyecto',
    'gerenteproyecto',
    'projectlead',
    'productmanager'
  ];
  return PM_KEYWORDS.some(k => n === k || n.includes(k));
}
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
  
  async ensureAllPMs(force = false): Promise<void> {
    return buildAllPMIds(!!force);

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
