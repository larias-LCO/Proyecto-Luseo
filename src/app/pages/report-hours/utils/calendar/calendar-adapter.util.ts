import { EventInput } from '@fullcalendar/core';
import { TimeEntry } from '../../models/time-entry.model';

export function mapTimeEntriesToEvents(entries: any[] = []): EventInput[] {
  return (entries || []).map(e => ({
    id: String(e.id),
    title: e.title || (e.projectName ? `${e.projectName}` : (e.originalName || 'Task')),
    start: e.date,
    allDay: true,
    extendedProps: {
      hours: e.hours,
      type: e.type,
      userId: e.userId,
      userName: e.userName,
      projectId: e.projectId,
      projectCode: e.projectCode,
      projectName: e.projectName,
      // explicit convenience flags for templates
      isInternalTask: e.type === 'INTERNAL_TASK',
      isSubTask: e.type === 'SUB_TASK',
      ...(e || {})
    }
  }));
}

export default mapTimeEntriesToEvents;
