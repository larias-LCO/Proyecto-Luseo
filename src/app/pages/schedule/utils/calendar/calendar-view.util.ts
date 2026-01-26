import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import bootstrap5Plugin from '@fullcalendar/bootstrap5';

import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import timeGridPlugin from '@fullcalendar/timegrid';
import { eventOrderComparator } from './event-order.util';

/**
 * Configuración del calendario para Schedule
 * Vista mensual por defecto con opciones de semana y lista
 */
export function getScheduleCalendarOptions(): CalendarOptions {
  return {
    initialView: 'dayGridWeek',
    plugins: [dayGridPlugin, interactionPlugin, listPlugin, timeGridPlugin, bootstrap5Plugin],
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,dayGridWeek,listWeek'
    },
    // Formato del título para mostrar mes y año
    titleFormat: { month: 'short', day: 'numeric', year: 'numeric' },
    // Formato de los encabezados de día
    dayHeaderFormat: { weekday: 'short' },
    // Ocultar fines de semana (solo lunes a viernes)
    weekends: false,
    hiddenDays: [0, 6], // 0 = Domingo, 6 = Sábado
    // Permitir edición de eventos (arrastrar/soltar)
    editable: false,
    selectable: true,
    selectMirror: true,
    // Event configuration
    height: 'auto', // Auto height to show all events
    contentHeight: 'auto',
    dayMaxEventRows: false, // Show ALL events without limit
    dayMaxEvents: false, // No event limit
    moreLinkClick: 'popover',
    eventOverlap: false, // Prevent events from overlapping which can cause reordering
    eventDisplay: 'auto', // Use default FullCalendar rendering for multi-day and allDay events
    displayEventTime: false,
    displayEventEnd: false,
    // CRITICAL: Force strict event ordering - prevents FullCalendar from compacting events up to fill gaps
    eventOrderStrict: true,
    // Custom event order function with priority system
    eventOrder: eventOrderComparator,
    // Multi-day event settings
    nextDayThreshold: '00:00:00',
    eventMinHeight: 28,
    // CSS classes
    dayCellClassNames: ['schedule-day-cell'],
    eventClassNames: (arg) => {
      const classes = ['schedule-fc-event'];
      
      // Agregar clase según tipo de evento
      if (arg.event.extendedProps?.['type'] === 'HOLIDAY') {
        classes.push('schedule-holiday-event');
      } else if (arg.event.extendedProps?.['type'] === 'GENERAL_TASK') {
        classes.push('schedule-task-event');
      }
      
      return classes;
    },
    // Configuración de idioma (ingles)
    locale: 'en',
    // Mostrar número de semana
    weekNumbers: false,
    // Configuración para vista de lista
    views: {
      listMonth: {
        buttonText: 'Lista',
        noEventsContent: 'No hay tareas programadas'
      },
      dayGridMonth: {
        buttonText: 'Month',
        dayMaxEventRows: false, // Show all events
        dayMaxEvents: false,
        fixedWeekCount: false
      },
      dayGridWeek: {
        buttonText: 'Week',
        dayMaxEventRows: false, // Show all events
        dayMaxEvents: false
      }
    },
    // Button configuration
    buttonText: {
      today: 'Today',
      month: 'Month',
      week: 'Week',
      day: 'Day',
      list: 'List'
    },
    // Texto cuando no hay eventos
    noEventsText: 'No tasks to display'
  } as CalendarOptions;
}

/**
 * Configuración alternativa para vista semanal
 */
export function getScheduleWeekCalendarOptions(): CalendarOptions {
  return {
    ...getScheduleCalendarOptions(),
    initialView: 'dayGridWeek',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,dayGridWeek,listWeek'
    },
    hiddenDays: [0, 6], // Ocultar fines de semana para vista de trabajo
    weekends: false
  } as CalendarOptions;
}

/**
 * Configuración para vista de lista
 */
export function getScheduleListCalendarOptions(): CalendarOptions {
  return {
    ...getScheduleCalendarOptions(),
    initialView: 'listMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'listWeek,listMonth'
    }
  } as CalendarOptions;
}

export default {
  getScheduleCalendarOptions,
  getScheduleWeekCalendarOptions,
  getScheduleListCalendarOptions
};
