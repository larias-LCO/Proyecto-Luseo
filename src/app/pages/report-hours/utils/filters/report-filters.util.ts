import { TimeEntry } from '../../models/time-entry.model';
import { ReportHoursFilters } from '../../models/filters.model';

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

  let result = [...entries];

  // 1️⃣ Explicit filters FIRST
  if (filters.onlyMyReports) {
    return result.filter(e => e.userId === context.myEmployeeId);
  }

  if (filters.selectedEmployeeId) {
    return result.filter(e => e.userId === filters.selectedEmployeeId);
  }

  // 2️⃣ Role-based visibility
  if (context.myRole === 'OWNER') {
    return result;
  }

  if (
    context.myRole === 'ADMIN' &&
    context.isCoordinator &&
    context.myDepartmentId
  ) {
    return result.filter(e => {
      const empDept = context.employeeDepartmentMap[e.userId];
      const isSameDept = empDept === context.myDepartmentId;
      const isOwn = e.userId === context.myEmployeeId;
      return isSameDept || isOwn;
    });
  }

  // 3️⃣ Default user
  return result.filter(e => e.userId === context.myEmployeeId);
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