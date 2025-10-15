import { Component, OnInit, AfterViewInit, OnDestroy, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../core/components/header/header';
import { SubmenuComponent } from '../../core/components/submenu/submenu';
import { FagregarMiembroComponent } from '../../core/components/fagregar-miembro/fagregar-miembro';
import { EmployeeApi } from './team-api';
import { filterEmployees } from './team-utils';
import { VALID_PAGE_SIZES, getInitialPageSize, readFiltersFromUrl, syncFiltersToUrl } from './team-pagination';
import { AuthService } from '../../core/services/auth.service';

type Employee = any;
type Filters = { query: string; department: string; jobPosition: string; office: string; state: string; role: string };

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [CommonModule, HeaderComponent, SubmenuComponent, FagregarMiembroComponent],
  templateUrl: './team.html',
  styleUrls: ['./team.scss'],
  encapsulation: ViewEncapsulation.None
})
export class TeamComponent implements OnInit, AfterViewInit, OnDestroy {
  private auth = inject(AuthService);
  private api!: EmployeeApi;

  // Permissions
  private get isOwner() { return this.auth.hasRole('OWNER'); }
  private get isAdmin() { return this.auth.hasRole('ADMIN'); }
  private get canAddMember() { return this.isOwner || this.isAdmin; }

  // Element refs
  private elSearch?: HTMLInputElement;
  private elDept?: HTMLSelectElement;
  private elJob?: HTMLSelectElement;
  private elOffice?: HTMLSelectElement;
  private elState?: HTMLSelectElement;
  private elRole?: HTMLSelectElement;
  private elPageSize?: HTMLSelectElement;
  private elStatus?: HTMLElement;
  private elError?: HTMLElement;
  private elResults?: HTMLElement;
  private elPagination?: HTMLElement;

  // Filters and state
  filters: Filters = { query: '', department: '', jobPosition: '', office: '', state: '', role: '' };
  state: { all: Employee[]; filtered: Employee[]; page: number; pageSize: number; lastLoadedAt?: number } = {
    all: [],
    filtered: [],
    page: 1,
    pageSize: 10
  };
  pageSizes = VALID_PAGE_SIZES;

  // Catalogs and add-member options
  catalogs: { departments: any[]; jobs: any[]; offices: any[] } = { departments: [], jobs: [], offices: [] };
  allowedRoleOptions: string[] = ['USER', 'ADMIN'];

  ngOnInit(): void {
    const base = this.auth.getApiBase();
    this.api = new EmployeeApi(base, this.auth);

    // Allow OWNER to create OWNER users; admins can create USER/ADMIN only
    this.allowedRoleOptions = this.isOwner ? ['USER', 'ADMIN', 'OWNER'] : ['USER', 'ADMIN'];

    // Read filters/pagination from URL/local storage
    const url = readFiltersFromUrl();
    this.filters = {
      query: url.q || '',
      department: url.department || '',
      jobPosition: url.jobPosition || '',
      office: url.office || '',
      state: url.state || '',
      role: url.role || ''
    };
    this.state.page = url.page || 1;
    this.state.pageSize = url.size ?? getInitialPageSize();

    // Load data
    this.refreshData();
    this.loadCatalogs();
  }

