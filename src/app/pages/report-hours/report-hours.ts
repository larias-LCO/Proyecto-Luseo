import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule, NgIf,} from '@angular/common';

import { ProjectService } from './services/projects.service';
import { ChangeDetectorRef } from '@angular/core';
import { Project } from './models/project.model';
import { buildEmployeesWithReports } from './utils/filters/employee-filters.util';

import { ProjectCards } from './components/project-cards/project-cards';
import { Filters } from './components/filters/filters';
import { Calendar } from './components/calendar/calendar';
import { InternalTaskModal } from './components/modals/internal-task-modal/internal-task-modal';
import { InternalTaskEditModal } from './components/modals/internal-task-edit-modal/internal-task-edit-modal';
import { SubtaskModal } from './components/modals/subtask-modal/subtask-modal';
import { SubtaskEditModal } from './components/modals/subtask-edit-modal/subtask-edit-modal';
import { SubTaskService } from './services/sub-task.service';
import { SubTaskCategoryService } from './services/sub-task-category.service';
import { InternalTaskService } from './services/internal-task-category.service';
import { NotificationService } from '../../core/services/notification.service';
import { InternalTaskCategory } from './models/internal-task-category.model';
import { InternalTaskLogService } from './services/internal-tasks.service';
import { ReportHoursDataService } from './services/report-hours-data.service';
import { EmployeeService } from './services/employee.service';
import { HolidayService } from './services/holiday.service';
import { mapHolidaysToTimeEntries } from './utils/mappers/holiday.mapper';

import { AuthStateService } from './auth/services/auth-state.service';
import { HeaderComponent } from "../../core/components/header/header";
import { SubmenuComponent } from "../../core/components/submenu/submenu";
import { AlarmClockIconComponent } from '../../core/components/animated-icons/alarm-clock.component';
import { WebsocketService } from '../../core/services/websocket.service';
import { HelpPanelService } from './services/help-panel.service';
import { REPORT_HOURS_HELP } from './utils/report-hours-help.config';
import { HelpPanelComponent } from './components/help-panel/help-panel';
import { FloatingHelpButtonComponent } from './components/floating-help-button/floating-help-button';

@Component({
  selector: 'app-report-hours',
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    ProjectCards,
    Filters,
    Calendar,
    InternalTaskModal,
    InternalTaskEditModal,
    SubtaskModal,
    SubtaskEditModal,
    HeaderComponent,
    SubmenuComponent,
    AlarmClockIconComponent,
    HelpPanelComponent,
    FloatingHelpButtonComponent
],
  templateUrl: './report-hours.html',
  styleUrls: ['./report-hours.scss']
})
export class ReportHours implements OnInit, OnDestroy {

  /** Proyectos crudos del backend */
  projects: Project[] = [];

  /** Proyectos ya filtrados (lo que se renderiza) */
  filteredProjects: Project[] = [];

  loadingProjects = false;
  employeeId?: number;
  isAdminOrOwner = false;
  employeeDepartmentMap: Record<number, number> = {};
  myDepartmentId?: number;
  isCoordinatorFlag?: boolean;
  // Time entries for the calendar (can include holidays -> use any)
  timeEntries: any[] = [];
  private allTimeEntries: any[] = [];
  private rawInternalLogs: any[] = [];
  subTasks: any[] = [];
  internalTasks: any[] = [];
  subTaskCategories: any[] = [];
  loading = false; // general-purpose loading flag for overlays
  subtaskPresetEntry: any = null;
  internalPresetEntry: any = null;
  // subtask modal state
  showSubtaskModal = false;
  showSubtaskEditModal = false;
  selectedSubtask: any = null;
  projectModalPreset?: number | undefined;
  private lastTimeEntryFilters: any = {};
  showInternalModal = false;
  showEditModal = false;
  selectedLog: any = null;
  employeesList: { id: number; name: string }[] = [];
  private authSub?: Subscription;
  // Subscription container for websocket topic updates
  private wsSub: Subscription = new Subscription();
  
