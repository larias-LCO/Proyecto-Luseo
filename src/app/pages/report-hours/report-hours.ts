import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule, NgIf } from '@angular/common';

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
    SubmenuComponent
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
    private holidayService: HolidayService
    ,
    private subTaskCategoryService: SubTaskCategoryService
  ) {}

  ngOnInit(): void {
    console.log('[ReportHours] 🚀 Component initialized');
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
    
    console.log('[ReportHours] ✅ Component initialization complete');
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
    this.showInternalModal = true;
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

      // detect internal tasks vs subtask events
      const isInternal = Boolean((extended && extended.isInternalTask) || (entry && entry.type === 'INTERNAL_TASK'));
      const isSubTask = Boolean((extended && extended.isSubTask) || (entry && entry.type === 'SUB_TASK'));

      if (isInternal) {
        // prefer the raw internal log (includes internalTaskId/internalTaskName)
        let raw = null;
        try {
          const eid = eventId != null ? String(eventId) : null;
          if (eid && this.rawInternalLogs && this.rawInternalLogs.length) {
            raw = (this.rawInternalLogs || []).find((r: any) => String(r.id) === String(eid));
          }
        } catch (e) { raw = null; }
        this.selectedLog = raw || extended || entry || null;
        this.showEditModal = true;
        return;
      }

      if (isSubTask) {
        // prefer raw subtask object from loaded subTasks
        let rawSub = null;
        try {
          const eid = eventId != null ? String(eventId) : null;
          if (eid && this.subTasks && this.subTasks.length) {
            rawSub = (this.subTasks || []).find((s: any) => String(s.id) === String(eid));
          }
        } catch (e) { rawSub = null; }
        this.selectedSubtask = rawSub || extended || entry || null;
        this.showSubtaskEditModal = true;
        return;
      }
    } catch (err) {
      console.error('Failed to open edit modal from event click', err);
    }
  }
  handleInternalModalClose(changed?: boolean): void {
    this.showInternalModal = false;
    if (changed) {
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
    this.projectModalPreset = undefined;
    this.showSubtaskModal = true;
  }

  handleProjectCardClick(project: any): void {
    console.log('[ReportHours] 📥 RECEIVED card click event from ProjectCards!');
    console.log('[ReportHours] 📦 Project data:', project);
    console.log('[ReportHours] 🔧 Setting projectModalPreset to:', project.id);
    console.log('[ReportHours] 🚪 Opening subtask modal...');
    
    // Set the project ID for the modal (same as JS: openSubtaskModal(project))
    this.projectModalPreset = project.id;
    this.showSubtaskModal = true;
    
    console.log('[ReportHours] ✅ Modal state updated:', { 
      projectModalPreset: this.projectModalPreset, 
      showSubtaskModal: this.showSubtaskModal,
      projectCode: project.projectCode,
      projectName: project.name
    });
    
    try { this.cd.detectChanges(); } catch (e) {}
  }

  handleSubtaskModalClose(changed?: boolean): void {
    this.showSubtaskModal = false;
    this.projectModalPreset = undefined;
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
    console.log('[ReportHours] 📋 Projects filtered, count:', projects?.length || 0);
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
  }
}