  ngAfterViewInit(): void {
    // Cache DOM elements
    this.elSearch = document.getElementById('searchInput') as HTMLInputElement | undefined;
    this.elDept = document.getElementById('departmentFilter') as HTMLSelectElement | undefined;
    this.elJob = document.getElementById('jobFilter') as HTMLSelectElement | undefined;
    this.elOffice = document.getElementById('officeFilter') as HTMLSelectElement | undefined;
    this.elState = document.getElementById('stateFilter') as HTMLSelectElement | undefined;
    this.elRole = document.getElementById('roleFilter') as HTMLSelectElement | undefined;
    this.elPageSize = document.getElementById('pageSize') as HTMLSelectElement | undefined;
    this.elStatus = document.getElementById('status') as HTMLElement | undefined;
    this.elError = document.getElementById('error') as HTMLElement | undefined;
    this.elResults = document.getElementById('results') as HTMLElement | undefined;
    this.elPagination = document.getElementById('pagination') as HTMLElement | undefined;

    // Initialize UI values
    if (this.elSearch) this.elSearch.value = this.filters.query;
    if (this.elPageSize) this.elPageSize.value = String(this.state.pageSize);

    // Attach listeners
    this.elSearch?.addEventListener('input', (e: any) => {
      this.onSearchChange(e.target.value || '');
      this.updateUrl();
      this.render();
    });
    this.elDept?.addEventListener('change', (e: any) => {
      this.filters.department = e.target.value || '';
      this.onFilterChange();
      this.updateUrl();
      this.render();
    });
    this.elJob?.addEventListener('change', (e: any) => {
      this.filters.jobPosition = e.target.value || '';
      this.onFilterChange();
      this.updateUrl();
      this.render();
    });
    this.elOffice?.addEventListener('change', (e: any) => {
      this.filters.office = e.target.value || '';
      this.onFilterChange();
      this.updateUrl();
      this.render();
    });
    this.elState?.addEventListener('change', (e: any) => {
      this.filters.state = e.target.value || '';
      this.onFilterChange();
      this.updateUrl();
      this.render();
    });
    this.elRole?.addEventListener('change', (e: any) => {
      this.filters.role = e.target.value || '';
      this.onFilterChange();
      this.updateUrl();
      this.render();
    });
    this.elPageSize?.addEventListener('change', (e: any) => {
      const size = parseInt(e.target.value, 10) || this.pageSizes[0];
      this.onPageSizeChange(size);
      localStorage.setItem('employees.pageSize', String(size));
      this.updateUrl();
      this.render();
    });

    const btnClear = document.getElementById('limpiarfiltros');
    btnClear?.addEventListener('click', () => {
      this.onClearFilters();
      if (this.elSearch) this.elSearch.value = '';
      if (this.elDept) this.elDept.value = '';
      if (this.elJob) this.elJob.value = '';
      if (this.elOffice) this.elOffice.value = '';
      if (this.elState) this.elState.value = '';
      if (this.elRole) this.elRole.value = '';
      this.updateUrl();
      this.render();
    });

    const btnRefresh = document.getElementById('actualizardatos');
    btnRefresh?.addEventListener('click', async () => {
      await this.refreshData();
      this.render();
    });

    // Hide add member if not allowed
    const addHost = document.getElementById('addMemberHost');
    if (addHost && !this.canAddMember) addHost.style.display = 'none';

    // Populate selects and initial render
    this.populateCatalogSelects();
    this.populateStateOptions();
    this.populateRoleOptions();
    this.render();
  }

  ngOnDestroy(): void {
    // No persistent subscriptions to clean here
  }

  private updateUrl() {
    syncFiltersToUrl({
      q: this.filters.query || undefined,
      department: this.filters.department || undefined,
      job: this.filters.jobPosition || undefined,
      office: this.filters.office || undefined,
      state: this.filters.state || undefined,
      role: this.filters.role || undefined,
      page: this.state.page > 1 ? String(this.state.page) : undefined,
      size: VALID_PAGE_SIZES.includes(this.state.pageSize) ? String(this.state.pageSize) : undefined
    });
  }

  private setStatus(msg: string) {
    if (this.elStatus) this.elStatus.textContent = msg;
  }

  private showError(msg: string) {
    if (this.elError) {
      this.elError.textContent = msg;
      (this.elError as HTMLElement).style.display = '';
    }
  }
  private hideError() {
    if (this.elError) (this.elError as HTMLElement).style.display = 'none';
  }

  private getEmployeeRoles(e: any): string[] {
    const arr = (Array.isArray(e?.roles)
      ? e.roles
      : (Array.isArray(e?.account?.roles)
          ? e.account.roles
          : (Array.isArray(e?.accountRoles)
              ? e.accountRoles
              : (Array.isArray(e?.account?.authorities)
                  ? e.account.authorities
                  : []))));
    const mapped = (arr as any[])
      .map((r: any) => typeof r === 'string' ? r : (r?.name || r?.role || r?.authority || r?.rol || r?.roleName || r?.label))
      .filter(Boolean) as string[];
    const single = (e?.accountRole || e?.account?.role);
    const singles = single ? [String(single)] : [];
    return [...new Set([...mapped, ...singles].map(x => String(x).toUpperCase()))];
  }

  // Actions (stubs)
  private onEditEmployee(id: string) {
    console.log('Editar empleado', id);
  }
  private async onDeleteEmployee(id: string) {
    const target = (this.state.filtered as any[]).find(e => String(e.id || '') === String(id));
    const targetRoles = this.getEmployeeRoles(target);
    const targetIsOwner = targetRoles.includes('OWNER');
    if (this.isAdmin && targetIsOwner) {
      alert('No autorizado: un ADMIN no puede eliminar a un OWNER.');
      return;
    }
    if (!confirm('¿Eliminar este empleado? Esta acción no se puede deshacer.')) return;
    try {
      await this.api.deleteEmployee(Number(id));
      await this.refreshData();
      this.render();
    } catch (e: any) {
      alert(e?.message || 'Error eliminando empleado');
    }
  }