  constructor(
    private projectsService: ProjectService,
    public authState: AuthStateService,
    private cd: ChangeDetectorRef,
    private subTaskService: SubTaskService,
    private internalTaskService: InternalTaskService,
    private internalTaskLogService: InternalTaskLogService,
    private reportHoursDataService: ReportHoursDataService,
    private notification: NotificationService,
    private employeeService: EmployeeService,
    private holidayService: HolidayService,
    private subTaskCategoryService: SubTaskCategoryService,
    private helpPanelService: HelpPanelService,
    private websocket: WebsocketService
  ) {}

  ngOnInit(): void {
    // Configurar contenido de ayuda para esta página
    this.helpPanelService.setContent(REPORT_HOURS_HELP);

    this.loadProjects();

    // preload subtask categories for modals
    try {
      this.subTaskCategoryService.getAll().subscribe({ next: cats => { this.subTaskCategories = cats || []; }, error: () => { this.subTaskCategories = []; } });
    } catch (e) { this.subTaskCategories = []; }

    // Initialize employeeId/isAdmin from current auth state (if available)
    this.employeeId = this.authState.employeeId ?? undefined;
    this.isAdminOrOwner = this.authState.role === 'ADMIN' || this.authState.role === 'OWNER';

    // Subscribe to auth state so we can update when session changes
      this.authSub = this.authState.session$.subscribe((me) => {
        this.employeeId = this.authState.employeeId ?? undefined;
        this.isAdminOrOwner = this.authState.role === 'ADMIN' || this.authState.role === 'OWNER';
    });

    // Load time entries and employees
    this.loadTimeEntries();

    // Suscribirse al WebSocket para recibir actualizaciones parciales
    // Escuchar varios topics que el backend podría emitir (ajustar si es necesario)
    try {
      const topics = ['sub_task', 'internalTaskLog', 'employee'];
      topics.forEach(t => {
        try {
          const s = this.websocket.subscribe(t).subscribe((msg: any) => this.handleWsMessage(msg, t));
          this.wsSub.add(s);
        } catch (e) {
          console.warn('[ReportHours] No fue posible suscribir topic', t, e);
        }
      });
    } catch (e) {
      console.warn('[ReportHours] Falló suscripción WS', e);
    }
  }

  /**
   * Handler genérico para mensajes WS. Enruta según `resource`/topic hacia
   * la función que aplica la actualización parcial adecuada.
   */
  private handleWsMessage(msg: any, topic?: string): void {
    try {
      // Mensajes pueden venir en diferentes formas; intentar normalizar
      const payload = msg || {};

      // backend puede emitir: realTimeSyncService.emitRefreshForResource("sub_task", "SUB_TASK_SAVED")
      // que podría traducirse en un mensaje del tipo { resource: 'sub_task', event: 'SUB_TASK_SAVED', data: {...} }
      const resource = payload.resource || payload.type || topic || '';
      const eventType = payload.event || payload.action || payload.type || null;

      // Si el recurso es empleado, refrescamos la lista de empleados (pasivo)
      if (String(resource).toLowerCase().includes('employee')) {
        // Recalcular mapeos y lista de empleados sin recargar todos los timeEntries
        try { this.loadEmployeesList(this.allTimeEntries); } catch (e) { console.warn('[ReportHours] WS employee refresh failed', e); }
        return;
      }

      // Recursos relacionados a time entries/subtasks/internal tasks deben mapearse
      const lower = String(resource).toLowerCase();
      if (lower.includes('sub') || lower.includes('task') || lower.includes('time') || lower.includes('entry')) {
        // pasar al handler que aplica cambios parciales sobre time entries
        // empaquetar payload en la forma { action, entry }
        const entry = payload.data || payload.entry || payload.payload || null;
        const action = payload.event || payload.action || eventType || null;

        // Si el backend solo emite el recurso/evento (sin la entidad),
        // hacemos un refresco parcial: recargar subtasks + internal logs
        // y reconstruir `allTimeEntries`. Esto asegura que Owners vean
        // los cambios aunque el mensaje WS no incluya el objeto.
        if (!entry) {
          this.partialRefreshForResource(lower, action);
          return;
        }

        // Construir objeto simple para compatibilidad con onWsTimeEntry
        const normalized = { action, entry };
        this.onWsTimeEntry(normalized);
        return;
      }

      // Otros recursos: ignorar por ahora
    } catch (err) {
      console.error('[ReportHours] Error manejando message genérico WS', err, msg);
    }
  }

