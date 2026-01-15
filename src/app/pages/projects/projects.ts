import { Component, OnInit, ViewChild } from '@angular/core';
import { inject } from '@angular/core';
import { CommonModule, NgForOf, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogsService, Employee } from './../../core/services/catalogs.service';
import { AuthService } from '../../core/services/auth.service';
import { EnumsService, Enums } from '../../core/services/enums.service';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { HttpParams, HttpHeaders } from '@angular/common/http';
import { HeaderComponent } from '../../core/components/header/header';
import { SubmenuComponent } from '../../core/components/submenu/submenu';
import { ProjectFiltersService } from '../../core/services/project-filters.service';
import { SubmenuService } from '../../core/services/submenu.service';
import { CreateProjectComponent } from '../../core/components/create-project/create-project';
import { ProjectPayload } from '../../core/services/project.service';
import { CreateEditHelper } from '../../shared/create-edit';
import { ProjectDetailsComponent } from '../../core/components/project-details/project-details';
import { ProjectService } from '../../core/services/project.service';
import { WebsocketService } from '../../core/services/websocket.service';
import { debounceTime } from 'rxjs/operators';
import { Subject, Subscription } from 'rxjs';
import { MenuFiltersProjects } from "./components/menu-filters-projects/menu-filters-projects";
// import { MenuFiltersProjects } from "../../core/components/menu-filters-projects/menu-filters-projects";


@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, HeaderComponent, CreateProjectComponent, ProjectDetailsComponent, MenuFiltersProjects, SubmenuComponent],
  templateUrl: './projects.html',
  styleUrls: ['./projects.scss'],
  providers: [ProjectService],
})
export class ProjectsPage implements OnInit {

  // header.component.ts (o donde esté el botón)
isMenuOpen = false;

toggleMenu() {
  this.isMenuOpen = !this.isMenuOpen;
}


  // WebSocket y subs para eventos en tiempo real

private ws = inject(WebsocketService);
private wsRefresh$ = new Subject<void>();
private subs = new Subscription();

  
   private createEdit: CreateEditHelper;
  @ViewChild(CreateProjectComponent) createProjectRef?: CreateProjectComponent;
  // Catálogos cargados desde el backend
  offices: any[] = [];
  clients: any[] = [];
  software: any[] = [];
  departments: any[] = [];
  jobPositions: any[] = [];
  employees: Employee[] = [];
  managerOptions: { id: number, name: string }[] = [];
  // Lista completa de managers (no debe ser reducida por filtros de proyectos)
  managerOptionsAll: { id: number, name: string }[] = [];
  // Opcional: lista derivada según proyectos cargados
  managerOptionsFiltered: { id: number, name: string }[] = [];
  statusList = [
    { value: 'CANCELLED', label: 'Cancelled' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'PAUSED', label: 'Paused' }
  ];

  // Filtros seleccionados
  selectedOffice = '';
  selectedClient = '';
  selectedSoftware = '';
  selectedDepartment = '';
  selectedManager = '';
  selectedStatus: string = '';
  selectedType: string = '';
  selectedScope: string = '';
  // ...existing code...
pageSize: number = 10; // Default value
// ...existing code...
  searchText: string = '';
  private searchDebounce: any;
  isCreateOpen = false; // El modal solo se abre manualmente

   mockprojects = [
    { id: 1, name: 'Hotel App' },
    { id: 2, name: 'E-commerce Web' },
    { id: 3, name: 'CRM System' }
  ];

  // --- Variables internas de enums y proyectos ---
enums: Enums = { areaUnit: [], type: [], status: [], scope: [] };


projects: any[] = [];
  pageInfo = { number: 0, totalPages: 0, totalElements: 0, size: 10 };
  searchState = {
    page: 0,
    size: 10,
    sort: 'projectCode,asc',
    filters: {} as any
  };

