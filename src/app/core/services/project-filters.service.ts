 

//  function toggleSort(){
//     try{
//         const cur = String(window.searchState.sort || 'projectCode,asc');
//       const parts = cur.split(',');
//       const field = parts[0] || 'projectCode';
//       const dir = (parts[1] || 'asc').toLowerCase() === 'asc' ? 'desc' : 'asc';
//         window.searchState.sort = `${field},${dir}`;
//         // Update UI label if present
//         if (window.el?.sort_toggle){
//            // keep label simple: show field short name and arrow
//           const short = field === 'projectCode' ? 'Code' : field;
//          window.el.sort_toggle.textContent = `${short} ${dir === 'asc' ? '↑' : '↓'}`;
//         }
//         // Reset to first page when changing sort
//         window.searchState.page = 0;
//         // Reload projects (do not await here; caller will handle UI)
//         try{ window.loadProjects(); } catch(e){ console.warn('toggleSort: loadProjects failed', e); }
//     }catch(e){ console.warn('toggleSort error', e); }
// }


// Declaraciones globales necesarias para integración JS/Angular
declare var API: string;
declare var setUserInfo: (state: any) => void;
declare var loadPhaseEnums: () => Promise<void>;
function fillEnums() {}
declare var wireEvents: () => void;
declare var loadCatalogs: () => Promise<void>;
declare var ALLOWED_TEAM_JOBS: Set<string>;
// No redeclarar normalizeJobName aquí, ya existe en TS

// Consolidar la interfaz Window en un solo bloque global
declare global {
  interface Window {
    Auth: {
      bootstrap: (opts: { apiBase: string }) => Promise<any>;
      onAuthChange: (cb: (state: any) => void) => void;
    };
    el: {
      f_q?: HTMLInputElement | HTMLSelectElement;
      f_officeName?: HTMLSelectElement;
      f_clientName?: HTMLSelectElement;
      f_softwareName?: HTMLSelectElement;
      f_status?: HTMLSelectElement;
      f_ProjectType?: HTMLSelectElement;
      f_scope?: HTMLSelectElement;
      f_pmIds?: HTMLSelectElement;
      f_department?: HTMLSelectElement;
      f_size?: HTMLInputElement | HTMLSelectElement;
      team_job?: HTMLSelectElement;
      team_dept?: HTMLSelectElement;
      pm_dept?: HTMLSelectElement;
      sort_toggle?: HTMLElement;
    };
    ensureAllPMs: (force?: boolean) => Promise<void>;
    loadEnums: () => Promise<void>;
    searchState: {
      filters: {
        q: string;
        officeName?: string;
        clientName?: string;
        softwareName?: string;
        status?: string;
        projectType?: string;
        scope?: string;
        pmIds?: string;
        departments?: string;
        officeId?: string;
        clientId?: string;
        softwareId?: string;
        type?: string;
        managerId?: string;
        departmentId?: string;
      };
      size: number;
      page: number;
      sort?: string;
    };
    loadProjects: () => void;
    apiGet?: (url: string) => Promise<any>;
    // (No duplicar loadEnums aquí)
  }
}
// // // Cache global para filtros y datos relacionados
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

// // // Inicialización global de la app y filtros
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

  if (typeof wireEvents === 'function') wireEvents();
  if (typeof loadCatalogs === 'function') {
    try { await loadCatalogs(); } catch (e) {}
  }