  /**
   * Maneja mensajes entrantes del topic WS y aplica cambios parciales.
   * - Solo procesa actualizaciones si el usuario puede ver todos los reportes
   *   (owners/admin/coordinators).
   * - No recarga toda la lista: modifica `allTimeEntries` y re-aplica filtros.
   */
  private onWsTimeEntry(msg: any): void {
    try {
      // Protección: solo roles privilegiados deben procesar listados globales
      const isPrivileged = this.isAdminOrOwner || (this.isCoordinatorFlag ?? ((this.authState.authorities || []).some((a: any) => typeof a === 'string' && a.toLowerCase().includes('coordinator'))));
      if (!isPrivileged) return;

      const payload = msg || {};

      // Soportar varios formatos comunes de payload
      const action = payload.action || payload.type || (payload.event && payload.event.action) || null;
      const entry = payload.entry || payload.data || payload || null;

      if (!entry || (entry && (entry.id === undefined || entry.id === null))) {
        // nothing to do if no id
        return;
      }

      const idStr = String(entry.id);
      const idx = (this.allTimeEntries || []).findIndex((e: any) => String(e.id) === idStr);

      // Apply action semantics conservatively
      if (action === 'created' || action === 'create') {
        // push nuevo (si no existe)
        if (idx === -1) this.allTimeEntries.push(entry);
      } else if (action === 'updated' || action === 'update') {
        if (idx >= 0) this.allTimeEntries[idx] = { ...this.allTimeEntries[idx], ...entry };
      } else if (action === 'deleted' || action === 'delete') {
        if (idx >= 0) this.allTimeEntries.splice(idx, 1);
      } else {
        // heurística: si existe reemplazar, si no existe insertar
        if (idx >= 0) this.allTimeEntries[idx] = { ...this.allTimeEntries[idx], ...entry };
        else this.allTimeEntries.push(entry);
      }

      // Además sincronizar caches locales y limpiar cache de servicios
      try {
        const looksLikeInternal = entry && (entry.internalTaskId !== undefined || entry.logDate !== undefined || entry.logDate !== null);
        const looksLikeSubtask = entry && (entry.issueDate !== undefined || entry.projectId !== undefined || entry.tag !== undefined);

        if (looksLikeInternal) {
          // mantener rawInternalLogs actualizado
          const ridx = (this.rawInternalLogs || []).findIndex((r: any) => String(r.id) === idStr);
          if (action === 'deleted' || action === 'delete') {
            if (ridx >= 0) this.rawInternalLogs.splice(ridx, 1);
          } else if (action === 'created' || action === 'create') {
            if (ridx === -1) this.rawInternalLogs.push(entry);
          } else {
            if (ridx >= 0) this.rawInternalLogs[ridx] = { ...this.rawInternalLogs[ridx], ...entry };
            else this.rawInternalLogs.push(entry);
          }
          try { this.internalTaskLogService.clearCache(); } catch (e) {}
        }

        if (looksLikeSubtask) {
          const sidx = (this.subTasks || []).findIndex((s: any) => String(s.id) === idStr);
          if (action === 'deleted' || action === 'delete') {
            if (sidx >= 0) this.subTasks.splice(sidx, 1);
          } else if (action === 'created' || action === 'create') {
            if (sidx === -1) this.subTasks.push(entry);
          } else {
            if (sidx >= 0) this.subTasks[sidx] = { ...this.subTasks[sidx], ...entry };
            else this.subTasks.push(entry);
          }
          try { this.subTaskService.clearCache(); } catch (e) {}
        }
      } catch (e) {
        // no crítico
      }

      // Si hay modal abierto para el mismo id, actualizar contenido in-place
      try {
        if (this.selectedLog && String(this.selectedLog.id) === idStr) this.selectedLog = { ...this.selectedLog, ...entry };
        if (this.selectedSubtask && String(this.selectedSubtask.id) === idStr) this.selectedSubtask = { ...this.selectedSubtask, ...entry };
      } catch (e) {}

      // Re-aplicar filtros para actualizar la vista sin recargar todo
      try {
        const myRole = (this.authState.role as 'OWNER' | 'ADMIN' | 'USER') ?? 'USER';
        const isCoord = this.isCoordinatorFlag ?? ((this.authState.authorities || []).some((a: any) => typeof a === 'string' && a.toLowerCase().includes('coordinator')));
        this.timeEntries = this.reportHoursDataService.applyFilters(
          this.allTimeEntries,
          this.lastTimeEntryFilters || {},
          {
            myEmployeeId: this.employeeId,
            myRole,
            isCoordinator: isCoord,
            myDepartmentId: this.myDepartmentId,
            employeeDepartmentMap: this.employeeDepartmentMap
          }
        );
        try { this.cd.detectChanges(); } catch (e) {}
        try { this.loadEmployeesList(this.allTimeEntries); } catch (e) {}
      } catch (e) {
        console.warn('[ReportHours] Error al re-aplicar filtros tras WS', e);
      }

    } catch (err) {
      console.error('[ReportHours] Error manejando mensaje WS', err, msg);
    }
  }

