import {
  Component,
  OnInit,
  OnDestroy,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Subscription, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { EditarMiembroComponent } from '../../core/components/editar-miembro/editar-miembro'; // Ajusta ruta si hace falta
import { ConfirmModalComponent } from '../../core/components/confirm-modal/confirm-modal';
import { EmployeeApi } from './team-api';
import { filterEmployees } from './team-utils';
import { VALID_PAGE_SIZES, getInitialPageSize, readFiltersFromUrl, syncFiltersToUrl } from './team-pagination';
import { AuthService } from '../../core/services/auth.service';
import { SubmenuComponent } from "../../core/components/submenu/submenu";
import { HeaderComponent } from "../../core/components/header/header";
import { FagregarMiembroComponent } from '../../core/components/fagregar-miembro/fagregar-miembro';
import { WebsocketService } from '../../core/services/websocket.service';

type Employee = any;
type Filters = { query: string; department: string; jobPosition: string; office: string; state: string; role: string };

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, EditarMiembroComponent, SubmenuComponent, HeaderComponent, FagregarMiembroComponent, ConfirmModalComponent],
  templateUrl: './team.html',
  styleUrls: ['./team.scss']
})
export class TeamComponent implements OnInit, OnDestroy {
    showAlert = false;
    alertMessage = '';
    confirmDeleteId: string | number | null = null;
    confirmDeleteName: string = '';
  private auth = inject(AuthService);
  private ws = inject(WebsocketService);
  private api!: EmployeeApi;
  private fb = new FormBuilder();
  constructor() {
    this.filterForm = this.fb.group({
      q: [''],
      department: [''],
      job: [''],
      office: [''],
      state: [''],
      role: [''],
      size: ['']
    });
  }

  // Permissions
  get isOwner() { return !!this.auth.hasRole?.('OWNER'); }
  get isAdmin() { return !!this.auth.hasRole?.('ADMIN'); }
    private tabId = String(Math.random()) + '-' + String(Date.now());
  get isUser() { return !!this.auth.hasRole?.('USER'); }
  get canAddMember() { return this.isOwner || this.isAdmin; }
  get canEditDelete() { return this.isOwner || this.isAdmin; }

  // Reactive form for filters
  filterForm: FormGroup;

  // State
  filters: Filters = { query: '', department: '', jobPosition: '', office: '', state: '', role: '' };
  employees: Employee[] = [];
  filtered: Employee[] = [];
  page = 1;
  pageSize = 10;
  lastLoadedAt?: number;

  // catalogs & allowed roles
  catalogs: { departments: any[]; jobs: any[]; offices: any[] } = { departments: [], jobs: [], offices: [] };
  allowedRoleOptions: string[] = [];
  // Filter options should always allow filtering by any role
  roleFilterOptions: string[] = ['USER', 'ADMIN', 'OWNER'];

  // UI
  loading = false;
  error: string | null = null;

  // Modal
  mostrarModal = false;
  miembroSeleccionado: Employee | null = null;

  // pagination options
  pageSizes = VALID_PAGE_SIZES;

  // subscriptions
  private subs = new Subscription();
  // Debounce para refrescos pasivos (WS/Storage) sin alterar filtros/paginación
  private wsRefresh$ = new Subject<void>();

  // ...existing code...

