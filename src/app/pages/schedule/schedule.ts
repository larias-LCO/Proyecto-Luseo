import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, forkJoin } from 'rxjs';

// Componentes de UI
import { HeaderComponent } from '../../core/components/header/header';
import { SubmenuComponent } from '../../core/components/submenu/submenu';
import { ScheduleCalendar } from './components/schedule-calendar/schedule-calendar';
import { ScheduleFiltersComponent } from './components/filters/filters.component';
import { ScheduleTaskEditModalComponent } from './components/modals/edit/schedule-task-edit-modal.component';
import { ScheduleTaskCreateModal } from './components/modals/create/schedule-task-create-modal.component';

// Servicios
import { GeneralTaskService } from './services/general-task.service';
import { AuthStateService } from '../report-hours/auth/services/auth-state.service';
import { AuthService } from '../report-hours/auth/services/auth-api.service';
import { HolidayService, Holiday } from './services/holiday.service';
import { ProjectService, Project } from './services/project.service';
import { TaskCategoryService } from './services/task-category.service';
import { EmployeeService } from '../report-hours/services/employee.service';

// Modelos
import { GeneralTask } from './models/general-task.model';
import { TaskCategory } from './models/task-category.model';

// Utilidades
import { applyFilters } from './utils/filters/schedule-filters.util';
import { createDefaultFilters, ScheduleFilters } from './utils/filters/schedule-filters.model';

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    // SubmenuComponent,
    ScheduleCalendar,
    ScheduleFiltersComponent,
    ScheduleTaskEditModalComponent,
    ScheduleTaskCreateModal
  ],
  templateUrl: './schedule.html',
  styleUrl: './schedule.scss'
})
export class Schedule implements OnInit, OnDestroy, AfterViewInit {

  // Datos principales
  allTasks: GeneralTask[] = [];
  filteredTasks: GeneralTask[] = [];
  holidays: Holiday[] = [];
  projects: Project[] = [];
  categories: TaskCategory[] = [];
  employees: any[] = [];
  myEmployeeId?: number;

  // Filtros
  filters: ScheduleFilters = createDefaultFilters();
  showHolidays = true;


  // Loading states
  isLoadingTasks = false;
  isLoadingHolidays = false;
  isLoadingInitialData = true;

  // Subject para limpieza de subscripciones
  private destroy$ = new Subject<void>();

  constructor(
    private generalTaskService: GeneralTaskService,
    private holidayService: HolidayService,
    private projectService: ProjectService,
    private categoryService: TaskCategoryService,
    private employeeService: EmployeeService,
    private authState: AuthStateService,
    private authApi: AuthService
  ) {}

  // Return primary role as string or null (safe for template binding)
  getPrimaryRole(): string | null {
    const r: any = this.authState.role;
    if (!r) return null;
    if (Array.isArray(r)) return r[0] || null;
    if (typeof r === 'string') return r;
    return null;
  }

  // Modal state
  showTaskModal = false;
  modalTask: any | null = null; // task being edited or null for create
  // Preset values for create modal (when selecting a date range)
  createPreset: any | null = null;

