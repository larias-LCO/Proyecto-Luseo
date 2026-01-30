import { GeneralTask } from '../../models/general-task.model';
import { ScheduleFilters } from './schedule-filters.model';
import { Project } from '../../services/project.service';

/**
 * Aplica filtros a un array de tareas
 */
export function applyFilters(tasks: GeneralTask[], filters: ScheduleFilters, context?: { projects?: Project[]; myEmployeeId?: number; username?: string }): GeneralTask[] {
  let filtered = [...tasks];

  // Handle myProjectsOnly: compute effective projectIds based on context.projects and context.myEmployeeId
  let effectiveProjectIds: number[] | null = null;
  if (filters.projectIds && filters.projectIds.length > 0) {
    effectiveProjectIds = [...filters.projectIds];
  }

  if (filters.myProjectsOnly && context?.myEmployeeId != null && context?.projects) {
    const allowed = (context.projects || []).filter(p => {
      const empIds = (p.employeeIds || []).map(id => Number(id));
      const pmIds = (p.pmIds || []).map(id => Number(id));
      return empIds.includes(Number(context.myEmployeeId)) || pmIds.includes(Number(context.myEmployeeId));
    }).map(p => p.id);

    if (effectiveProjectIds && effectiveProjectIds.length > 0) {
      effectiveProjectIds = effectiveProjectIds.filter(id => allowed.includes(id));
    } else {
      effectiveProjectIds = allowed;
    }
  }
  
  // Filtrar por proyectos (usar effectiveProjectIds si fue calculado).
  // Nota: si effectiveProjectIds es [] significa que no hay proyectos permitidos → devolver none.
  if (effectiveProjectIds !== null) {
    filtered = filtered.filter(task => effectiveProjectIds!.includes(task.projectId));
  }
  
  // Filtrar por categorías
  if (filters.categoryIds.length > 0) {
    filtered = filtered.filter(task => 
      filters.categoryIds.includes(task.taskCategoryId)
    );
  }

  // Filtrar por creador (tareas creadas por la cuenta logueada)
  if (filters.createdByMe && context?.myEmployeeId) {
    filtered = filtered.filter((task: any) => {
      const creatorId = task.createdByEmployeeId || task.createByEmployeeId;
      return creatorId && Number(creatorId) === Number(context.myEmployeeId);
    });
  }
  
  return filtered;
}