  // --- Constructor con servicios ---
constructor(
    private catalogsService: CatalogsService,
    private enumsService: EnumsService,
    public auth: AuthService,
    private http: HttpClient,
    private projectFiltersService: ProjectFiltersService,
    private projectService: ProjectService
    , private submenuService: SubmenuService
  ) {
    // ✅ Aquí conectas correctamente el helper con el servicio
    this.createEdit = new CreateEditHelper(this.projectService);
    
    // Suscribir al estado del submenu
    this.submenuService.open$.subscribe(isOpen => {
      this.isMenuOpen = isOpen;
    });
  }


  selectedProject: any | null = null;
  selectedProjectId: number | null = null;



  
onFiltersUpdated(filters: any) {
  this.searchState.filters = filters;
  this.searchState.page = 0;
  this.loadProjects();
}
  /**
   * Abre el modal de edición para el proyecto dado.
   * Puede delegar a un componente, helper o lógica global según arquitectura.
   */
  openEditModal(project: any): void {
    if (!project || !project.id) return;
    if ((window as any).openEditProject) {
      (window as any).openEditProject(project.id);
    } else {
      alert('Función de edición no implementada.');
    }
  }

  /**
   * Elimina el proyecto dado tras confirmación.
   * Puede delegar a un modal de confirmación o llamar al servicio directamente.
   */
  async deleteProject(project: any): Promise<void> {
    if (!project || !project.id) return;
    if (!confirm(`¿Seguro que deseas eliminar el proyecto "${project.name || project.projectCode || project.id}"?`)) return;
    try {
      await this.projectService.deleteProject(project.id);
      this.loadProjects(); // Recarga la lista tras eliminar
    } catch (err: any) {
      alert('Error eliminando proyecto: ' + (err.message || err));
    }
  }

    /**
     * Devuelve true si el usuario autenticado tiene rol USER (no puede editar/eliminar)
     */
    get isUserOnly(): boolean {
      try {
        return this.auth.isUser();
      } catch {
        return false;
      }
    }

