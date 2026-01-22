import { GeneralTask } from '../../models/general-task.model';
import { TaskCategory } from '../../models/task-category.model';
import { Project } from '../../services/project.service';

/**
 * Interfaz para el payload de creación de GeneralTask
 */
export interface CreateGeneralTaskPayload {
  name: string;
  description: string | null;
  issuedDate: string; // ISO format YYYY-MM-DD
  endDate: string | null; // ISO format YYYY-MM-DD
  taskCategoryId: number;
  projectId: number;
  projectPhaseId: number;
  personalTask: boolean;
}

/**
 * Interfaz para el payload de actualización de GeneralTask
 */
export interface UpdateGeneralTaskPayload extends Partial<CreateGeneralTaskPayload> {
  status?: string;
}

/**
 * Mapea GeneralTask del backend al modelo del frontend
 * Asegura que las fechas sean objetos Date
 */
export function mapGeneralTaskFromBackend(task: any): GeneralTask {
  // Intentar múltiples nombres de campo para la fecha (issuedDate es el campo principal)
  const issuedDateValue = task.issuedDate || task.issued_date || task.issueDate || task.issue_date || task.startDate || task.start_date || task.date;
  const endDateValue = task.endDate || task.end_date || task.dueDate || task.due_date;

  return {
    id: task.id,
    name: task.name,
    description: task.description,
    issuedDate: issuedDateValue ? new Date(issuedDateValue) : null as any,
    endDate: endDateValue ? new Date(endDateValue) : null,
    
    taskCategoryName: task.taskCategoryName || task.task_category_name || '',
    taskCategoryId: task.taskCategoryId || task.task_category_id,
    taskCategoryColorHex: task.taskCategoryColorHex || task.task_category_color_hex || '#6c757d',
    
    projectName: task.projectName || task.project_name || '',
    projectId: task.projectId || task.project_id,
    projectCode: task.projectCode || task.project_code || '',
    projectType: task.projectType || task.project_type || '',
    projectManagerName: task.projectManagerName || task.project_manager_name || '',
    
    projectPhaseName: task.projectPhaseName || task.project_phase_name || '',
    projectPhaseId: task.projectPhaseId || task.project_phase_id,
    
    createByEmployeeName: task.createByEmployeeName || task.create_by_employee_name || '',
    createByEmployeeId: task.createByEmployeeId || task.create_by_employee_id,
    
    personalTask: task.personalTask || task.personal_task || false,
    personal_task: task.personal_task || task.personalTask || false,
    status: task.status
  };
}

/**
 * Mapea array de GeneralTasks del backend
 */
export function mapGeneralTasksFromBackend(tasks: any[]): GeneralTask[] {
  return (tasks || []).map(mapGeneralTaskFromBackend);
}

/**
 * Mapea GeneralTask del frontend al payload para el backend
 * Convierte fechas a formato ISO string
 */
export function mapGeneralTaskToBackend(task: Partial<GeneralTask>): CreateGeneralTaskPayload | UpdateGeneralTaskPayload {
  const payload: any = {};
  
  if (task.name !== undefined) payload.name = task.name;
  if (task.description !== undefined) payload.description = task.description;
  if (task.issuedDate !== undefined) {
    payload.issuedDate = task.issuedDate instanceof Date 
      ? task.issuedDate.toISOString().split('T')[0]
      : task.issuedDate;
  }
  if (task.endDate !== undefined) {
    payload.endDate = task.endDate 
      ? (task.endDate instanceof Date 
          ? task.endDate.toISOString().split('T')[0]
          : task.endDate)
      : null;
  }
  if (task.taskCategoryId !== undefined) payload.taskCategoryId = task.taskCategoryId;
  if (task.projectId !== undefined) payload.projectId = task.projectId;
  if (task.projectPhaseId !== undefined) payload.projectPhaseId = task.projectPhaseId;
  if (task.personalTask !== undefined) payload.personalTask = task.personalTask;
  if (task.status !== undefined) payload.status = task.status;
  
  return payload;
}

/**
 * Crea un payload para nueva GeneralTask con valores por defecto
 */
