import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import bootstrap5Plugin from '@fullcalendar/bootstrap5';

import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';

export function getWeekCalendarOptions(): CalendarOptions {
  return {
    initialView: 'dayGridWeek',
    plugins: [dayGridPlugin, interactionPlugin, listPlugin, bootstrap5Plugin],
    // themeSystem: 'bootstrap5',
    headerToolbar: {
      left: '',
      center: 'title',
      // add list views so user can switch to compact listWeek/listMonth
      right: 'prev today next dayGridMonth,dayGridWeek,listWeek'
    },
    // Format title to show date range like "Jan 5 – 9, 2026"
    titleFormat: { month: 'short', day: 'numeric', year: 'numeric' },
    // Format day header to show only day number and short name like "5 Mon"
    dayHeaderFormat: { day: 'numeric', weekday: 'short' },
    hiddenDays: [0, 6], // hide Sunday and Saturday
    weekends: false,
    editable: false,
    // allow day cells to render all events; we will manage overflow with CSS scroll
    dayMaxEventRows: false,
    dayMaxEvents: false,
    selectable: true
    ,
    // Add stable class names so component-level CSS can target calendar parts reliably
    dayCellClassNames: ['rh-day-cell'],
    eventClassNames: (arg) => {
      // ensure every rendered event gets a stable class we can target
      return ['rh-fc-event'];
    }
  } as CalendarOptions;
}

export default getWeekCalendarOptions;