  /**
   * Refresco parcial para recursos que no traen entidad completa en el mensaje WS.
   * Recupera `subTasks` y `internalTaskLogs`, reconstruye `allTimeEntries`
   * y re-aplica los filtros de vista.
   */
  private partialRefreshForResource(resource: string, eventType?: string): void {
    try {
      // Sólo ejecutar para recursos de tareas/entradas
      const lower = String(resource || '').toLowerCase();
      if (!(lower.includes('sub') || lower.includes('task') || lower.includes('time') || lower.includes('entry') || lower.includes('internal'))) return;

      // Obtener subtasks, luego internal logs, reconstruir entries
      // Forzar refresh para evitar devolver caché stale cuando el backend
      // emite solo evento y la cache del servicio aún contiene datos viejos.
      this.subTaskService.getAll(true).subscribe({
        next: (subs: any[]) => {
          this.subTasks = subs || [];
          this.internalTaskLogService.getAll(true).subscribe({
            next: (logs: any[]) => {
              this.rawInternalLogs = logs || [];

              // Reconstruir entries a partir de subtasks + logs
              const built = this.reportHoursDataService.buildTimeEntries(this.subTasks, this.rawInternalLogs);

              // Mantener entradas de festivos ya presentes (isHoliday)
              const holidayEntries = (this.allTimeEntries || []).filter((e: any) => e && e.isHoliday);
              this.allTimeEntries = [...built, ...holidayEntries];

              // Re-aplicar filtros con el estado actual
              try {
                const myRole = (this.authState.role as 'OWNER' | 'ADMIN' | 'USER') ?? 'USER';
                const isCoord = this.isCoordinatorFlag ?? ((this.authState.authorities || []).some((a: any) => typeof a === 'string' && a.toLowerCase().includes('coordinator')));
                this.timeEntries = this.reportHoursDataService.applyFilters(
                  this.allTimeEntries,
                  this.lastTimeEntryFilters || {},
                  {
                    myEmployeeId: this.employeeId,
                    myRole,
                    isCoordinator: isCoord,
                    myDepartmentId: this.myDepartmentId,
                    employeeDepartmentMap: this.employeeDepartmentMap
                  }
                );
                try { this.cd.detectChanges(); } catch (e) {}
                try { this.loadEmployeesList(this.allTimeEntries); } catch (e) {}
              } catch (e) {
                console.warn('[ReportHours] Error re-aplicando filtros tras partialRefresh', e);
              }
            },
            error: (err: any) => { console.warn('[ReportHours] partialRefresh: fail loading internal logs', err); }
          });
        },
        error: (err: any) => { console.warn('[ReportHours] partialRefresh: fail loading subtasks', err); }
      });
    } catch (err) {
      console.error('[ReportHours] Error en partialRefreshForResource', err);
    }
  }

