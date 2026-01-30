import { EventApi } from '@fullcalendar/core';

/**
 * Prioridades para ordenar eventos en el calendario
 */
const EVENT_PRIORITIES = {
  HOLIDAY: 100,
  OUT_OF_OFFICE: 200,
  GENERAL_TASK: 300
} as const;

/**
 * Prioridades secundarias para tipos de proyecto
 */
const PROJECT_TYPE_PRIORITIES = {
  COMMERCIAL: 1,
  RESIDENTIAL: 2,
  OTHER: 3
} as const;

/**
 * Determina si un evento es un festivo
 */
function isHolidayEvent(event: EventApi): boolean {
  return !!(event.extendedProps?.['isHoliday'] || 
            event.extendedProps?.['task']?.isHoliday ||
            event.extendedProps?.['type'] === 'HOLIDAY');
}

/**
 * Determina si un evento es "Out of Office"
 */
function isOutOfOfficeEvent(event: EventApi): boolean {
  // Verificar propiedad directa en extendedProps
  if (event.extendedProps?.['isOutOfOffice']) {
    return true;
  }

  // Verificar por classNames
  if (event.classNames?.includes('out-of-office-event')) {
    return true;
  }

  // Verificar por nombre de categoría en extendedProps
  const categoryName = event.extendedProps?.['categoryName'];
  if (categoryName) {
    const catName = String(categoryName).toLowerCase();
    if (catName.includes('out of office')) {
      return true;
    }
  }

  // Verificar por nombre de categoría en task
  const task = event.extendedProps?.['task'] || event.extendedProps?.['fullTask'];
  if (task?.taskCategoryName) {
    const taskCategoryName = String(task.taskCategoryName).toLowerCase();
    return taskCategoryName.includes('out of office');
  }

  return false;
}

/**
 * Obtiene la prioridad principal de un evento
 */
function getEventPriority(event: EventApi): number {
  if (isHolidayEvent(event)) {
    return EVENT_PRIORITIES.HOLIDAY;
  }
  
  if (isOutOfOfficeEvent(event)) {
    return EVENT_PRIORITIES.OUT_OF_OFFICE;
  }
  
  return EVENT_PRIORITIES.GENERAL_TASK;
}

/**
 * Obtiene la prioridad del tipo de proyecto
 */
function getProjectTypePriority(projectType?: string): number {
  if (!projectType) return PROJECT_TYPE_PRIORITIES.OTHER;
  
  const type = projectType.toUpperCase();
  if (type === 'COMMERCIAL') return PROJECT_TYPE_PRIORITIES.COMMERCIAL;
  if (type === 'RESIDENTIAL') return PROJECT_TYPE_PRIORITIES.RESIDENTIAL;
  
  return PROJECT_TYPE_PRIORITIES.OTHER;
}

/**
 * Compara dos general tasks para ordenamiento secundario
 */
function compareGeneralTasks(eventA: EventApi, eventB: EventApi): number {
  const taskA = eventA.extendedProps?.['task'] || eventA.extendedProps?.['fullTask'] || {};
  const taskB = eventB.extendedProps?.['task'] || eventB.extendedProps?.['fullTask'] || {};

  // Comparar por tipo de proyecto
  const typeAPriority = getProjectTypePriority(taskA.projectType);
  const typeBPriority = getProjectTypePriority(taskB.projectType);
  
  if (typeAPriority !== typeBPriority) {
    return typeAPriority - typeBPriority;
  }

  // Comparar por código de proyecto
  const codeA = (taskA.projectCode || '').toUpperCase();
  const codeB = (taskB.projectCode || '').toUpperCase();
  
  if (codeA !== codeB) {
    return codeA.localeCompare(codeB);
  }

  // Comparar por nombre de tarea
  const nameA = (taskA.name || '').toUpperCase();
  const nameB = (taskB.name || '').toUpperCase();
  
  return nameA.localeCompare(nameB);
}

/**
 * Función de ordenamiento de eventos para FullCalendar
 * 
 * Orden de prioridad:
 * 1. Holidays (100) - se muestran primero
 * 2. Out of Office (200) - se muestran segundo
 * 3. General Tasks (300) - se muestran último
 * 
 * Para General Tasks se aplica ordenamiento secundario:
 * - Por tipo de proyecto (COMMERCIAL > RESIDENTIAL > OTROS)
 * - Por código de proyecto (alfabético)
 * - Por nombre de tarea (alfabético)
 */
export function eventOrderComparator(eventA: EventApi, eventB: EventApi): number {
  // Obtener prioridades principales
  const priorityA = getEventPriority(eventA);
  const priorityB = getEventPriority(eventB);

  // Si tienen diferentes prioridades, ordenar por prioridad
  if (priorityA !== priorityB) {
    return priorityA - priorityB;
  }

  // Si ambos son general tasks, aplicar ordenamiento secundario
  if (priorityA === EVENT_PRIORITIES.GENERAL_TASK) {
    return compareGeneralTasks(eventA, eventB);
  }

  // Para holidays y out of office, mantener orden de inserción
  return 0;
}