  ngOnInit(): void {
    const base = this.auth.getApiBase?.() ?? '';
    this.api = new EmployeeApi(base, this.auth);

    // allowed roles
    this.allowedRoleOptions = this.isOwner ? ['USER', 'ADMIN', 'OWNER'] : ['USER', 'ADMIN'];

    // read filters from URL and initial page size
    const url = readFiltersFromUrl();
    this.filters = {
      query: url.q || '',
      department: url.department || '',
      jobPosition: url.jobPosition || '',
      office: url.office || '',
      state: url.state || '',
      role: url.role || ''
    };
    this.page = url.page || 1;
    this.pageSize = url.size ?? getInitialPageSize();

    // populate form initial values
    this.filterForm.patchValue({
      q: this.filters.query,
      department: this.filters.department,
      job: this.filters.jobPosition,
      office: this.filters.office,
      state: this.filters.state,
      role: this.filters.role,
      size: String(this.pageSize)
    });

    // subscribe to reactive filter changes (debounced)
    const s = this.filterForm.valueChanges
      .pipe(debounceTime(250), distinctUntilChanged())
      .subscribe((val: any) => {
        // map form values to internal filters
        this.filters.query = val.q || '';
        this.filters.department = val.department || '';
        this.filters.jobPosition = val.job || '';
        this.filters.office = val.office || '';
        this.filters.state = val.state || '';
        this.filters.role = val.role || '';
        const newSize = parseInt(val.size, 10);
        if (!isNaN(newSize) && VALID_PAGE_SIZES.includes(newSize) && newSize !== this.pageSize) {
          this.pageSize = newSize;
          localStorage.setItem('employees.pageSize', String(this.pageSize));
          this.page = 1;
        }
        this.page = Math.max(1, this.page);
        this.applyFilters();
        this.updateUrl();
      });
    this.subs.add(s);

    // Listener para sincronización en tiempo real entre pestañas
    window.addEventListener('storage', (event) => {
      if ((event.key === 'employee-deleted' || event.key === 'employee-created') && event.newValue) {
        // Notificar refresco pasivo sin tocar filtros
        this.wsRefresh$.next();
      }
    });

    // initial load
    this.refreshData();
    this.loadCatalogs();

    // WebSocket: suscripción pasiva a eventos de empleados
    const wsSub = this.ws.subscribe('employee').subscribe(event => {
      console.log('WS EMPLOYEE EVENT', event);
      // Actualización pasiva: encolamos refresco manteniendo filtros y estado actual
      this.wsRefresh$.next();
    });
    this.subs.add(wsSub);

    // Aplicar debounce para evitar múltiples reloads seguidos
    const wsDebounceSub = this.wsRefresh$
      .pipe(debounceTime(500))
      .subscribe(() => {
        this.refreshData();
      });
    this.subs.add(wsDebounceSub);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  // ------------------ Data loading ------------------
  async refreshData() {
    this.loading = true;
    this.error = null;
    try {
      const data = await this.api.fetchEmployees();
      this.employees = Array.isArray(data) ? data : [];
      this.lastLoadedAt = Date.now();
      // repopulate selects
      this.populateStateOptions();
      this.populateRoleOptions();
      this.applyFilters();
    } catch (err: any) {
      this.error = err?.message || 'Error cargando empleados';
    } finally {
      this.loading = false;
    }
  }

  async loadCatalogs() {
    try {
      const base = this.auth.getApiBase?.() ?? '';
      const [deps, jobs, offs] = await Promise.all([
        this.api.getCatalog?.(`${base}/departments`).catch(()=>[]),
        this.api.getCatalog?.(`${base}/job-positions`).catch(()=>[]),
        this.api.getCatalog?.(`${base}/offices`).catch(()=>[])
      ]);
      this.catalogs.departments = Array.isArray(deps) ? deps : [];
      this.catalogs.jobs = Array.isArray(jobs) ? jobs : [];
      this.catalogs.offices = Array.isArray(offs) ? offs : [];
    } catch {
      // ignore catalog errors silently
      this.catalogs = { departments: [], jobs: [], offices: [] };
    }
  }

  // ------------------ Filtering / Pagination ------------------
  applyFilters(): void {
    this.filtered = filterEmployees(this.employees, {
      query: this.filters.query,
      department: this.filters.department,
      jobPosition: this.filters.jobPosition,
      office: this.filters.office,
      state: this.filters.state,
      role: this.filters.role
    });
    // keep stable sort by name
    this.filtered.sort((a: any, b: any) => (a.name ?? '').localeCompare(b.name ?? '', 'es', { sensitivity: 'base' }));
    // clamp page
    const tp = this.totalPages;
    if (this.page > tp) this.page = tp;
    if (this.page < 1) this.page = 1;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  get pagedResults(): Employee[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  setPage(p: number) {
    this.page = Math.max(1, Math.min(this.totalPages, p));
    this.updateUrl();
  }

  updateUrl() {
    syncFiltersToUrl({
      q: this.filters.query || undefined,
      department: this.filters.department || undefined,
      job: this.filters.jobPosition || undefined,
      office: this.filters.office || undefined,
      state: this.filters.state || undefined,
      role: this.filters.role || undefined,
      page: this.page > 1 ? String(this.page) : undefined,
      size: VALID_PAGE_SIZES.includes(this.pageSize) ? String(this.pageSize) : undefined
    });
  }

  // ------------------ Table actions & helpers ------------------
  abrirModal(miembro: Employee) {
    // Si es ADMIN, no puede editar a OWNER
    if (this.isAdmin) {
      const r = this.getEmployeeRoles(miembro);
      if (r.includes('OWNER')) {
        alert('No autorizado: un ADMIN no puede editar a un OWNER.');
        return;
      }
    }
    this.miembroSeleccionado = { ...miembro };
    this.mostrarModal = true;
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.miembroSeleccionado = null;
  }

  async guardarCambios(miembroEditado: Employee) {
    // El modal ya intentó hacer PUT; aquí actualizamos localmente y/o forzamos refresh
    try {
      // actualizar localmente para respuesta inmediata
      const idx = this.employees.findIndex(e => String(e.id) === String(miembroEditado.id));
      if (idx !== -1) {
        this.employees[idx] = { ...this.employees[idx], ...miembroEditado };
        this.applyFilters();
      } else {
        // si no existe, recargar desde backend
        await this.refreshData();
      }
      this.cerrarModal();
    } catch (err: any) {
      console.error('Error aplicando cambios localmente', err);
      // fallback: refrescar todo
      await this.refreshData();
      this.cerrarModal();
    }
  }

  async eliminarEmpleado(id: string | number) {
    const target = this.employees.find(e => String(e.id) === String(id));
    if (!target) return;
    const roles = this.getEmployeeRoles(target);
    const isOwner = roles.includes('OWNER');
    if (!this.canEditDelete) {
      this.alertMessage = 'No autorizado: tu rol no permite eliminar miembros.';
      this.showAlert = true;
      return;
    }
    if (this.isAdmin && isOwner) {
      this.alertMessage = 'No autorizado: un ADMIN no puede eliminar a un OWNER.';
      this.showAlert = true;
      return;
    }
    // Mostrar modal de confirmación personalizado
    this.confirmDeleteId = id;
    this.confirmDeleteName = target.name || target.fullName || id;
    this.showAlert = false;
  }

  async confirmarEliminarEmpleado() {
    if (!this.confirmDeleteId) return;
    try {
      if (typeof this.api.deleteEmployee === 'function') {
        await this.api.deleteEmployee(Number(this.confirmDeleteId));
      } else {
        const base = this.auth.getApiBase?.() ?? '';
        await fetch(`${base.replace(/\/$/, '')}/employees/${this.confirmDeleteId}`, { method: 'DELETE' });
      }
      localStorage.setItem('employee-deleted', JSON.stringify({ id: this.confirmDeleteId, ts: Date.now() }));
      await this.refreshData();
    } catch (err: any) {
      this.alertMessage = err?.message || 'Error eliminando empleado';
      this.showAlert = true;
    }
    this.cancelarEliminarEmpleado();
  }

  cancelarEliminarEmpleado() {
    this.confirmDeleteId = null;
    this.confirmDeleteName = '';
  }

  getEmployeeRoles(e: any): string[] {
    const arr = (Array.isArray(e?.roles)
      ? e.roles
      : (Array.isArray(e?.account?.roles) ? e.account.roles
        : (Array.isArray(e?.accountRoles) ? e.accountRoles
          : (Array.isArray(e?.account?.authorities) ? e.account.authorities : []))));
    const mapped = (arr as any[]).map((r: any) => typeof r === 'string' ? r : (r?.name || r?.role || r?.authority || r?.rol || r?.roleName || r?.label)).filter(Boolean) as string[];
    const single = (e?.accountRole || e?.account?.role);
    const singles = single ? [String(single)] : [];
    return [...new Set([...mapped, ...singles].map(x => String(x).toUpperCase()))];
  }

  // ------------------ Select options population ------------------
  populateStateOptions() {
    // no necesita DOM directo, solo prepara valores en catalogs or in template we can compute distinct states
    // kept for compatibility with previous code if needed
  }

  populateRoleOptions() {
    // kept for compatibility
  }
}