  private loadTimeEntries(): void {
    // Load subtasks, internal logs and employees, then build time entries
      this.subTaskService.getAll(true).subscribe({
      next: subs => {
        this.subTasks = subs || [];
        // load internal tasks categories used by modal
        try {
          this.internalTaskService.getAll().subscribe({ next: (its: InternalTaskCategory[]) => { this.internalTasks = its || []; }, error: () => { this.internalTasks = []; } });
        } catch (e) { this.internalTasks = []; }
          this.internalTaskLogService.getAll(true).subscribe({
          next: logs => {
            this.rawInternalLogs = logs || [];
            // Build unified time entries
            const built = this.reportHoursDataService.buildTimeEntries(subs, logs);
            // Load holidays for current and next year and append as time-entry-like objects
            this.holidayService.getCurrent().subscribe({
              next: holidaysResp => {
                const holidayEntries = mapHolidaysToTimeEntries(holidaysResp);
                this.allTimeEntries = [...built, ...holidayEntries];
                // Apply initial permission-aware filtering (use last applied filters, default empty)
                const myRoleInit = (this.authState.role as 'OWNER' | 'ADMIN' | 'USER') ?? 'USER';
                const isCoordInit = (this.authState.authorities || []).some((a: any) => typeof a === 'string' && a.toLowerCase().includes('coordinator'));
                this.timeEntries = this.reportHoursDataService.applyFilters(
                  this.allTimeEntries,
                  this.lastTimeEntryFilters || {},
                  {
                    myEmployeeId: this.employeeId,
                    myRole: myRoleInit,
                    isCoordinator: isCoordInit,
                    myDepartmentId: this.myDepartmentId,
                    employeeDepartmentMap: this.employeeDepartmentMap
                  }
                );
                // proceed to build employees list below
                this.loadEmployeesList(this.allTimeEntries);
              },
              error: () => {
                this.allTimeEntries = built;
                const myRoleInit2 = (this.authState.role as 'OWNER' | 'ADMIN' | 'USER') ?? 'USER';
                const isCoordInit2 = (this.authState.authorities || []).some((a: any) => typeof a === 'string' && a.toLowerCase().includes('coordinator'));
                this.timeEntries = this.reportHoursDataService.applyFilters(
                  this.allTimeEntries,
                  this.lastTimeEntryFilters || {},
                  {
                    myEmployeeId: this.employeeId,
                    myRole: myRoleInit2,
                    isCoordinator: isCoordInit2,
                    myDepartmentId: this.myDepartmentId,
                    employeeDepartmentMap: this.employeeDepartmentMap
                  }
                );
                console.warn('[ReportHours] Failed to load holidays, continuing without them');
                this.loadEmployeesList(this.allTimeEntries);
              }
            });

            // employees list will be built after holidays are appended
          },
          error: () => {
            this.allTimeEntries = [];
            this.timeEntries = [];
          }
        });
      },
      error: () => {
        this.allTimeEntries = [];
        this.timeEntries = [];
      }
    });
  }

  openInternalModal(): void {
    this.loading = true;
    // open modal after a brief simulated load so spinner is visible
    setTimeout(() => {
      try { this.showInternalModal = true; this.loading = false; this.cd.detectChanges(); } catch (e) {}
    }, 450);
  }