  async refreshData() {
    this.setStatus('Cargando empleados...');
    this.hideError();
    try {
      const data = await this.api.fetchEmployees();
      this.state.all = Array.isArray(data) ? data : [];
      this.state.lastLoadedAt = Date.now();
      this.populateStateOptions();
      this.populateRoleOptions();
      this.applyFilters();
      this.render();
    } catch (err: any) {
      this.showError(err?.message || 'Error cargando empleados');
    }
  }

  async loadCatalogs() {
    const base = this.auth.getApiBase();
    const [deps, jobs, offs] = await Promise.all([
      this.api.getCatalog(`${base}/departments`),
      this.api.getCatalog(`${base}/job-positions`),
      this.api.getCatalog(`${base}/offices`)
    ]);
    this.catalogs.departments = deps;
    this.catalogs.jobs = jobs;
    this.catalogs.offices = offs;
    this.populateCatalogSelects();
  }

  applyFilters() {
    // Filtrar y ORDENAR antes de mostrar
    this.state.filtered = filterEmployees(this.state.all, this.filters);
    const key = (e: any) => (e?.name ?? e?.fullName ?? e?.username ?? '').toString();
    this.state.filtered.sort((a: any, b: any) => key(a).localeCompare(key(b), 'es', { sensitivity: 'base' }));

    // Ajustar página si se sale del rango
    const totalPages = this.totalPages;
    if (this.state.page > totalPages) this.state.page = 1;
  }

  onSearchChange(value: string) {
    this.filters.query = value;
    this.applyFilters();
  }
  onFilterChange() {
    this.applyFilters();
  }
  onClearFilters() {
    this.filters = { query: '', department: '', jobPosition: '', office: '', state: '', role: '' };
    this.applyFilters();
  }
  onPageSizeChange(size: number) {
    this.state.pageSize = size;
    this.state.page = 1;
  }

  get pagedResults() {
    const start = (this.state.page - 1) * this.state.pageSize;
    return this.state.filtered.slice(start, start + this.state.pageSize);
  }
  get totalPages() {
    return Math.max(1, Math.ceil(this.state.filtered.length / this.state.pageSize));
  }
  setPage(page: number) {
    this.state.page = page;
    this.updateUrl();
    this.renderPagination();
    this.renderResults();
  }

  private render() {
    this.renderResults();
    this.renderPagination();
    const total = this.state.filtered.length;
    if (total === 0) this.setStatus('Sin resultados');
    else {
      const start = (this.state.page - 1) * this.state.pageSize + 1;
      const end = Math.min(start - 1 + this.state.pageSize, total);
      this.setStatus(`Mostrando ${start}-${end} de ${total} empleados`);
    }
  }