  // Debug helper: route logs through here so linters don't complain about raw console.log usage.
  // It prints only when a dev flag is present on window.__env?.debug === true.
  private debug(...args: any[]) {
    try {
      const env = (window as any).__env;
      if (env && env.debug) {
        // eslint-disable-next-line no-console
        console.log(...args);
      }
    } catch (_err) {
      // ignore
    }
  }

  

  
  // --- Inicialización ---
  async ngOnInit() {
    // // Verificar autenticación antes de cargar datos
    // const authState = this.auth.getState();
    // if (!authState.authenticated || !authState.token) {
    //   window.location.href = '/login';
    //   return;
    // }
 
// --- Configuración de WebSocket para actualizaciones en tiempo real ---

  const wsSub = this.ws.subscribe('project').subscribe((event: any) => {
  console.log('WS PROJECT EVENT', event);
  this.wsRefresh$.next();
});
this.subs.add(wsSub);

const wsDebounceSub = this.wsRefresh$
  .pipe(debounceTime(500))
  .subscribe(() => {
    this.loadProjects();
  });
this.subs.add(wsDebounceSub);
    // Subscribe to shared submenu open state
    const submenuSub = this.submenuService.open$.subscribe(v => {
      this.isMenuOpen = !!v;
    });
    this.subs.add(submenuSub);
 //=======================================================================
    
    // --- Inicialización de catálogos y proyectos ---
    await this.loadCatalogs();
    this.enums = await this.enumsService.loadEnums();
    // Ordenar catálogos alfabéticamente
    const byName = (a: any, b: any) => (String(a.name || a.label || '')).localeCompare(String(b.name || b.label || ''), undefined, { sensitivity: 'base' });
    this.offices = (this.offices || []).slice().sort(byName);
    this.clients = (this.clients || []).slice().sort(byName);
    this.software = (this.software || []).slice().sort(byName);
    this.departments = (this.departments || []).slice().sort(byName);
    this.employees = (this.employees || []).slice().sort(byName);
    // LOG: Empleados cargados
    console.log('[VALIDACIÓN] Empleados cargados:', this.employees);
    if (!this.employees || this.employees.length === 0) {
      console.warn('[VALIDACIÓN] No se cargaron empleados. Revisa la respuesta de loadCatalogs.');
    }
    this.projectFiltersService.setEmployees(this.employees);
    // LOG: Empleados en el servicio
    console.log('[VALIDACIÓN] Empleados en servicio (projectFiltersService.employeesAll):', this.projectFiltersService.employeesAll);

    // Esperar a que los empleados estén cargados antes de pedir managers
    const managerOptionsRaw = await this.projectFiltersService.getManagerFilterOptions();
    console.log('[VALIDACIÓN] Opciones crudas de managerOptions:', managerOptionsRaw);
    this.managerOptionsAll = (managerOptionsRaw || []).slice().sort(byName);
    // mantener managerOptions por compatibilidad inicial
    this.managerOptions = this.managerOptionsAll.slice();
    console.log('[VALIDACIÓN] ManagerOptions cargados (final):', this.managerOptionsAll);

    // Validar coincidencias de IDs entre pmIds y empleados
    if (Array.isArray(this.managerOptions) && this.managerOptions.length === 0) {
      console.warn('[VALIDACIÓN] managerOptions está vacío. Verifica que los pmIds de los proyectos coincidan con los IDs de empleados.');
    }
    await this.loadProjects();
    // El modal de creación es manejado por el CreateProjectComponent
  }

  

// --- Mostrar modal de detalles ---
openProjectDetails(idOrProject: any) {
// Acepte una identificación (número) o un objeto de proyecto completo. Prefiera la identificación cuando sea posible para que los detalles se obtengan del backend.
  if (typeof idOrProject === 'number' || typeof idOrProject === 'string') {
    this.selectedProject = null;
    this.selectedProjectId = Number(idOrProject);
    this.debug('🟢 Abriendo modal del proyecto (by id):', this.selectedProjectId);
  } else {
// Si la persona que llama pasa un objeto de proyecto completo, abrimos modal inmediatamente con él para una experiencia de usuario instantánea
    // y aún configura selectedProjectId para que el componente de detalles pueda, opcionalmente, volver a buscar/enriquecer los datos.
    this.selectedProject = idOrProject;
    this.selectedProjectId = idOrProject && idOrProject.id ? Number(idOrProject.id) : null;
    this.debug('🟢 Abriendo modal del proyecto (by object):', this.selectedProject && this.selectedProject.id ? this.selectedProject.id : this.selectedProject);
  }
}

closeProjectDetails() {
  this.selectedProject = null;
  this.selectedProjectId = null;
  this.debug('🔴 Cerrando modal');
  this.loadProjects(); // Recarga la lista automáticamente
}


  // ====== Modal: abrir/cerrar y backdrop ======
  openCreateModal(): void {
    this.isCreateOpen = true;
    setTimeout(() => {
      this.createProjectRef?.openModal();
      this.populateCreateModalSelects();
    });
  }

  closeCreateModal(): void {
    this.isCreateOpen = false;
  }

  onBackdropClick(e: Event): void {
    this.closeCreateModal();
  }

  

  private populateCreateModalSelects(): void {
    // Helper para setear opciones
    const setOptions = (sel: HTMLSelectElement | null, items: Array<{ value: string | number; label: string }>) => {
      if (!sel) return;
      sel.innerHTML = '';
      const frag = document.createDocumentFragment();
      items.forEach(it => {
        const opt = document.createElement('option');
        opt.value = String(it.value);
        opt.textContent = it.label;
        frag.appendChild(opt);
      });
      sel.appendChild(frag);
    };

    const byName = (a: any, b: any) => (String(a.label)||'').localeCompare(String(b.label)||'', undefined, { sensitivity: 'base' });

    // Enums
    setOptions(document.querySelector('#p_areaUnit') as HTMLSelectElement,
      (this.enums.areaUnit || []).map(v => ({ value: v, label: this.displayEnum(v) }))
    );
    setOptions(document.querySelector('#p_type') as HTMLSelectElement,
      (this.enums.type || []).map(v => ({ value: v, label: this.displayEnum(v) }))
    );
    setOptions(document.querySelector('#p_status') as HTMLSelectElement,
      (this.enums.status || []).map(v => ({ value: v, label: this.displayEnum(v) }))
    );
    setOptions(document.querySelector('#p_scope') as HTMLSelectElement,
      (this.enums.scope || []).map(v => ({ value: v, label: this.displayEnum(v) }))
    );

    // Catálogos: offices, clients, software
    setOptions(document.querySelector('#p_office') as HTMLSelectElement,
      (this.offices || []).map(o => ({ value: o.id, label: o.name })).sort(byName)
    );
    setOptions(document.querySelector('#p_client') as HTMLSelectElement,
      (this.clients || []).map(c => ({ value: c.id, label: c.name })).sort(byName)
    );
    setOptions(document.querySelector('#p_software') as HTMLSelectElement,
      (this.software || []).map(s => ({ value: s.id, label: s.name })).sort(byName)
    );

    // PMs y Team
    const pmList = this.projectManagers.map(pm => ({ value: pm.id, label: pm.name })).sort(byName);
    setOptions(document.querySelector('#p_pms') as HTMLSelectElement, pmList);
    const teamList = (this.employees || []).map(e => ({ value: e.id, label: e.name })).sort(byName);
    setOptions(document.querySelector('#p_team') as HTMLSelectElement, teamList);
  }