  onCalendarEventClick(evt: any): void {
    try {
      // Normalize incoming event (could be arg.event or the event object itself)
      const eventObj = (evt && evt.event) ? evt.event : evt;
      const eventId = eventObj && eventObj.id ? eventObj.id : (evt && evt.id ? evt.id : null);
      // try to find original time entry by id
      let entry: any = null;
      if (eventId != null) {
        entry = (this.allTimeEntries || []).find((it: any) => String(it.id) === String(eventId));
      }
      const extended = (eventObj && (eventObj as any).extendedProps) ? (eventObj as any).extendedProps : (eventObj || {});

      // If it's a holiday, do nothing (visual-only)
      if (extended && extended.isHoliday) {
        return;
      }

      // detect internal tasks vs subtask events
      const isInternal = Boolean((extended && extended.isInternalTask) || (entry && entry.type === 'INTERNAL_TASK'));
      const isSubTask = Boolean((extended && extended.isSubTask) || (entry && entry.type === 'SUB_TASK'));

      if (isInternal) {
        // show loading only for actionable events; set data now and open modal after spinner
        this.loading = true;
        let raw = null;
        try {
          const eid = eventId != null ? String(eventId) : null;
          if (eid && this.rawInternalLogs && this.rawInternalLogs.length) {
            raw = (this.rawInternalLogs || []).find((r: any) => String(r.id) === String(eid));
          }
        } catch (e) { raw = null; }
        this.selectedLog = raw || extended || entry || null;
        setTimeout(() => { try { this.showEditModal = true; this.loading = false; this.cd.detectChanges(); } catch (e) {} }, 450);
        return;
      }

      if (isSubTask) {
        this.loading = true;
        let rawSub = null;
        try {
          const eid = eventId != null ? String(eventId) : null;
          if (eid && this.subTasks && this.subTasks.length) {
            rawSub = (this.subTasks || []).find((s: any) => String(s.id) === String(eid));
          }
        } catch (e) { rawSub = null; }
        this.selectedSubtask = rawSub || extended || entry || null;
        setTimeout(() => { try { this.showSubtaskEditModal = true; this.loading = false; this.cd.detectChanges(); } catch (e) {} }, 450);
        return;
      }
    } catch (err) {
      console.error('Failed to open edit modal from event click', err);
      this.loading = false;
    }
  }

  duplicateCalendarEntry(eventObj: any, evt?: MouseEvent): void {
    try {
      if (evt) evt.stopPropagation();
      const extended = (eventObj && eventObj.extendedProps) ? eventObj.extendedProps : (eventObj || {});
      if (!extended || extended.isHoliday) return;

      // Prepare spinner and open the appropriate creation modal with preset data
      if (extended.isInternalTask) {
        this.loading = true;
        // build preset for internal modal
        this.internalPresetEntry = {
          mainTaskId: extended.internalTaskId || extended.internalTaskId || '',
          subTaskId: extended.internalTaskId || '',
          description: extended.description || extended.internalTaskName || '',
          hours: extended.hours || 0,
          date: extended.start || extended.date || new Date().toISOString().slice(0,10)
        };
        setTimeout(() => { try { this.showInternalModal = true; this.loading = false; this.cd.detectChanges(); } catch (e) {} }, 450);
        return;
      }

      if (extended.isSubTask) {
        this.loading = true;
        // build preset for subtask modal
        this.subtaskPresetEntry = {
          projectId: extended.projectId || undefined,
          subTaskCategoryId: extended.subTaskCategoryId || extended.subTaskCategoryId || '',
          name: extended.name || extended.title || '',
          actualHours: extended.hours || 0,
          issueDate: extended.start || extended.date || new Date().toISOString().slice(0,10),
          tag: extended.tag || ''
        };
        setTimeout(() => { try { this.showSubtaskModal = true; this.loading = false; this.cd.detectChanges(); } catch (e) {} }, 450);
        return;
      }
    } catch (err) {
      console.error('Failed to duplicate calendar entry', err);
      this.loading = false;
    }
  }
  handleInternalModalClose(changed?: boolean): void {
    this.showInternalModal = false;
    // support structured result { changed: boolean, draft?: any[] }
    if (changed && typeof changed === 'object') {
      const res: any = changed;
      if (res.changed) {
        this.internalPresetEntry = null;
        try { this.loadTimeEntries(); } catch (e) {}
      } else if (res.draft) {
        this.internalPresetEntry = res.draft;
      }
      return;
    }
    // legacy boolean handling
    if (changed) {
      this.internalPresetEntry = null;
      try { this.loadTimeEntries(); } catch (e) {}
    }
  }

