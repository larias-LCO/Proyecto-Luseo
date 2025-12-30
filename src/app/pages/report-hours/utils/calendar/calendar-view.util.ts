import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

export function getWeekCalendarOptions(): CalendarOptions {
  return {
    initialView: 'dayGridWeek',
    plugins: [dayGridPlugin, interactionPlugin],
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridWeek,dayGridMonth'
    },
    hiddenDays: [0, 6], // hide Sunday and Saturday
    weekends: false,
    editable: false,
    selectable: true
  } as CalendarOptions;
}

export default getWeekCalendarOptions;
