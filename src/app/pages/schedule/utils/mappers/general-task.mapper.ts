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
  projectId: number | null;
  projectPhaseId: number;
  // Optional discipline fields
  bim_date?: string | null;
  description_bim?: string | null;
  description_electrical?: string | null;
  description_mechanical?: string | null;
  description_plumbing?: string | null;
  description_structural?: string | null;
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
  const toDateString = (val: any): string | null => {
    if (val === null || val === undefined || val === '') return null;
    try {
      if (typeof val === 'string') {
        const s = val.trim();
        if (s.indexOf('T') > 0) return s.split('T')[0];
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
        if (/^\d+$/.test(s)) {
          let n = Number(s);
          if (s.length === 10) n = n * 1000;
          const d = new Date(n);
          if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
          return s;
        }
        return s;
      }
      if (typeof val === 'number') {
        let n = val;
        if (String(val).length === 10) n = n * 1000;
        const d = new Date(n);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        return null;
      }
      if (val instanceof Date) {
        return val.toISOString().split('T')[0];
      }
    } catch (e) {
      // fallthrough
    }
    return null;
  };

  return {
    id: task.id,
    name: task.name,
    description: task.description,
    issuedDate: toDateString(issuedDateValue) || '',
    endDate: toDateString(endDateValue),
    
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
    
    createByEmployeeName: task.createdByEmployeeName || task.createByEmployeeName || task.create_by_employee_name || task.created_by_employee_name || '',
    createByEmployeeId: task.createdByEmployeeId || task.createByEmployeeId || task.create_by_employee_id || task.created_by_employee_id,
    
    // New discipline / BIM fields
    bim_date: (() => {
      const v = task.bim_date || task.bimDate || null;
      return toDateString(v);
    })(),
    description_bim: task.description_bim || task.descriptionBim || null,
    description_electrical: task.description_electrical || task.descriptionElectrical || null,
    description_mechanical: task.description_mechanical || task.descriptionMechanical || null,
    description_plumbing: task.description_plumbing || task.descriptionPlumbing || null,
    description_structural: task.description_structural || task.descriptionStructural || null,
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
  const formatLocalDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  if (task.issuedDate !== undefined) {
    const v: any = task.issuedDate;
    if (v instanceof Date) payload.issuedDate = formatLocalDate(v);
    else if (typeof v === 'number') {
      let n = v;
      if (String(v).length === 10) n = n * 1000;
      payload.issuedDate = formatLocalDate(new Date(n));
    } else payload.issuedDate = v;
  }
  if (task.endDate !== undefined) {
    const v: any = task.endDate;
    if (!v) payload.endDate = null;
    else if (v instanceof Date) payload.endDate = formatLocalDate(v);
    else if (typeof v === 'number') {
      let n = v;
      if (String(v).length === 10) n = n * 1000;
      payload.endDate = formatLocalDate(new Date(n));
    } else payload.endDate = v;
  }
  if (task.taskCategoryId !== undefined) payload.taskCategoryId = task.taskCategoryId;
  if (task.projectId !== undefined) payload.projectId = task.projectId;
  if (task.projectPhaseId !== undefined) payload.projectPhaseId = task.projectPhaseId;
  if (task.bim_date !== undefined) {
    const v: any = task.bim_date;
    if (!v) payload.bim_date = null;
    else if (v instanceof Date) payload.bim_date = formatLocalDate(v);
    else if (typeof v === 'number') {
      let n = v;
      if (String(v).length === 10) n = n * 1000;
      payload.bim_date = formatLocalDate(new Date(n));
    } else payload.bim_date = v;
  }
  if (task.description_bim !== undefined) payload.description_bim = task.description_bim;
  if (task.description_electrical !== undefined) payload.description_electrical = task.description_electrical;
  if (task.description_mechanical !== undefined) payload.description_mechanical = task.description_mechanical;
  if (task.description_plumbing !== undefined) payload.description_plumbing = task.description_plumbing;
  if (task.description_structural !== undefined) payload.description_structural = task.description_structural;
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
    // discipline fields default to null
    bim_date: null,
    description_bim: null,
    description_electrical: null,
    description_mechanical: null,
    description_plumbing: null,
    description_structural: null
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
    const parseDate = (v: any): Date => {
      if (v instanceof Date) return v;
      if (typeof v === 'string') return new Date(v.split('T')[0]);
      if (typeof v === 'number') {
        let n = v; if (String(v).length === 10) n = n * 1000; return new Date(n);
      }
      return new Date(v);
    };

    const taskStart = parseDate((task as any).issuedDate);
    const taskEnd = task.endDate ? parseDate((task as any).endDate) : taskStart;
    
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