  handleEditModalClose(changed?: boolean): void {
    this.showEditModal = false;
    this.selectedLog = null;
    if (changed) {
      try { this.loadTimeEntries(); } catch (e) {}
    }
  }

  openSubtaskModal(): void {
    this.loading = true;
    this.projectModalPreset = undefined;
    this.showSubtaskModal = true;
    setTimeout(() => { try { this.loading = false; this.cd.detectChanges(); } catch (e) {} }, 450);
  }

  handleProjectCardClick(project: any): void {
    // show a brief loading overlay and open modal after simulated load
    this.loading = true;
    // Prepare preset immediately so modal has data when it opens
    this.projectModalPreset = project.id;

    // Open modal after spinner has been visible for a short duration
    setTimeout(() => {
      try {
        this.showSubtaskModal = true;
        this.loading = false;
        this.cd.detectChanges();
      } catch (e) {}
    }, 450);
  }

  handleSubtaskModalClose(changed?: boolean): void {
    this.showSubtaskModal = false;
    this.projectModalPreset = undefined;
    // support structured result { changed: boolean, draft?: any[] }
    if (changed && typeof changed === 'object') {
      const res: any = changed;
      if (res.changed) {
        this.subtaskPresetEntry = null;
        try { this.loadTimeEntries(); } catch (e) {}
      } else if (res.draft) {
        this.subtaskPresetEntry = res.draft;
      }
      return;
    }
    // legacy boolean handling
    this.subtaskPresetEntry = null;
    if (changed) {
      try { this.loadTimeEntries(); } catch (e) {}
    }
  }

  handleSubtaskEditModalClose(changed?: boolean): void {
    this.showSubtaskEditModal = false;
    this.selectedSubtask = null;
    if (changed) {
      try { this.loadTimeEntries(); } catch (e) {}
    }
  }

  /** Carga proyectos */
  private loadProjects(): void {
    this.loadingProjects = true;

    this.projectsService.getAll().subscribe({
      next: projects => {
        this.projects = [...projects].sort(
          (a, b) => a.projectCode.localeCompare(b.projectCode)
        );

        // Inicialmente mostramos todo
        this.filteredProjects = [...this.projects];
        this.loadingProjects = false;
      },
      error: () => {
        this.projects = [];
        this.filteredProjects = [];
        this.loadingProjects = false;
      }
    });
  }

