import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';

export function getWeekCalendarOptions(): CalendarOptions {
  return {
    initialView: 'dayGridWeek',
    plugins: [dayGridPlugin, interactionPlugin, listPlugin],
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      // add list views so user can switch to compact listWeek/listMonth
      right: 'dayGridMonth,dayGridWeek,listWeek'
    },
    hiddenDays: [0, 6], // hide Sunday and Saturday
    weekends: false,
    editable: false,
    // allow day cells to render all events; we will manage overflow with CSS scroll
    dayMaxEventRows: false,
    dayMaxEvents: false,
    selectable: true
  } as CalendarOptions;
}

export default getWeekCalendarOptions;
