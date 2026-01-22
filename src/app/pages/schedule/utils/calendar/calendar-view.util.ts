import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import bootstrap5Plugin from '@fullcalendar/bootstrap5';

import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import timeGridPlugin from '@fullcalendar/timegrid';

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
    dayMaxEventRows: true, // Show all events, use internal scroll
    dayMaxEvents: false, // Don't limit events
    moreLinkClick: 'popover', // Show popover on "+X more" click
    eventOrder: 'title', // Sort events by title
    displayEventTime: false, // Don't show time for all-day events
    displayEventEnd: false, // Don't show end time
    // Multi-day event settings
    nextDayThreshold: '00:00:00', // Events ending at midnight end on that day
    eventMinHeight: 28, // Minimum height for events
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
      
      // Agregar clase si es tarea personal
      if (arg.event.extendedProps?.['isPersonalTask']) {
        classes.push('schedule-personal-task');
      }
      
      return classes;
    },
    // Altura del calendario
    height: 'auto',
    contentHeight: 'auto',
    // Configuración de idioma (ingles)
    locale: 'en',
    // Mostrar número de semana
    weekNumbers: false,
    // Estilo de eventos
    eventDisplay: 'block',
    // Configuración para vista de lista
    views: {
      listMonth: {
        buttonText: 'Lista',
        noEventsContent: 'No hay tareas programadas'
      },
      dayGridMonth: {
        buttonText: 'Month',
        dayMaxEvents: 4 // Mostrar máximo 4 eventos antes del "+X more"
      },
      dayGridWeek: {
        buttonText: 'Week',
        dayMaxEvents: true // Show all events in weekly view
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