// //   // Populate create modal filters (team job and dept)
  try {
    if (window.el?.team_job) {
      window.el.team_job.innerHTML = '';
      window.el.team_job.appendChild(option('', 'All Job Positions'));
      // Definir normalizeJobName global para JS
      function normalizeJobName(name: string): string {
        return (name || '').toLowerCase().replace(/\s+/g, '').replace(/_/g, '').trim();
      }
      const teamJobs = Array.isArray(cache.jobs) ? cache.jobs.filter((j: { name: string }) => ALLOWED_TEAM_JOBS.has(normalizeJobName(j.name))) : [];
      teamJobs.forEach((j: { name: string }) => window.el.team_job!.appendChild(option(j.name, j.name)));
    }
    if (window.el?.team_dept) {
      window.el.team_dept.innerHTML = '';
      window.el.team_dept.appendChild(option('', 'All Departments'));
      (Array.isArray(cache.depts) ? cache.depts : []).forEach((d: { name: string }) => window.el.team_dept!.appendChild(option(d.name, d.name)));
    }
    if (window.el?.pm_dept) {
      window.el.pm_dept.innerHTML = '';
      window.el.pm_dept.appendChild(option('', 'All Departments'));
      (Array.isArray(cache.depts) ? cache.depts : []).forEach((d: { name: string }) => window.el.pm_dept!.appendChild(option(d.name, d.name)));
    }
  } catch (e) { console.warn('Error populating create modal filters:', e); }

  // Build global PM list once at startup (after catalogs so we can map IDs to names)
  // Run in background so UI (projects list) can load faster; refresh manager filter when ready
  try { window.ensureAllPMs(true).then(() => fillManagerFilterFromProjects()).catch(() => { }); } catch (e) { }
})();
// Declarar searchState como global para el bloque JS
var searchState = window.searchState || {
  filters: {
    q: '',
    officeId: '',
    clientId: '',
    softwareId: '',
    status: '',
    type: '',
    scope: '',
    managerId: '',
    departmentId: '',
    projectType: '',
    pmIds: ''
  },
  size: 10,
  page: 0,
  sort: ''
};
window.searchState = searchState;
// // // Lee los controles de filtro de la UI y actualiza searchState.filters y size/page
function applySearchFromUI() {
  try {
    searchState.filters.q = (window.el.f_q && window.el.f_q.value) ? String(window.el.f_q.value).trim() : '';
      searchState.filters.officeId = (window.el.f_officeName && window.el.f_officeName.value) ? String(window.el.f_officeName.value) : '';
      searchState.filters.clientId = (window.el.f_clientName && window.el.f_clientName.value) ? String(window.el.f_clientName.value) : '';
      searchState.filters.softwareId = (window.el.f_softwareName && window.el.f_softwareName.value) ? String(window.el.f_softwareName.value) : '';
      searchState.filters.status = (window.el.f_status && window.el.f_status.value) ? String(window.el.f_status.value) : '';
      searchState.filters.projectType = (window.el.f_ProjectType && window.el.f_ProjectType.value) ? String(window.el.f_ProjectType.value) : '';
      searchState.filters.scope = (window.el.f_scope && window.el.f_scope.value) ? String(window.el.f_scope.value) : '';
      searchState.filters.pmIds = (window.el.f_pmIds && window.el.f_pmIds.value) ? String(window.el.f_pmIds.value) : '';
    searchState.filters.departmentId = (window.el.f_department && window.el.f_department.value) ? String(window.el.f_department.value) : '';
    // page size
    const sizeVal = window.el.f_size && window.el.f_size.value ? parseInt(window.el.f_size.value, 10) : NaN;
    if (Number.isFinite(sizeVal) && sizeVal > 0) searchState.size = sizeVal;
    // when applying filters, reset page
    searchState.page = 0;
  } catch (e) { console.warn('applySearchFromUI error', e); }
}

// // // La declaración global de Window ya está incluida arriba con todos los campos necesarios.

