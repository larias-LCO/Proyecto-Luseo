import { GeneralTask } from '../../models/general-task.model';

/**
 * Interfaz para los filtros de tareas en el calendario
 */
export interface ScheduleFilters {
  projectIds: number[];
  categoryIds: number[];
  showPersonalTasks: boolean;
  showHolidays: boolean;
  dateRangeStart?: Date;
  dateRangeEnd?: Date;
  searchText?: string;
}

/**
 * Crea filtros por defecto
 */
export function createDefaultFilters(): ScheduleFilters {
  return {
    projectIds: [],
    categoryIds: [],
    showPersonalTasks: true,
    showHolidays: true,
    dateRangeStart: undefined,
    dateRangeEnd: undefined,
    searchText: ''
  };
}

/**
 * Aplica filtros a un array de tareas
 */
export function applyFilters(tasks: GeneralTask[], filters: ScheduleFilters): GeneralTask[] {
  let filtered = [...tasks];
  
  // Filtrar por proyectos
  if (filters.projectIds.length > 0) {
    filtered = filtered.filter(task => 
      filters.projectIds.includes(task.projectId)
    );
  }
  
  // Filtrar por categorías
  if (filters.categoryIds.length > 0) {
    filtered = filtered.filter(task => 
      filters.categoryIds.includes(task.taskCategoryId)
    );
  }
  
  // Filtrar tareas personales
  if (!filters.showPersonalTasks) {
    filtered = filtered.filter(task => 
      !task.personalTask && !task.personal_task
    );
  }
  
  // Filtrar por rango de fechas
  if (filters.dateRangeStart && filters.dateRangeEnd) {
    filtered = filtered.filter(task => {
      const taskStart = task.issuedDate instanceof Date ? task.issuedDate : new Date(task.issuedDate);
      const taskEnd = task.endDate 
        ? (task.endDate instanceof Date ? task.endDate : new Date(task.endDate))
        : taskStart;
      
      return (taskStart >= filters.dateRangeStart! && taskStart <= filters.dateRangeEnd!) ||
             (taskEnd >= filters.dateRangeStart! && taskEnd <= filters.dateRangeEnd!) ||
             (taskStart <= filters.dateRangeStart! && taskEnd >= filters.dateRangeEnd!);
    });
  }
  
  // Filtrar por texto de búsqueda
  if (filters.searchText && filters.searchText.trim() !== '') {
    const searchLower = filters.searchText.toLowerCase();
    filtered = filtered.filter(task =>
      task.name.toLowerCase().includes(searchLower) ||
      task.description?.toLowerCase().includes(searchLower) ||
      task.projectName.toLowerCase().includes(searchLower) ||
      task.taskCategoryName.toLowerCase().includes(searchLower)
    );
  }
  
  return filtered;
}

/**
 * Cuenta tareas por estado
 */
export function countTasksByStatus(tasks: GeneralTask[]): Record<string, number> {
  const counts: Record<string, number> = {};
  
  tasks.forEach(task => {
    const status = task.status || 'UNKNOWN';
    counts[status] = (counts[status] || 0) + 1;
  });
  
  return counts;
}

/**
 * Obtiene tareas para un día específico
 */
export function getTasksForDay(tasks: GeneralTask[], date: Date): GeneralTask[] {
  return tasks.filter(task => {
    const taskStart = task.issuedDate instanceof Date ? task.issuedDate : new Date(task.issuedDate);
    const taskEnd = task.endDate 
      ? (task.endDate instanceof Date ? task.endDate : new Date(task.endDate))
      : taskStart;
    
    // Normalizar fechas a medianoche para comparación
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const normalizedStart = new Date(taskStart.getFullYear(), taskStart.getMonth(), taskStart.getDate());
    const normalizedEnd = new Date(taskEnd.getFullYear(), taskEnd.getMonth(), taskEnd.getDate());
    
    return normalizedDate >= normalizedStart && normalizedDate <= normalizedEnd;
  });
}

/**
 * Obtiene tareas para una semana específica
 */
export function getTasksForWeek(tasks: GeneralTask[], startOfWeek: Date): GeneralTask[] {
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  
  return tasks.filter(task => {
    const taskStart = task.issuedDate instanceof Date ? task.issuedDate : new Date(task.issuedDate);
    const taskEnd = task.endDate 
      ? (task.endDate instanceof Date ? task.endDate : new Date(task.endDate))
      : taskStart;
    
    return (taskStart >= startOfWeek && taskStart <= endOfWeek) ||
           (taskEnd >= startOfWeek && taskEnd <= endOfWeek) ||
           (taskStart <= startOfWeek && taskEnd >= endOfWeek);
  });
}

/**
 * Obtiene tareas para un mes específico
 */
export function getTasksForMonth(tasks: GeneralTask[], year: number, month: number): GeneralTask[] {
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);
  
  return tasks.filter(task => {
    const taskStart = task.issuedDate instanceof Date ? task.issuedDate : new Date(task.issuedDate);
    const taskEnd = task.endDate 
      ? (task.endDate instanceof Date ? task.endDate : new Date(task.endDate))
      : taskStart;
    
    return (taskStart >= startOfMonth && taskStart <= endOfMonth) ||
           (taskEnd >= startOfMonth && taskEnd <= endOfMonth) ||
           (taskStart <= startOfMonth && taskEnd >= endOfMonth);
  });
}

/**
 * Calcula estadísticas de tareas
 */
export interface TaskStatistics {
  total: number;
  byCategory: Record<string, number>;
  byProject: Record<string, number>;
  byStatus: Record<string, number>;
  personal: number;
  nonPersonal: number;
}

export function calculateTaskStatistics(tasks: GeneralTask[]): TaskStatistics {
  const stats: TaskStatistics = {
    total: tasks.length,
    byCategory: {},
    byProject: {},
    byStatus: {},
    personal: 0,
    nonPersonal: 0
  };
  
  tasks.forEach(task => {
    // By category
    const categoryName = task.taskCategoryName || 'No category';
    stats.byCategory[categoryName] = (stats.byCategory[categoryName] || 0) + 1;
    
    // By project
    const projectName = task.projectName || 'No project';
    stats.byProject[projectName] = (stats.byProject[projectName] || 0) + 1;
    
    // By status
    const status = task.status || 'UNKNOWN';
    stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
    
    // Personal vs no personal
    if (task.personalTask || task.personal_task) {
      stats.personal++;
    } else {
      stats.nonPersonal++;
    }
  });
  
  return stats;
}

/**
 * Ordena tareas por fecha de inicio
 */
export function sortTasksByDate(tasks: GeneralTask[], ascending: boolean = true): GeneralTask[] {
  return [...tasks].sort((a, b) => {
    const dateA = a.issuedDate instanceof Date ? a.issuedDate : new Date(a.issuedDate);
    const dateB = b.issuedDate instanceof Date ? b.issuedDate : new Date(b.issuedDate);
    
    return ascending 
      ? dateA.getTime() - dateB.getTime()
      : dateB.getTime() - dateA.getTime();
  });
}

/**
 * Ordena tareas por nombre
 */
export function sortTasksByName(tasks: GeneralTask[], ascending: boolean = true): GeneralTask[] {
  return [...tasks].sort((a, b) => {
    return ascending
      ? a.name.localeCompare(b.name)
      : b.name.localeCompare(a.name);
  });
}

export default {
  createDefaultFilters,
  applyFilters,
  countTasksByStatus,
  getTasksForDay,
  getTasksForWeek,
  getTasksForMonth,
  calculateTaskStatistics,
  sortTasksByDate,
  sortTasksByName
};