  private loadEmployeesList(entries: any[]): void {
    const myRole = (this.authState.role as 'OWNER' | 'ADMIN' | 'USER') ?? 'USER';
    const isCoordinator = (this.authState.authorities || []).some(a => typeof a === 'string' && a.toLowerCase().includes('coordinator'));

    this.employeeService.getEmployeeDepartmentMap().subscribe({
      next: map => {
        const record: Record<number, number> = {};
        map.forEach((v, k) => { record[k] = v ?? 0; });

        this.employeeDepartmentMap = record;
        this.myDepartmentId = this.employeeId ? (map.get(this.employeeId) ?? undefined) : undefined;

        this.employeesList = buildEmployeesWithReports(entries, {
          myRole,
          isCoordinator,
          myDepartmentId: this.myDepartmentId,
          employeeDepartmentMap: record
        });
        // Try to determine coordinator status from employee record (prefer job position)
        if (this.employeeId) {
          this.employeeService.getById(this.employeeId).subscribe({
            next: emp => {
              const pos = (emp && emp.jobPositionName) ? String(emp.jobPositionName).toLowerCase() : '';
              this.isCoordinatorFlag = pos.includes('coordinator') || pos.includes('coord');
              // Re-apply filters now that we have department map and job position
              try {
                this.timeEntries = this.reportHoursDataService.applyFilters(
                  this.allTimeEntries,
                  this.lastTimeEntryFilters || {},
                  {
                    myEmployeeId: this.employeeId,
                    myRole,
                    isCoordinator: this.isCoordinatorFlag ?? isCoordinator,
                    myDepartmentId: this.myDepartmentId,
                    employeeDepartmentMap: this.employeeDepartmentMap
                  }
                );
                try { this.cd.detectChanges(); } catch {}
              } catch (err) {
                console.error('Failed to re-apply filters after loading employee record', err);
              }
            },
            error: () => {
              // Fallback: keep computed `isCoordinator` from authorities
              this.isCoordinatorFlag = isCoordinator;
              try {
                this.timeEntries = this.reportHoursDataService.applyFilters(
                  this.allTimeEntries,
                  this.lastTimeEntryFilters || {},
                  {
                    myEmployeeId: this.employeeId,
                    myRole,
                    isCoordinator: this.isCoordinatorFlag,
                    myDepartmentId: this.myDepartmentId,
                    employeeDepartmentMap: this.employeeDepartmentMap
                  }
                );
                try { this.cd.detectChanges(); } catch {}
              } catch (err) {
                console.error('Failed to re-apply filters after employee lookup error', err);
              }
            }
          });
        } else {
          // Re-apply filters now that we have department map (important for admin+coordinator)
        try {
          this.timeEntries = this.reportHoursDataService.applyFilters(
            this.allTimeEntries,
            this.lastTimeEntryFilters || {},
            {
              myEmployeeId: this.employeeId,
                myRole,
                isCoordinator,
              myDepartmentId: this.myDepartmentId,
              employeeDepartmentMap: this.employeeDepartmentMap
            }
          );
          try { this.cd.detectChanges(); } catch {}
        } catch (err) {
          console.error('Failed to re-apply filters after loading department map', err);
        }
        }
      },
      error: () => {
        this.employeeDepartmentMap = {};
        this.myDepartmentId = undefined;
        this.employeesList = buildEmployeesWithReports(entries, {
          myRole,
          isCoordinator,
          employeeDepartmentMap: {}
        });
      }
    });
  }

  /** Receive pre-filtered projects from FiltersComponent */
  onProjectsFiltered(projects: Project[]): void {
    this.filteredProjects = projects;
    // Force change detection in case parent view doesn't update
    try { this.cd.detectChanges(); } catch {}
  }

  onTimeEntryFiltersChanged(filters: any): void {
    // Delegate filtering to ReportHoursDataService which preserves holidays
    try {
      // store last used filters so we can re-apply them when department map arrives
      this.lastTimeEntryFilters = filters || {};

      const myRole = (this.authState.role as 'OWNER' | 'ADMIN' | 'USER') ?? 'USER';
      const authIsCoord = (this.authState.authorities || []).some((a: any) => typeof a === 'string' && a.toLowerCase().includes('coordinator'));
      const isCoordinator = this.isCoordinatorFlag ?? authIsCoord;

      this.timeEntries = this.reportHoursDataService.applyFilters(
        this.allTimeEntries,
        this.lastTimeEntryFilters,
        {
          myEmployeeId: this.employeeId,
          myRole,
          isCoordinator,
          myDepartmentId: this.myDepartmentId,
          employeeDepartmentMap: this.employeeDepartmentMap
        }
      );
      try { this.cd.detectChanges(); } catch {}
    } catch (err) {
      console.error('Failed to apply time entry filters', err);
    }
  }

  onProjectSelected(projectId: number): void {
    this.filteredProjects = this.projects.filter(p => p.id === projectId);
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
    this.wsSub?.unsubscribe();
    // Clear the help content and close the panel when leaving this page
    this.helpPanelService.close();
    this.helpPanelService.setContent(null);
  }
}