// // // Exponer ensureAllPMs globalmente llamando a buildAllPMIds
window.ensureAllPMs = async function(force = false) {
  return await buildAllPMIds(force);
};
// // // Utilidad global para llenar el filtro de gerente desde los proyectos
async function fillManagerFilterFromProjects() {
  if (!window.el || !window.el.f_pmIds) {
    console.warn('fillManagerFilterFromProjects: window.el.f_pmIds is null/undefined');
    return;
  }
  const select = window.el.f_pmIds;
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
      .map((e: any) => ({ id: e.id, name: e.name }))
      .sort((a, b) => (a.name || '').toString().localeCompare((b.name || '').toString(), undefined, { sensitivity: 'base' }));

    people.forEach((p: { id: string, name: string }) => select.appendChild(option(p.id, p.name)));

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
  let safety = 1000; // hard cap to avoid infinite loops in case of backend anomalies
  try {
    let keepGoing = true;
    do {
      const q = qs({ page, size: pageSize, sort: 'projectCode,asc' });
      if (!window.apiGet) throw new Error('window.apiGet is not defined');
      const data = await window.apiGet('/projects/search?' + q);
      const content = Array.isArray(data?.content) ? data.content : [];

      content.forEach((p: any) => {
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
    // Mejorar log: mostrar URL, mensaje y stack si existe
    const url = '/projects/search?page=' + page + '&size=' + pageSize + '&sort=projectCode,asc';
    let errorMsg = '';
    let errorStack = '';
    if (typeof e === 'object' && e !== null) {
      errorMsg = 'message' in e ? (e as any).message : String(e);
      errorStack = 'stack' in e ? (e as any).stack : '';
    } else {
      errorMsg = String(e);
    }
    // safety puede no estar en scope aquí, así que lo inicializamos a -1 si no existe
    console.warn('Could not build global PM list from backend pages.', {
      error: errorMsg,
      stack: errorStack,
      url,
      page,
      totalPages,
      safety
    });
  }

  // Final fallback: if no PMs found, use all employees with PM-capable job positions
  if (all.size === 0) {
    console.warn('buildAllPMIds: No PMs found in projects, using fallback: all PM-capable employees');
    const pmEmployees = (cache.employees || []).filter(isLikelyPM);
    pmEmployees.forEach((e: any) => all.add(Number(e.id)));
  }

  cache.allPMIds = all;
}


// Definición global de ENUMS
declare var ENUMS: any;

// Definir apiGet global si no existe, usando fetch para peticiones reales
if (typeof window.apiGet === 'undefined') {
  window.apiGet = async function apiGet(url: string): Promise<any> {
    let fullUrl = url;
    if (url.startsWith('/')) {
      if (typeof API !== 'undefined') {
        fullUrl = API.replace(/\/$/, '') + url;
      }
    }
    let token: string | null = null;
    try {
      token = localStorage.getItem('token');
    } catch {}
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const resp = await fetch(fullUrl, {
      method: 'GET',
      headers: headers,
      credentials: 'include'
    });
    const text = await resp.text();
    if (!text || /^\s*$/.test(text)) return {};
    if (/^\s*</.test(text)) throw new Error('Non-JSON response received');
    try { return JSON.parse(text); } catch { throw new Error('Invalid JSON from ' + fullUrl); }
  };
}

// (Ya está en la declaración global de Window)

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
    if (!window.apiGet) throw new Error('window.apiGet is not defined');
    const data = await window.apiGet('/projects/enums');
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
        list = list.filter(e => {          // roles es string opcional; considera "manager" como indicio
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

  /** Devuelve la lista de PMs disponibles (para llenar filtro de project managers) */
  async getManagerFilterOptions(force = false): Promise<{ id: number; name: string }[]> {
    await this.ensureAllPMs(force);

    // LOG: Estado del cache
    console.log('[ProjectFiltersService] Empleados en cache:', this.cache.employees);
    console.log('[ProjectFiltersService] EmpleadosById en cache:', this.cache.employeesById);
    console.log('[ProjectFiltersService] allPMIds en cache:', this.cache.allPMIds);

    const ids = Array.from(this.cache.allPMIds);
    const people = ids
      .map(id => this.cache.employeesById.get(Number(id)))
      .filter(Boolean)
      .map(e => ({ id: Number(e!.id), name: e!.name }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    console.log('[ProjectFiltersService] Opciones de PM generadas:', people);
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

 //   /** Rellena las opciones de un select con valores ordenados */
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









