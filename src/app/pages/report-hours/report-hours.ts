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
    private helpPanelService: HelpPanelService
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
  }

  private loadTimeEntries(): void {
    // Load subtasks, internal logs and employees, then build time entries
    this.subTaskService.getAll().subscribe({
      next: subs => {
        this.subTasks = subs || [];
        // load internal tasks categories used by modal
        try {
          this.internalTaskService.getAll().subscribe({ next: (its: InternalTaskCategory[]) => { this.internalTasks = its || []; }, error: () => { this.internalTasks = []; } });
        } catch (e) { this.internalTasks = []; }
        this.internalTaskLogService.getAll().subscribe({
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

  /** Recibe proyectos ya filtrados desde FiltersComponent */
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
    // Limpiar el contenido de ayuda y cerrar el panel al salir de esta página
    this.helpPanelService.close();
    this.helpPanelService.setContent(null);
  }
}
