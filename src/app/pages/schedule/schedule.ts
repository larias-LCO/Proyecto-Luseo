import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, forkJoin } from 'rxjs';

// Componentes de UI
import { HeaderComponent } from '../../core/components/header/header';
import { SubmenuComponent } from '../../core/components/submenu/submenu';
import { ScheduleCalendar } from './components/schedule-calendar/schedule-calendar';
import { ScheduleFiltersComponent } from './components/filters/filters.component';
import { ScheduleTaskModal } from './components/modals/schedule-task-modal';

// Servicios
import { GeneralTaskService } from './services/general-task.service';
import { AuthService } from '../../core/services/auth.service';
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
    ScheduleTaskModal
  ],
  templateUrl: './schedule.html',
  styleUrl: './schedule.scss'
})
export class Schedule implements OnInit, OnDestroy {

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
    private categoryService: TaskCategoryService
    ,private employeeService: EmployeeService
    ,public authService: AuthService
  ) {}

  // Return primary role as string or null (safe for template binding)
  getPrimaryRole(): string | null {
    try {
      const r: any = this.authService.getState().role;
      if (!r) return null;
      if (Array.isArray(r)) return r[0] || null;
      if (typeof r === 'string') return r;
      return null;
    } catch (e) {
      return null;
    }
  }

  // Modal state
  showTaskModal = false;
  modalTask: any | null = null; // task being edited or null for create

  ngOnInit(): void {
    this.loadInitialData();
    // Prefer state from AuthService; fallback to cookie if available
    try {
      this.myEmployeeId = this.authService.getState().employeeId;
    } catch (e) {
      // Fallback: try reading cookie set by backend (employeeId)
      const match = document.cookie.match(new RegExp('(^|; )' + 'employeeId'.replace(/([.$?*|{}()\[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
      if (match) this.myEmployeeId = Number(match[2]);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
    // Resolve employee id: prefer live auth state, then stored fallback
    let currentEmployeeId: number | undefined = undefined;
    try {
      currentEmployeeId = this.authService.getState().employeeId;
    } catch (e) {
      currentEmployeeId = undefined;
    }
    if (!currentEmployeeId && this.myEmployeeId) currentEmployeeId = this.myEmployeeId;
    // Final fallback: read cookie
    if (!currentEmployeeId) {
      const match = document.cookie.match(new RegExp('(^|; )' + 'employeeId'.replace(/([.$?*|{}()\[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
      if (match) currentEmployeeId = Number(match[2]);
    }

    const currentUsername = this.authService.getState().username || undefined;
    this.filteredTasks = applyFilters(this.allTasks, this.filters, { projects: this.projects, myEmployeeId: currentEmployeeId, username: currentUsername });
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
    const preset: any = {
      startDate: dateRange.start.toISOString().split('T')[0],
      endDate: dateRange.end ? new Date(dateRange.end.getTime() - 1).toISOString().split('T')[0] : ''
    };
    this.modalTask = preset as any;
    this.showTaskModal = true;
  }

  // Open create modal helper used by template button
  openCreateModal(): void {
    this.modalTask = null;
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

  onModalDelete(id: number): void {
    // Modal already performed delete; refresh list and close
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
}