  // ---- Traer los roles para autenticar (UI gating) ----
  get isOwner(): boolean { try { return this.auth.isOwner(); } catch { return false; } }
  get isAdmin(): boolean { try { return this.auth.isAdmin(); } catch { return false; } }
  get isAdminOrOwner(): boolean { return this.isAdmin || this.isOwner; }

  /** Carga todos los catálogos desde el backend */
  async loadCatalogs() {
    try {
      const data = await this.catalogsService.loadAllCatalogs();
      const byName = (a: any, b: any) =>
        (a?.name || '').toString().localeCompare((b?.name || '').toString(), undefined, { sensitivity: 'base' });

      this.offices = (data.offices || []).slice().sort(byName);
      this.clients = (data.clients || []).slice().sort(byName);
      this.software = (data.software || []).slice().sort(byName);
      this.departments = (data.departments || []).slice().sort(byName);
      this.jobPositions = (data.jobPositions || []).slice().sort(byName);
      this.employees = (data.employees || []).slice().sort(byName);
      this.projectFiltersService.setEmployees(this.employees); //Configurar filtros con los empleados cargados

      this.debug('✅ Catálogos cargados correctamente:', data);
    } catch (e) {
      console.error('Error loading catalogs:', e);
    }
  }



// ============================================================
  // LÓGICA DE FILTROS (correcciones aplicadas)
  // ============================================================

