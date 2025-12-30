import { TimeEntry } from '../../models/time-entry.model';

export interface CalendarMetrics {
  projectHours: number;
  projectCount: number;
  internalHours: number;
  internalCount: number;
  totalHours: number;
  totalCount: number;
}

function toDateOnly(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function computeMetrics(entries: TimeEntry[], start: Date, end: Date): CalendarMetrics {
  const startMs = toDateOnly(start);
  const endMs = toDateOnly(end); // treat end as exclusive

  let projectHours = 0;
  let projectCount = 0;
  let internalHours = 0;
  let internalCount = 0;

  if (!entries || entries.length === 0) {
    return { projectHours: 0, projectCount: 0, internalHours: 0, internalCount: 0, totalHours: 0, totalCount: 0 };
  }

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (!e || !e.date) continue;

    // parse date safely (supports string ISO / number / Date)
    let d: Date;
    if (typeof e.date === 'string') {
      // parse YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS safely as local date
      const datePart = String(e.date).split('T')[0];
      const parts = datePart.split('-');
      if (parts.length >= 3) {
        const y = parseInt(parts[0], 10) || 0;
        const m = parseInt(parts[1], 10) - 1 || 0;
        const day = parseInt(parts[2], 10) || 1;
        d = new Date(y, m, day);
      } else {
        d = new Date(e.date);
      }
    } else if (typeof e.date === 'number') {
      d = new Date(e.date);
    } else if ((e.date as any) instanceof Date) {
      d = e.date as Date;
    } else {
      d = new Date(String(e.date));
    }

    const ms = toDateOnly(d);
    if (ms < startMs || ms >= endMs) continue;

    const hours = Number(e.hours) || 0;
    if (e.type === 'SUB_TASK') {
      projectHours += hours;
      projectCount += 1;
    } else if (e.type === 'INTERNAL_TASK') {
      internalHours += hours;
      internalCount += 1;
    }
  }

  const totalHours = projectHours + internalHours;
  const totalCount = projectCount + internalCount;

  return { projectHours, projectCount, internalHours, internalCount, totalHours, totalCount };
}
