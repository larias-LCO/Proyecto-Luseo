import { TimeEntry } from '../../models/time-entry.model';
import { ReportHoursFilters } from '../../models/filters.model';
import { isEntryVisible, isHolidayEntry } from '../permissions/report-permissions.util';

export function filterTimeEntriesByRole(
  entries: TimeEntry[],
  filters: ReportHoursFilters,
  context: {
    myEmployeeId: number;
    myRole: 'OWNER' | 'ADMIN' | 'USER';
    isCoordinator: boolean;
    myDepartmentId?: number;
    employeeDepartmentMap: Record<number, number>;
  }
): TimeEntry[] {

  // Ensure holidays are always returned regardless of role/filters
  const holidays = entries.filter(isHolidayEntry);
  let nonHolidays = entries.filter(e => !isHolidayEntry(e));

  // 1️⃣ Explicit filters FIRST (apply only to non-holiday entries)
  if (filters.onlyMyReports) {
    nonHolidays = nonHolidays.filter(e => e.userId === context.myEmployeeId);
  }

  if (filters.selectedEmployeeId) {
    nonHolidays = nonHolidays.filter(e => e.userId === filters.selectedEmployeeId);
  }

  // 2️⃣ Apply role/permission visibility using centralized helper
  const visible = nonHolidays.filter(e => isEntryVisible(e, {
    myEmployeeId: context.myEmployeeId,
    myRole: context.myRole,
    isCoordinator: context.isCoordinator,
    myDepartmentId: context.myDepartmentId,
    employeeDepartmentMap: context.employeeDepartmentMap
  }));

  return [...visible, ...holidays];
}

export function filterTimeEntriesByDateRange(
  entries: TimeEntry[],
  range: {
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
  }
): TimeEntry[] {

  const start = new Date(range.startDate).setHours(0, 0, 0, 0);
  const end = new Date(range.endDate).setHours(23, 59, 59, 999);

  return entries.filter(entry => {
    const entryDate = new Date(entry.date).getTime();
    return entryDate >= start && entryDate <= end;
  });
}