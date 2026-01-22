import { EventInput } from '@fullcalendar/core';
import { GeneralTask } from '../../models/general-task.model';
import { Holiday } from '../../services/holiday.service';
import { darkenColor, getContrastColor } from '../color.util';

/**
 * Mapea GeneralTasks a eventos de FullCalendar
 * Usa el color de la categoría (taskCategoryColorHex) para cada evento
 */
export function mapGeneralTasksToEvents(tasks: GeneralTask[] = []): EventInput[] {
  // Filtrar tareas sin fecha válida
  const validTasks = (tasks || []).filter(task => task.issuedDate);
  
  const events = validTasks.map(task => {
    // Convertir fecha de inicio a formato ISO string
    let startDate: string;
    try {
      const issuedDate: any = task.issuedDate;
      
      if (issuedDate instanceof Date) {
        startDate = issuedDate.toISOString().split('T')[0];
      } else if (typeof issuedDate === 'string') {
        startDate = issuedDate.split('T')[0];
      } else {
        // Fallback: convertir a Date y luego a string
        const date = new Date(issuedDate);
        if (isNaN(date.getTime())) {
          throw new Error(`Invalid date: ${issuedDate}`);
        }
        startDate = date.toISOString().split('T')[0];
      }
    } catch (error) {
      console.error('Error converting issueDate for task:', task, error);
      // Si falla la conversión, skip this task
      return null;
    }

    // Convert end date for multi-day tasks
    let endDate: string | undefined = undefined;
    
    if (task.endDate) {
      try {
        const taskEndDate: any = task.endDate;
        let endDateObj: Date;
        
        if (taskEndDate instanceof Date) {
          endDateObj = taskEndDate;
        } else if (typeof taskEndDate === 'string') {
          endDateObj = new Date(taskEndDate.split('T')[0]);
        } else {
          endDateObj = new Date(taskEndDate);
        }
        
        if (!isNaN(endDateObj.getTime())) {
          // FullCalendar requires endDate to be EXCLUSIVE (day after the last day)
          // So we add 1 day for correct display
          endDateObj.setDate(endDateObj.getDate() + 1);
          endDate = endDateObj.toISOString().split('T')[0];
        }
      } catch (error) {
        console.error('Error converting endDate for task:', task, error);
      }
    }

    const classNames = ['general-task-event'];
    if (task.personalTask || task.personal_task) {
      classNames.push('personal-task-event');
    }

    const mappedEvent = {
      id: `task-${task.id}`,
      title: task.name,
      start: startDate,
      end: endDate,
      allDay: true,
      backgroundColor: task.taskCategoryColorHex || '#6c757d',
      borderColor: darkenColor(task.taskCategoryColorHex || '#6c757d', 30),
      textColor: getContrastColor(task.taskCategoryColorHex || '#fff'),
      classNames: classNames,
      extendedProps: {
        type: 'GENERAL_TASK',
        taskId: task.id,
        taskName: task.name,
        description: task.description,
        status: task.status,
        
        // Información de categoría
        categoryId: task.taskCategoryId,
        categoryName: task.taskCategoryName,
        categoryColor: task.taskCategoryColorHex,
        
        // Información de proyecto
        projectId: task.projectId,
        projectName: task.projectName,
        projectCode: task.projectCode,
        projectType: task.projectType,
        projectManagerName: task.projectManagerName,
        
        // Información de fase
        phaseId: task.projectPhaseId,
        phaseName: task.projectPhaseName,
        
        // Información de creador
        createdByEmployeeId: task.createByEmployeeId,
        createdByEmployeeName: task.createByEmployeeName,
        
        // Flags
        isPersonalTask: task.personalTask || task.personal_task,
        isGeneralTask: true,
        
        // Datos completos para modales/detalles
        fullTask: task
      }
    };
    
    return mappedEvent;
  }).filter(event => event !== null) as EventInput[];
  
  return events;
}

/**
 * Mapea festivos (holidays) a eventos de FullCalendar
 * Los festivos se muestran con un color distintivo
 */
export function mapHolidaysToEvents(holidays: Holiday[] = []): EventInput[] {
  return (holidays || []).map((holiday, index) => {
    // Asegurar formato de fecha correcto
    let dateStr = holiday.date;
    if (typeof dateStr === 'string') {
      dateStr = dateStr.split('T')[0]; // Tomar solo YYYY-MM-DD
    }

    // Determinar nombre del país
    const countryName = holiday.countryCode === 'CO' ? 'Colombia' : 
                       holiday.countryCode === 'US' ? 'United States' : 
                       holiday.countryCode || 'Unknown';

    return {
      id: `holiday-${holiday.countryCode}-${holiday.date}-${index}`,
      title: `🎉 ${holiday.localName || holiday.name}`,
      start: dateStr,
      allDay: true,
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      textColor: '#000000',
      classNames: ['holiday-event'],
      extendedProps: {
        type: 'HOLIDAY',
        holidayName: holiday.name,
        localName: holiday.localName,
        countryCode: holiday.countryCode,
        countryName: countryName,
        isFixed: holiday.fixed,
        isGlobal: holiday.global,
        types: holiday.types,
        isHoliday: true
      }
    };
  });
}

/**
 * Combina general tasks y holidays en un solo array de eventos
 * Tareas primero, luego festivos para mejor visualización
 */
export function mapScheduleDataToEvents(
  tasks: GeneralTask[] = [],
  holidays: Holiday[] = []
): EventInput[] {
  const taskEvents = mapGeneralTasksToEvents(tasks);
  const holidayEvents = mapHolidaysToEvents(holidays);
  
  return [...taskEvents, ...holidayEvents]; // Tareas primero, festivos después
}

/**
 * Filtra eventos por tipo
 */
export function filterEventsByType(events: EventInput[], type: 'GENERAL_TASK' | 'HOLIDAY'): EventInput[] {
  return events.filter(e => e.extendedProps?.['type'] === type);
}

/**
 * Filtra eventos por rango de fechas
 */
export function filterEventsByDateRange(
  events: EventInput[],
  startDate: Date,
  endDate: Date
): EventInput[] {
  return events.filter(e => {
    if (!e.start) return false;
    const eventDate = typeof e.start === 'string' ? new Date(e.start) : new Date(e.start as any);
    return eventDate >= startDate && eventDate <= endDate;
  });
}

export default {
  mapGeneralTasksToEvents,
  mapHolidaysToEvents,
  mapScheduleDataToEvents,
  filterEventsByType,
  filterEventsByDateRange
};
