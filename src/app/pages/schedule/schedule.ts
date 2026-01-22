import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, forkJoin } from 'rxjs';

// Componentes de UI
import { HeaderComponent } from '../../core/components/header/header';
import { SubmenuComponent } from '../../core/components/submenu/submenu';
import { ScheduleCalendar } from './components/schedule-calendar/schedule-calendar';

// Servicios
import { GeneralTaskService } from './services/general-task.service';
import { HolidayService, Holiday } from './services/holiday.service';
import { ProjectService, Project } from './services/project.service';
import { TaskCategoryService } from './services/task-category.service';

// Modelos
import { GeneralTask } from './models/general-task.model';
import { TaskCategory } from './models/task-category.model';

// Utilidades
import { applyFilters, createDefaultFilters, ScheduleFilters } from './utils/filters/schedule-filters.util';

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    SubmenuComponent,
    ScheduleCalendar
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
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
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
      categories: this.categoryService.getAll()
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (data) => {
        this.allTasks = data.tasks;
        this.holidays = this.holidayService.combineHolidays(data.holidays);
        this.projects = data.projects;
        this.categories = data.categories;
        
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
    this.filteredTasks = applyFilters(this.allTasks, this.filters);
  }


  /**
   * Manejador de click en una tarea del calendario
   */
  onTaskClick(task: GeneralTask): void {
    // TODO: Abrir modal con los detalles de la tarea
  }

  /**
   * Manejador de selección de fechas en el calendario
   */
  onDateSelect(dateRange: { start: Date; end: Date }): void {
    // TODO: Abrir modal para crear una nueva tarea
  }

  /**
   * Manejador de cambio de rango de fechas visible en el calendario
   */
  onDateRangeChange(dateRange: { start: Date; end: Date }): void {
    this.filters.dateRangeStart = dateRange.start;
    this.filters.dateRangeEnd = dateRange.end;
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

  /**
   * Toggle para mostrar/ocultar festivos
   */
  toggleHolidays(): void {
    this.showHolidays = !this.showHolidays;
  }

  /**
   * Filtra tareas por proyecto
   */
  filterByProject(projectId: number): void {
    if (this.filters.projectIds.includes(projectId)) {
      this.filters.projectIds = this.filters.projectIds.filter(id => id !== projectId);
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
      this.filters.categoryIds = this.filters.categoryIds.filter(id => id !== categoryId);
    } else {
      this.filters.categoryIds.push(categoryId);
    }
    this.applyCurrentFilters();
  }

  /**
   * Limpia todos los filtros
   */
  clearFilters(): void {
    this.filters = createDefaultFilters();
    this.applyCurrentFilters();
  }
}
