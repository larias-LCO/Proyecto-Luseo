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
import { SubTaskService } from './services/sub-task.service';
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
  subTasks: any[] = [];
  internalTasks: any[] = [];
  private lastTimeEntryFilters: any = {};
  showInternalModal = false;
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
  ) {}

  ngOnInit(): void {
    this.loadProjects();

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

  onInternalModalSave(payload: any[]): void {
    if (!payload || !payload.length) return;
    const calls = payload.map(p => {
      const internalTaskId = p.subTaskId || p.mainTaskId;
      const task = (this.internalTasks || []).find((t: any) => String(t.id) === String(internalTaskId));
      const createPayload: any = {
        logDate: p.date,
        reportHours: p.hours,
        description: p.description || '',
        internalTaskId: Number(internalTaskId),
        internalTaskName: task ? task.name : ''
      };
      return this.internalTaskLogService.create(createPayload);
    });

    import('rxjs').then(rx => {
      const { forkJoin } = rx;
      forkJoin(calls).subscribe({
        next: () => {
          this.showInternalModal = false;
          // refresh entries
          try { this.loadTimeEntries(); } catch (e) {}
          try { this.notification.show(`Saved ${payload.length} report(s)`, 'success', 4000); } catch (e) {}
        },
        error: (err) => {
          console.error('Failed to create internal task logs', err);
          try { this.notification.show('Failed to save internal task reports', 'error', 5000); } catch (e) {}
        }
      });
    });
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
  }
}