  private renderResults() {
    if (!this.elResults) return;
    const items = this.pagedResults;
    if (!items.length) {
      this.elResults.innerHTML = '';
      return;
    }
    const html = items.map((e: any) => {
      const name = e.name ?? e.fullName ?? e.username ?? 'Sin nombre';
      const dept = e.departmentName ?? e.department ?? '';
      const job = e.jobPositionName ?? e.jobPosition ?? '';
      const office = e.officeName ?? e.office ?? '';
      const state = e.state ?? e.status ?? '';
      const email = e.email ?? e.mail ?? '';
      const rate = e.billableRate ?? e.rate ?? '';
      const accountUsername = e.accountUsername ?? e.username ?? '';
      const roles = this.getEmployeeRoles(e);
      const isTargetOwner = roles.includes('OWNER');
      const canEdit = this.isOwner || (this.isAdmin && !isTargetOwner);
      const canDelete = this.isOwner || (this.isAdmin && !isTargetOwner);
      const norm = (s: string) => String(s || '').toUpperCase().replace(/[^A-Z0-9]+/g, '-');
      const stateChip = state ? `<span class="chip chip-state state-${norm(state)}">${state}</span>` : '';
      const roleChips = roles.map(r => `<span class="chip chip-role role-${norm(r)}">${r}</span>`).join('');
      const initials = String(name).trim().split(/\s+/).map((p: string) => p[0] || '').slice(0,2).join('').toUpperCase();
      return `
        <div class="emp-item">
          <div class="emp-head">
            <span class=\"avatar\" aria-hidden=\"true\">${initials || 'E'}</span>
            <span class="emp-name">${name}</span>
            <span class="emp-tags">
              <em>${dept || 'Sin departamento'}</em>
              <em>• ${job || 'Sin cargo'}</em>
              <em>• ${office || 'Sin oficina'}</em>
            </span>
            <span class="emp-right">${stateChip}${roleChips}</span>
          </div>
          <div class="emp-body">
            <div class="meta">
              <span>Email: ${email || '-'}</span>
              <span>Tarifa: ${rate !== '' ? rate : '-'}</span>
              <span>Usuario: ${accountUsername || '-'}</span>
            </div>
            <div class="actions">
              ${canEdit ? `<button class="btn btn-edit" data-action="edit" data-id="${e.id || ''}">Editar</button>` : ''}
              ${canDelete ? `<button class="btn btn-delete" data-action="delete" data-id="${e.id || ''}">Eliminar</button>` : ''}
              ${this.isAdmin && isTargetOwner ? `<span class="muted">Acciones restringidas (OWNER)</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
    this.elResults.innerHTML = html;
    this.elResults.querySelectorAll('button[data-action]').forEach(btn => {
      btn.addEventListener('click', (ev: any) => {
        const action = ev.currentTarget?.getAttribute('data-action');
        const id = ev.currentTarget?.getAttribute('data-id');
        if (action === 'edit') this.onEditEmployee(id);
        if (action === 'delete') this.onDeleteEmployee(id);
      });
    });
  }

  private renderPagination() {
    if (!this.elPagination) return;
    const totalPages = this.totalPages;
    const current = this.state.page;
    const makeBtn = (label: string, page: number, disabled = false, active = false) =>
      `<button class="page-btn${active ? ' active' : ''}" data-page="${page}" ${disabled ? 'disabled' : ''}>${label}</button>`;
    const parts: string[] = [];
    parts.push(makeBtn('«', 1, current === 1));
    parts.push(makeBtn('‹', Math.max(1, current - 1), current === 1));
    const windowSize = 3;
    const start = Math.max(1, current - windowSize);
    const end = Math.min(totalPages, current + windowSize);
    for (let p = start; p <= end; p++) parts.push(makeBtn(String(p), p, false, p === current));
    parts.push(makeBtn('›', Math.min(totalPages, current + 1), current === totalPages));
    parts.push(makeBtn('»', totalPages, current === totalPages));
    this.elPagination.innerHTML = parts.join('');
    this.elPagination.querySelectorAll('button.page-btn').forEach(btn => {
      btn.addEventListener('click', (e: any) => {
        const page = parseInt(e.currentTarget?.getAttribute('data-page') || '1', 10);
        if (!isNaN(page)) this.setPage(page);
      });
    });
  }

  private populateCatalogSelects() {
    const fill = (el: HTMLSelectElement | undefined, items: any[], getLabel: (x: any) => string) => {
      if (!el) return;
      const current = el.value;
      const first = el.querySelector('option');
      el.innerHTML = '';
      if (first) el.appendChild(first);
      const options = items
        .map((x: any) => getLabel(x))
        .filter((v: any, idx: number, arr: any[]) => v && arr.indexOf(v) === idx)
        .sort((a: string, b: string) => a.localeCompare(b));
      for (const opt of options) {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        el.appendChild(o);
      }
      if (current) el.value = current;
    };
    const getName = (x: any) => (typeof x === 'string' ? x : x?.name || x?.label || x?.title || x?.descripcion || '');
    fill(this.elDept, this.catalogs.departments as any, getName);
    fill(this.elJob, this.catalogs.jobs as any, getName);
    fill(this.elOffice, this.catalogs.offices as any, getName);
    if (this.elDept && this.filters.department) this.elDept.value = this.filters.department;
    if (this.elJob && this.filters.jobPosition) this.elJob.value = this.filters.jobPosition;
    if (this.elOffice && this.filters.office) this.elOffice.value = this.filters.office;
  }

  private populateStateOptions() {
    if (!this.elState) return;
    const states = (this.state.all as any[])
      .map(e => e.state ?? e.status ?? '')
      .filter(Boolean)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .sort((a: string, b: string) => a.localeCompare(b));
    const first = this.elState.querySelector('option');
    this.elState.innerHTML = '';
    if (first) this.elState.appendChild(first);
    for (const s of states) {
      const o = document.createElement('option');
      o.value = s;
      o.textContent = s;
      this.elState.appendChild(o);
    }
    if (this.filters.state) this.elState.value = this.filters.state;
  }

  private populateRoleOptions() {
    if (!this.elRole) return;
    const rolesSet = new Set<string>();
    for (const e of this.state.all as any[]) {
      for (const r of this.getEmployeeRoles(e)) {
        if (r) rolesSet.add(r);
      }
    }
    const first = this.elRole.querySelector('option');
    this.elRole.innerHTML = '';
    if (first) this.elRole.appendChild(first);
    Array.from(rolesSet)
      .sort((a, b) => a.localeCompare(b))
      .forEach(r => {
        const o = document.createElement('option');
        o.value = r;
        o.textContent = r;
        this.elRole!.appendChild(o);
      });
    if (this.filters.role) this.elRole.value = this.filters.role;
  }
}