  /** Devuelve los Project Managers usando el servicio (no llama métodos privados) */
  get projectManagers(): Employee[] {
    // El servicio expone filterEmployees; pedimos onlyPM=true
    return this.projectFiltersService.filterEmployees({ q: '', job: '', dept: '', onlyPM: true })
      .slice() // copia
      .sort((a: Employee, b: Employee) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
  }

  /** Rellena dinámicamente el filtro de Managers (solo de los proyectos cargados) */
  fillManagerFilter(): void {
    // Extrae los PMs de los proyectos actualmente cargados
    const pmIdSet = new Set<number>();
    (this.projects || []).forEach((p: any) => {
      if (Array.isArray(p.pmIds)) {
        p.pmIds.forEach((id: number) => pmIdSet.add(Number(id)));
      }
    });
    // Busca los empleados que coinciden con esos IDs
    this.managerOptionsFiltered = this.employees
      .filter(e => pmIdSet.has(Number(e.id)))
      .map(e => ({ id: e.id, name: e.name }))
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
    this.debug('Managers disponibles (solo proyectos listados):', this.managerOptionsFiltered);
  }

  displayEnum(v: string | null | undefined): string {
    return String(v ?? '').replace(/_/g, ' ');
  }

  // ============================================================
  // FUNCIONALIDAD DE PROYECTOS (sin cambios)
  // ============================================================

  applySearchFromUI(): void {
    this.searchState.filters = {
      officeId: this.selectedOffice,
      clientId: this.selectedClient,
      softwareId: this.selectedSoftware,
      status: this.selectedStatus,
      type: this.selectedType,
      scope: this.selectedScope,
      managerId: this.selectedManager,
      departmentId: this.selectedDepartment,
      q: this.searchText?.trim() || ''
    };
    this.searchState.size = this.pageSize || 20;
    this.searchState.page = 0;
    this.loadProjects();
    
  }

  clearFilters(): void {
    this.selectedOffice = '';
    this.selectedClient = '';
    this.selectedSoftware = '';
    this.selectedDepartment = '';
    this.selectedManager = '';
    this.selectedStatus = '';
    this.selectedType = '';
    this.selectedScope = '';
    this.searchText = '';
    this.searchState.filters = {};
    this.searchState.page = 0;
    this.loadProjects();
  }

onPageSizeChange() {
  this.searchState.size = this.pageSize;
  this.searchState.page = 0;
  this.loadProjects();
}



  //FILTER SEARCH
  // Auto-search when user types >= 3 chars; also when cleared to empty
  onSearchChange(value: string): void {
    const text = (value || '').trim();
    // Debounce to avoid spamming the backend
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      // Ahora aplica búsqueda con cualquier cambio, incluso 1 letra o número
      this.applySearchFromUI();
    }, 300);
  }

  // Handler genérico para selects: aplica búsqueda inmediata
  onSimpleFilterChange(): void {
    // Actualizar los filtros con los valores actuales de los selects
    this.searchState.filters = {
      officeId: this.selectedOffice,
      clientId: this.selectedClient,
      softwareId: this.selectedSoftware,
      status: this.selectedStatus,
      type: this.selectedType,
      scope: this.selectedScope,
      managerId: this.selectedManager,
      departmentId: this.selectedDepartment,
      q: this.searchText?.trim() || ''
    };
    this.searchState.page = 0;
    this.loadProjects();
  }

  private buildSearchQuery(): any {
    const { page, sort, filters } = this.searchState;
    const query: any = {
      page: page,
      size: this.pageSize,
      sort: sort
    };

    // Enviar solo claves canónicas. Si el filtro es un array, convertir a CSV (adaptar si el backend espera otro formato)
    Object.entries(filters).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') return;
      if (Array.isArray(value)) {
        if (value.length === 0) return;
        // Convertir arrays a CSV para parámetros repetidos (ajusta según la API)
        query[key] = value.join(',');
      } else {
        query[key] = value;
      }
    });
    return query;
  }

