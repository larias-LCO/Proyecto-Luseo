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

  const events: EventInput[] = [];

  // Para cada tarea, mapeamos a uno o varios eventos (OutOfOffice multi-día -> evento por día)
  for (const task of validTasks) {
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
      continue;
    }

    // Check if this is an Out of Office task
    const categoryName = (task.taskCategoryName || '').toLowerCase();
    const isOutOfOffice = categoryName.includes('out of office');

    // For ordering
    const projectTypePriority = task.projectType === 'COMMERCIAL' ? 1 : 
                                task.projectType === 'RESIDENTIAL' ? 2 : 3;
    const orderValue = isOutOfOffice ? 200 : (300 + projectTypePriority);

    // Common props factory
    const makeEvent = (evStart: string, evEnd?: string, evIdSuffix = ''): EventInput => {
      const classNames = isOutOfOffice ? ['out-of-office-event'] : ['general-task-event'];
      const isMultiDay = isOutOfOffice && task.endDate && evEnd;
      
      // If this is a multi-day original task, mark segments (optional)
      if (isMultiDay) {
        classNames.push('out-of-office-range');
      }

      const eventProps: EventInput = {
        id: `task-${task.id}${evIdSuffix}`,
        title: task.name,
        start: evStart,
        end: evEnd,
        allDay: true,
        order: orderValue,
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
          categoryId: task.taskCategoryId,
          categoryName: task.taskCategoryName,
          categoryColor: task.taskCategoryColorHex,
          projectId: task.projectId,
          projectName: task.projectName,
          projectCode: task.projectCode,
          projectType: task.projectType,
          projectManagerName: task.projectManagerName,
          phaseId: task.projectPhaseId,
          phaseName: task.projectPhaseName,
          createdByEmployeeId: task.createByEmployeeId,
          createdByEmployeeName: task.createByEmployeeName,
          isGeneralTask: true,
          isOutOfOffice: isOutOfOffice,
          fullTask: task
        }
      };
      
      // Force FullCalendar block display for multi-day events
      if (isMultiDay) {
        eventProps.display = 'auto';
      }
      
      return eventProps;
    };

// If it's OutOfOffice and has an endDate, expand into daily events for custom rendering
    if (isOutOfOffice && task.endDate) {
      try {
        const taskEndDate: any = task.endDate;
        let endDateObj: Date;

        if (taskEndDate instanceof Date) {
          endDateObj = new Date(taskEndDate);
        } else if (typeof taskEndDate === 'string') {
          endDateObj = new Date(taskEndDate.split('T')[0]);
        } else {
          endDateObj = new Date(taskEndDate);
        }

        if (!isNaN(endDateObj.getTime())) {
          // Create one event per day for custom rendering across the date range
          const startObj = new Date(startDate);
          const currentDay = new Date(startObj);
          let dayCount = 0;
          
          while (currentDay <= endDateObj && dayCount < 365) {
            const dayStr = currentDay.toISOString().split('T')[0];
            events.push(makeEvent(dayStr, undefined, `-day${dayCount}`));
            currentDay.setDate(currentDay.getDate() + 1);
            dayCount++;
          }
          
          continue; // next task
        }
      } catch (error) {
        console.error('Error expanding endDate for Out of Office task (fallback to single-day):', task, error);
        // fallthrough to single-day fallback below
      }
    }
    events.push(makeEvent(startDate));
  }

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
      order: 100, // Holidays have highest priority
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