export function createDefaultGeneralTaskPayload(): Partial<CreateGeneralTaskPayload> {
  return {
    name: '',
    description: null,
    issuedDate: new Date().toISOString().split('T')[0],
    endDate: null,
    personalTask: false
  };
}

/**
 * Valida que un payload de GeneralTask tenga los campos requeridos
 */
export function validateGeneralTaskPayload(payload: Partial<CreateGeneralTaskPayload>): string[] {
  const errors: string[] = [];
  
  if (!payload.name || payload.name.trim() === '') {
    errors.push('El nombre es requerido');
  }
  if (!payload.issuedDate) {
    errors.push('La fecha de inicio es requerida');
  }
  if (!payload.taskCategoryId) {
    errors.push('La categoría es requerida');
  }
  if (!payload.projectId) {
    errors.push('El proyecto es requerido');
  }
  if (!payload.projectPhaseId) {
    errors.push('La fase del proyecto es requerida');
  }
  
  // Validar que la fecha de fin sea posterior a la fecha de inicio
  if (payload.issuedDate && payload.endDate) {
    const startDate = new Date(payload.issuedDate);
    const endDate = new Date(payload.endDate);
    if (endDate < startDate) {
      errors.push('La fecha de fin debe ser posterior a la fecha de inicio');
    }
  }
  
  return errors;
}

/**
 * Enriquece una GeneralTask con información adicional de categoría
 */
export function enrichGeneralTaskWithCategory(
  task: GeneralTask,
  category: TaskCategory
): GeneralTask {
  return {
    ...task,
    taskCategoryName: category.name,
    taskCategoryColorHex: category.colorHex
  };
}

/**
 * Enriquece una GeneralTask con información adicional de proyecto
 */
export function enrichGeneralTaskWithProject(
  task: GeneralTask,
  project: Project
): GeneralTask {
  return {
    ...task,
    projectName: project.name,
    projectCode: project.projectCode,
    projectType: project.projectType
  };
}

/**
 * Filtra tareas por fecha
 */
export function filterTasksByDateRange(
  tasks: GeneralTask[],
  startDate: Date,
  endDate: Date
): GeneralTask[] {
  return tasks.filter(task => {
    const taskStart = task.issuedDate instanceof Date ? task.issuedDate : new Date(task.issuedDate);
    const taskEnd = task.endDate ? (task.endDate instanceof Date ? task.endDate : new Date(task.endDate)) : taskStart;
    
    // La tarea está en el rango si:
    // - Empieza dentro del rango
    // - Termina dentro del rango
    // - O abarca todo el rango
    return (taskStart >= startDate && taskStart <= endDate) ||
           (taskEnd >= startDate && taskEnd <= endDate) ||
           (taskStart <= startDate && taskEnd >= endDate);
  });
}

/**
 * Agrupa tareas por categoría
 */
export function groupTasksByCategory(tasks: GeneralTask[]): Map<number, GeneralTask[]> {
  const grouped = new Map<number, GeneralTask[]>();
  
  tasks.forEach(task => {
    const categoryId = task.taskCategoryId;
    if (!grouped.has(categoryId)) {
      grouped.set(categoryId, []);
    }
    grouped.get(categoryId)!.push(task);
  });
  
  return grouped;
}

/**
 * Agrupa tareas por proyecto
 */
export function groupTasksByProject(tasks: GeneralTask[]): Map<number, GeneralTask[]> {
  const grouped = new Map<number, GeneralTask[]>();
  
  tasks.forEach(task => {
    const projectId = task.projectId;
    if (!grouped.has(projectId)) {
      grouped.set(projectId, []);
    }
    grouped.get(projectId)!.push(task);
  });
  
  return grouped;
}

export default {
  mapGeneralTaskFromBackend,
  mapGeneralTasksFromBackend,
  mapGeneralTaskToBackend,
  createDefaultGeneralTaskPayload,
  validateGeneralTaskPayload,
  enrichGeneralTaskWithCategory,
  enrichGeneralTaskWithProject,
  filterTasksByDateRange,
  groupTasksByCategory,
  groupTasksByProject
};
