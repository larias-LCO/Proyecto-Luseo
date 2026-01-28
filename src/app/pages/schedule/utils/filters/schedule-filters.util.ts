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

    // Only apply this filter when we can resolve the current user (id or username)
    if (filters.myProjectsOnly && context?.projects && (context.myEmployeeId != null || context.username)) {
      let allowed: number[] = [];

      // Prefer numeric employee id matching when available
      if (context.myEmployeeId != null) {
        allowed = (context.projects || []).filter(p => {
          const empIds = (p.employeeIds || []).map((id: any) => Number(id));
          const pmIds = (p.pmIds || []).map((id: any) => Number(id));
          return empIds.includes(Number(context.myEmployeeId)) || pmIds.includes(Number(context.myEmployeeId));
        }).map(p => p.id);
      } else if (context.username) {
        // Fallback: match by username against employeeNames or pmNames (case-insensitive)
        const uname = String(context.username).toLowerCase();
        allowed = (context.projects || []).filter(p => {
          const empNames = (p.employeeNames || []).map((n: any) => String(n).toLowerCase());
          const pmNames = (p.pmNames || []).map((n: any) => String(n).toLowerCase());
          return empNames.includes(uname) || pmNames.includes(uname);
        }).map(p => p.id);
      }

      if (effectiveProjectIds && effectiveProjectIds.length > 0) {
        effectiveProjectIds = effectiveProjectIds.filter(id => allowed.includes(id));
      } else {
        effectiveProjectIds = allowed;
      }
  }
  
  // Filtrar por proyectos (usar effectiveProjectIds si fue calculado).
  // Nota: si effectiveProjectIds es [] significa que no hay proyectos permitidos → devolver none.
  if (effectiveProjectIds !== null) {
    filtered = filtered.filter((task: any) => {
      if (task == null || task.projectId == null) return false;
      return effectiveProjectIds!.includes(Number(task.projectId));
    });
  }
  
  // Filtrar por categorías
  if (filters.categoryIds.length > 0) {
    filtered = filtered.filter(task => 
      filters.categoryIds.includes(task.taskCategoryId)
    );
  }

  // Filtrar por creador (tareas creadas por la cuenta logueada)
  if (filters.createdByMe && context?.myEmployeeId != null) {
    filtered = filtered.filter((task: any) => {
      const creatorId = Number(
        task.createdByEmployeeId ??
        task.createByEmployeeId ??
        task.created_by_employee_id ??
        task.create_by_employee_id ??
        NaN
      );
      const currentId = Number(context.myEmployeeId);
      return !isNaN(creatorId) && !isNaN(currentId) && creatorId === currentId;
    });
  }
  
  return filtered;
}