  ngOnInit(): void {
    // Initialize previous calendar date to one week before today so child receives it on first render
    try {
      const prev = new Date();
      prev.setDate(prev.getDate() - 7);
      this.previousInitialDate = this.formatLocalDate(prev);
    } catch (e) {}

    this.loadInitialData();

    // Prefer state from AuthService; fallback to cookie if available
    this.myEmployeeId = this.authState.employeeId ?? this.parseCookieNumber('employeeId');

    // Keep `myEmployeeId` in sync with AuthStateService.session$ so filters
    // (My Projects / Created By Me) update when login state changes.
    this.authState.session$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          const newId = this.authState.employeeId ?? undefined;
          if (newId !== this.myEmployeeId) {
            this.myEmployeeId = newId;
            this.applyCurrentFilters();
          }
        }
      });

    // Ensure auth state is populated if a session cookie exists
    this.ensureAuthState();
  }

  private ensureAuthState(): void {
    if (this.authState.employeeId != null) return;
    try {
      this.authApi.me().pipe(takeUntil(this.destroy$)).subscribe({
        next: (me) => {
          try { this.authState.setSession(me); } catch (e) {}
        },
        error: () => {}
      });
    } catch (e) {}
  }

  private parseCookieNumber(name: string): number | undefined {
    try {
      const re = new RegExp('(^|; )' + name.replace(/([.$?*|{}()\[\]\\/+^])/g, '\\$1') + '=([^;]*)');
      const match = document.cookie.match(re);
      if (match) return Number(match[2]);
    } catch (e) {}
    return undefined;
  }

  @ViewChild('primaryCalendar') private calendarPrimary?: ScheduleCalendar;
  @ViewChild('previousCalendar') private calendarPrevious?: ScheduleCalendar;
  // Date (ISO string YYYY-MM-DD) to pass as initialDate to the previous-week calendar
  previousInitialDate: string | null = null;

  private formatLocalDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewInit(): void {
    // Position the secondary calendar to the previous week relative to today initially
    try {
      const prev = new Date();
      prev.setDate(prev.getDate() - 7);
      const prevStr = this.formatLocalDate(prev);
      this.previousInitialDate = prevStr;
      // also attempt to navigate if calendar API already present
      setTimeout(() => this.calendarPrevious?.goToDate(prev), 250);
    } catch (e) {}
  }

  /**
   * Carga datos iniciales (tareas, festivos, proyectos, categorías)
   */
  private loadInitialData(): void {
    this.isLoadingInitialData = true;

    forkJoin({
      tasks: this.generalTaskService.getAll(),
      holidays: this.holidayService.getCurrent(),
      projects: this.projectService.getAll(),
      categories: this.categoryService.getAll(),
      employees: this.employeeService.getAll()
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (data) => {
        this.allTasks = data.tasks;
        this.holidays = this.holidayService.combineHolidays(data.holidays);
        this.projects = data.projects;
        this.categories = data.categories;
        this.employees = data.employees || [];
        
        this.applyCurrentFilters();
        this.isLoadingInitialData = false;
      },
      error: (error) => {
        console.error('Error loading initial data:', error);
        this.isLoadingInitialData = false;
      }
    });
  }

  /**
   * Recarga solo las tareas
   */
  reloadTasks(): void {
    this.isLoadingTasks = true;
    
    this.generalTaskService.getAll(true) // forceRefresh = true
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tasks) => {
          this.allTasks = tasks;
          this.applyCurrentFilters();
          this.isLoadingTasks = false;
        },
        error: (error) => {
          console.error('Error reloading tasks:', error);
          this.isLoadingTasks = false;
        }
      });
  }

  /**
   * Recarga festivos para un año específico
   */
  reloadHolidays(year?: number): void {
    this.isLoadingHolidays = true;
    const targetYear = year || new Date().getFullYear();
    
    this.holidayService.getByYear(targetYear)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.holidays = this.holidayService.combineHolidays(response);
          this.isLoadingHolidays = false;
        },
        error: (error) => {
          console.error('Error loading holidays:', error);
          this.isLoadingHolidays = false;
        }
      });
  }

  /**
   * Aplica los filtros actuales a las tareas
   */
  applyCurrentFilters(): void {
    const currentEmployeeId = this.resolveCurrentEmployeeId();
    const currentUsername = this.authState.username || undefined;

    this.filteredTasks = applyFilters(this.allTasks, this.filters, { projects: this.projects, myEmployeeId: currentEmployeeId, username: currentUsername });
  }

  /**
   * When primary calendar's visible range changes, move the previous calendar
   * to show the week immediately before the primary's start date.
   */
  onPrimaryDateRangeChange(range: { start: Date; end: Date }): void {
    try {
      const prevStart = new Date(range.start);
      prevStart.setDate(prevStart.getDate() - 7);
      this.previousInitialDate = this.formatLocalDate(prevStart);
      // attempt to navigate previous calendar and ensure it's in week view
      try {
        this.calendarPrevious?.goToDate(prevStart);
        this.calendarPrevious?.changeView('dayGridWeek');
      } catch (e) {
        // retry shortly if API not ready
        setTimeout(() => {
          try { 
            this.calendarPrevious?.goToDate(prevStart); this.calendarPrevious?.changeView('dayGridWeek'); 
          } catch (e) {}
        }, 200);
      }
    } catch (e) {}
  }


  /**
   * Manejador de click en una tarea del calendario
   */
  onTaskClick(task: GeneralTask): void {
    // Open edit modal only if user is creator or ADMIN/OWNER — schedule-task-modal enforces form disable
    this.modalTask = task;
    this.showTaskModal = true;
  }

  /**
   * Manejador de selección de fechas en el calendario
   */
  onDateSelect(dateRange: { start: Date; end: Date }): void {
    // Pre-fill create modal with start date
    const formatLocalDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const preset: any = {
      issuedDate: formatLocalDate(dateRange.start),
      endDate: dateRange.end ? formatLocalDate(new Date(dateRange.end.getTime() - 1)) : ''
    };
    this.createPreset = preset;
    this.modalTask = null; // ensure create modal is shown
    this.showTaskModal = true;
  }

  // Open create modal helper used by template button
  openCreateModal(): void {
    this.modalTask = null;
    this.createPreset = null;
    this.showTaskModal = true;
  }

  /**
   * Crea una nueva tarea
   */
  createTask(taskData: Partial<GeneralTask>): void {
    this.generalTaskService.create(taskData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newTask) => {
          this.reloadTasks();
        },
        error: (error) => {
          console.error('Error creating task:', error);
        }
      });
  }

  /**
   * Actualiza una tarea existente
   */
  updateTask(taskId: number, taskData: Partial<GeneralTask>): void {
    this.generalTaskService.update(taskId, taskData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedTask) => {
          this.reloadTasks();
        },
        error: (error) => {
          console.error('Error updating task:', error);
        }
      });
  }

  /**
   * Elimina una tarea
   */
  deleteTask(taskId: number): void {
    this.generalTaskService.delete(taskId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.reloadTasks();
        },
        error: (error) => {
          console.error('Error deleting task:', error);
        }
      });
  }

  // Handlers for modal events
  onModalSave(_: any): void {
    // Modal already performed save; just refresh list and close
    this.reloadTasks();
    this.showTaskModal = false;
    this.modalTask = null;
  }

  // New unified handler used by create/edit modals when they emit saved/created
  onModalSaved(_: any): void {
    this.reloadTasks();
    this.showTaskModal = false;
    this.modalTask = null;
  }

  onModalClose(): void {
    this.showTaskModal = false;
    this.modalTask = null;
  }

  /**
   * Filtra tareas por proyecto
   */
  filterByProject(projectId: number): void {
    if (this.filters.projectIds.includes(projectId)) {
      this.filters.projectIds = this.filters.projectIds.filter((id: number) => id !== projectId);
    } else {
      this.filters.projectIds.push(projectId);
    }
    this.applyCurrentFilters();
  }

  /**
   * Filtra tareas por categoría
   */
  filterByCategory(categoryId: number): void {
    if (this.filters.categoryIds.includes(categoryId)) {
      this.filters.categoryIds = this.filters.categoryIds.filter((id: number) => id !== categoryId);
    } else {
      this.filters.categoryIds.push(categoryId);
    }
    this.applyCurrentFilters();
  }

  /**
   * Limpia todos los filtros
   */
  // clearFilters handled by ScheduleFiltersComponent
  onFiltersChange(filters: ScheduleFilters): void {
    this.filters = { ...filters };
    this.applyCurrentFilters();
  }

  private resolveCurrentEmployeeId(): number | undefined {
    // Prefer explicit auth state
    const id = this.authState.employeeId;
    if (id != null) return Number(id);

    // Use cached myEmployeeId if present
    if (this.myEmployeeId != null) return Number(this.myEmployeeId);

    // Cookie fallback
    const cookieId = this.parseCookieNumber('employeeId');
    if (cookieId != null) return cookieId;

    // Try to resolve from loaded employees using username/email
    const currentUsername = this.authState.username;
    if (currentUsername && Array.isArray(this.employees) && this.employees.length > 0) {
      const uname = String(currentUsername).toLowerCase();
      const found = this.employees.find((e: any) => String(e.accountUsername || e.username || e.email || '').toLowerCase() === uname);
      if (found && found.id) return Number(found.id);
    }

    return undefined;
  }
}
