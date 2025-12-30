import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule, NgIf } from '@angular/common';

import { ProjectService } from './services/projects.service';
import { ChangeDetectorRef } from '@angular/core';
import { Project } from './models/project.model';
import { TimeEntry } from './models/time-entry.model';
import { buildEmployeesWithReports } from './utils/filters/employee-filters.util';

import { ProjectCards } from './components/project-cards/project-cards';
import { Filters } from './components/filters/filters';
import { Calendar } from './components/calendar/calendar';
import { SubTaskService } from './services/sub-task.service';
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
  // Time entries for the calendar (can include holidays -> use any)
  timeEntries: any[] = [];
  private allTimeEntries: any[] = [];
  employeesList: { id: number; name: string }[] = [];
  private authSub?: Subscription;

  

  constructor(
    private projectsService: ProjectService,
    public authState: AuthStateService,
    private cd: ChangeDetectorRef,
    private subTaskService: SubTaskService,
    private internalTaskLogService: InternalTaskLogService,
    private reportHoursDataService: ReportHoursDataService,
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
        this.internalTaskLogService.getAll().subscribe({
          next: logs => {
            // Build unified time entries
            const built = this.reportHoursDataService.buildTimeEntries(subs, logs);

            // Load holidays for current year and append as time-entry-like objects
            this.holidayService.getByYear(new Date().getFullYear()).subscribe({
              next: holidaysResp => {
                const holidayEntries = mapHolidaysToTimeEntries(holidaysResp);
                this.allTimeEntries = [...built, ...holidayEntries];
                this.timeEntries = [...this.allTimeEntries];
                console.info('[ReportHours] Loaded holidays:', holidayEntries.length, 'total entries:', this.allTimeEntries.length);

                // proceed to build employees list below
                this.loadEmployeesList(this.allTimeEntries);
              },
              error: () => {
                this.allTimeEntries = built;
                this.timeEntries = [...built];
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

        const myDepartmentId = this.employeeId ? (map.get(this.employeeId) ?? undefined) : undefined;

        this.employeesList = buildEmployeesWithReports(entries, {
          myRole,
          isCoordinator,
          myDepartmentId,
          employeeDepartmentMap: record
        });
      },
      error: () => {
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
    // Apply filters to allTimeEntries using ReportHoursDataService
    // Import service via relative path and create a service instance via injector pattern
    try {
      // Dynamic import of service class and create using Injector from Angular isn't straightforward here.
      // Instead, perform simple in-place filtering matching ReportHoursDataService.applyFilters logic to avoid DI complexities.
      let result = [...this.allTimeEntries];

      if (filters.onlyMyReports && this.employeeId) {
        result = result.filter((e: any) => e.userId === this.employeeId);
      }

      if (filters.selectedEmployeeId) {
        result = result.filter((e: any) => e.userId === filters.selectedEmployeeId);
      }

      if (filters.searchText) {
        const text = filters.searchText.toLowerCase();
        result = result.filter((e: any) =>
          (e.title || '').toLowerCase().includes(text) ||
          (e.userName || '').toLowerCase().includes(text)
        );
      }

      this.timeEntries = result;
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