// CARGA DE PROYECTOS, AQUI LLAMO EL SERVICIO QUE ESTA EN PROJECT.SERVICE.TS
  async loadProjects() {
    try {
      const query = this.buildSearchQuery();
      // Mostrar el query en la UI para depuración
      (window as any).__lastProjectQuery = query;
      this.debug('🔍 buildSearchQuery:', query);
      const { items, pageInfo } = await this.projectService.loadProjects(query);
      // Mostrar la respuesta en la UI para depuración
      (window as any).__lastProjectResponse = { items, pageInfo };
      this.debug('✅ Projects loaded:', items);
      this.debug('📄 PageInfo:', pageInfo);
      this.projects = Array.isArray(items) ? items : [];
      this.pageInfo = pageInfo;
      // LOG: Proyectos cargados
      console.log('[VALIDACIÓN] Proyectos cargados:', this.projects);
      if (!this.projects || this.projects.length === 0) {
        console.warn('[VALIDACIÓN] No se cargaron proyectos. Revisa la respuesta de projectService.loadProjects.');
      }
      // Actualizar el filtro de Project Manager
      this.fillManagerFilter();
    } catch (error) {
      this.debug('❌ Error loading projects:', error);
      console.error('❌ Error loading projects:', error);
    }
  }



  renderPagerInfo(): string {
    const { number, totalPages } = this.pageInfo;
    // Show compact page indicator like "1 / 3" (with spaces around slash)
    return totalPages && totalPages > 0 ? `${number + 1} / ${totalPages}` : '-';
  }

  prevPage(): void {
    if (this.pageInfo.number > 0) {
      this.searchState.page--;
      this.loadProjects();
    }
  }

  nextPage(): void {
    if (this.pageInfo.number < this.pageInfo.totalPages - 1) {
      this.searchState.page++;
      this.loadProjects();
    }
  }

  toggleSort(): void {
    const dir = this.getSortDir() === 'asc' ? 'desc' : 'asc';
    this.searchState.sort = `projectCode,${dir}`;
    this.searchState.page = 0;
    this.loadProjects();
  }

  getSortDir(): 'asc' | 'desc' {
    return (this.searchState.sort || '').toLowerCase().includes(',desc') ? 'desc' : 'asc';
  }

  trackByProject = (_: number, p: any) => p?.id ?? p?.projectCode ?? _;

  

  statusToClass(status: string): string {
    const v = (status || '').toLowerCase();
    if (v.includes('progress')) return 'in-progress';
    if (v.includes('complete')) return 'completed';
    if (v.includes('pause')) return 'paused';
    if (v.includes('cancel')) return 'cancelled';
    return 'in-progress';
  }

  /**
   * Dynamic modal builder: opens a DOM modal with project details fetched from backend.
   * Adapted from provided snippet and converted to TypeScript using injected services.
   * Does not change backend logic; simply creates an overlay and fills it with formatted data.
   */
  async openProjectModal(id: number): Promise<void> {
    try {
      // simple cache on the component instance
      if (!(this as any)._modalCache) (this as any)._modalCache = {};
      const cache: any = (this as any)._modalCache;

      // LIMPIA el cache antes de recargar datos
      cache.employees = [];
      cache.employeesById = new Map();
      // Si tienes cache.projectDetails o similar, límpialo también:
      if (cache.projectDetails) {
        delete cache.projectDetails[id];
      }

      // Ensure employees cache (se recarga siempre)
      try {
        if (this.catalogsService && typeof (this.catalogsService as any).getEmployees === 'function') {
          cache.employees = await (this.catalogsService as any).getEmployees();
        } else {
          cache.employees = [];
        }
        cache.employeesById = new Map<number, any>((cache.employees || []).map((e: any) => [e.id, e]));
      } catch (e) {
        cache.employees = [];
        cache.employeesById = new Map();
      }

      // fetch project from backend via projectService
      const p: any = await this.projectService.getProjectById(Number(id));

      const assignedIds = Array.isArray(p.employeeIds) ? p.employeeIds : [];
      const assigned = assignedIds
        .map((i: any) => cache.employeesById.get(Number(i)))
        .filter((x: any) => Boolean(x));

      const pmIds = Array.isArray(p.pmIds) ? p.pmIds.map(Number) : [];
      const isLikelyPM = (employee: any) => (String(employee?.roles || '').toLowerCase().includes('pm'));
      const isAllowedTeamEmployee = (employee: any) => {
        const allowedRoles = ['Drafter', 'Engineer', 'Senior Engineer', 'Designer'];
        return allowedRoles.includes(String(employee?.roles || '').toLowerCase());
      };

      const pms = pmIds.length
        ? pmIds.map((i: number) => cache.employeesById.get(i)).filter((x: any) => Boolean(x))
        : assigned.filter((e: any) => isLikelyPM(e));

      const team = assigned
        .filter((e: any) => !pms.some((pm: any) => pm && pm.id === e.id))
        .filter((e: any) => isAllowedTeamEmployee(e));

      // Small helper to format values
      const fmt = (v: any) => (v === null || v === undefined || v === '') ? '-' : String(v);

      // status -> class
      const statusToClass = (s: any) => {
        const v = String(s || '').toLowerCase();
        if (v.includes('progress')) return 'in-progress';
        if (v.includes('complete')) return 'completed';
        if (v.includes('pause')) return 'paused';
        if (v.includes('cancel')) return 'cancelled';
        return 'in-progress';
      };

      // Build DOM
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';
      backdrop.style.position = 'fixed';
      backdrop.style.inset = '0';
      backdrop.style.background = 'rgba(0,0,0,0.45)';
      backdrop.style.zIndex = '2000';

      const container = document.createElement('div');
      container.className = 'modal-content';
      container.style.zIndex = '2001';

      // header
      const header = document.createElement('div');
      header.className = 'pd-header';

      const titleWrap = document.createElement('div');
      titleWrap.className = 'pd-title';

      const codeBadge = document.createElement('div');
      codeBadge.className = 'code-badge';
      const codeDot = document.createElement('span');
      codeDot.className = 'code-dot';
      const codeText = document.createElement('span');
      codeText.textContent = fmt(p.projectCode);
      codeBadge.appendChild(codeDot);
      codeBadge.appendChild(codeText);

      const nameDiv = document.createElement('div');
      nameDiv.className = 'pc-name';
      nameDiv.title = p.name || '';
      nameDiv.textContent = p.name || '-';

      titleWrap.appendChild(codeBadge);
      titleWrap.appendChild(nameDiv);

      const statusSpan = document.createElement('span');
      statusSpan.className = 'status-pill ' + statusToClass(p.status);
      statusSpan.textContent = fmt(p.status);

      header.appendChild(titleWrap);
      header.appendChild(statusSpan);

      // meta chips
      const meta = document.createElement('div');
      meta.className = 'pd-meta';
      const chip = (label: string, value: any) => {
        const c = document.createElement('span');
        c.className = 'chip';
        c.textContent = `${label}: ${fmt(value)}`;
        return c;
      };
      meta.appendChild(chip('Office', p.officeName));
      meta.appendChild(chip('Client', p.clientName));
      meta.appendChild(chip('Software', p.softwareName));
      meta.appendChild(chip('Type', p.projectType));
      meta.appendChild(chip('Scope', p.scope));

      const hr = document.createElement('hr');
      hr.className = 'pd-divider';

      // assigned PMs list
      const pmTitle = document.createElement('h3');
      pmTitle.textContent = 'Assigned Project Managers';
      const pmList = document.createElement('ul');
      pmList.className = 'employee-list';
      pms.forEach((pm: any) => {
        const li = document.createElement('li');
        const avatar = document.createElement('span');
        avatar.className = 'avatar';
        avatar.textContent = String(pm.Name || '').charAt(0) || '?';
        li.appendChild(avatar);
        const txt = document.createElement('span');
        txt.textContent = pm.Name || '-';
        li.appendChild(txt);
        pmList.appendChild(li);
      });

      // team list
      const teamTitle = document.createElement('h3');
      teamTitle.textContent = 'Project Team';
      const teamList = document.createElement('ul');
      teamList.className = 'employee-list';
      team.forEach((m: any) => {
        const li = document.createElement('li');
        const avatar = document.createElement('span');
        avatar.className = 'avatar';
        avatar.textContent = String(m.name || '').charAt(0) || '?';
        li.appendChild(avatar);
        const txt = document.createElement('span');
        txt.textContent = `${m.name || '-'} (${m.roles || ''})`;
        li.appendChild(txt);
        teamList.appendChild(li);
      });

      const closeBtn = document.createElement('button');
      closeBtn.className = 'close-btn';
      closeBtn.textContent = 'Close';
      closeBtn.onclick = () => {
        document.body.removeChild(backdrop);
        document.body.removeChild(container);
      };

      // assemble
      container.appendChild(header);
      container.appendChild(meta);
      container.appendChild(hr);
      container.appendChild(pmTitle);
      container.appendChild(pmList);
      container.appendChild(teamTitle);
      container.appendChild(teamList);
      container.appendChild(closeBtn);

      // add to DOM
      document.body.appendChild(backdrop);
      document.body.appendChild(container);

      // clicking backdrop closes
      backdrop.addEventListener('click', () => {
        if (document.body.contains(backdrop)) document.body.removeChild(backdrop);
        if (document.body.contains(container)) document.body.removeChild(container);
      });

    } catch (err) {
      console.error('Error opening project modal:', err);
    }
  }

  handleProjectDetailsClose(event?: any) {
    if (event && event.reopenDetails && event.projectId) {
      // Reabrir el modal de detalles con el id actualizado
      setTimeout(() => this.openProjectDetails(event.projectId), 100);
      return;
    }
    this.closeProjectDetails();
  }

}