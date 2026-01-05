import { Injectable } from '@angular/core';
import { SubTask } from '../models/sub-task.model';
import { InternalTaskLog } from '../models/internal-task-log.model';
import { TimeEntry } from '../models/time-entry.model';
import { TimeMetrics } from '../models/metrics.model';
import { ReportHoursFilters } from '../models/filters.model';
import { filterEntriesByPermissions, isHolidayEntry } from '../utils/permissions/report-permissions.util';
import { mapToTimeEntries } from '../utils/mappers/time-entry.mapper';

@Injectable({ providedIn: 'root' })
export class ReportHoursDataService {

  buildTimeEntries(
    subTasks: SubTask[],
    internalLogs: InternalTaskLog[]
  ): TimeEntry[] {
    return mapToTimeEntries(subTasks, internalLogs);
  }

  calculateMetrics(entries: TimeEntry[]): TimeMetrics {
    const internalHours = entries
      .filter(e => e.type === 'INTERNAL_TASK')
      .reduce((sum, e) => sum + e.hours, 0);

    const billableHours = entries
      .filter(e => e.type === 'SUB_TASK')
      .reduce((sum, e) => sum + e.hours, 0);

    return {
      internalHours,
      billableHours,
      totalHours: internalHours + billableHours
    };
  }

  applyFilters(
    entries: TimeEntry[],
    filters: ReportHoursFilters,
    context?: {
      myEmployeeId?: number;
      myRole?: 'OWNER' | 'ADMIN' | 'USER';
      isCoordinator?: boolean;
      myDepartmentId?: number;
      employeeDepartmentMap?: Record<number, number>;
    }
  ): TimeEntry[] {

    // Separate holidays so they can always be included
    const holidays = entries.filter(isHolidayEntry);
    let nonHolidays = entries.filter(e => !isHolidayEntry(e));

    // Apply UI filters (onlyMyReports, selectedEmployeeId, search) to non-holiday entries
    if (filters.onlyMyReports && context?.myEmployeeId != null) {
      nonHolidays = nonHolidays.filter(e => e.userId === context.myEmployeeId);
    }

    if (filters.selectedEmployeeId) {
      nonHolidays = nonHolidays.filter(e => e.userId === filters.selectedEmployeeId);
    }

    if (filters.searchText) {
      const text = filters.searchText.toLowerCase();
      nonHolidays = nonHolidays.filter(e =>
        (e.title || '').toLowerCase().includes(text) ||
        (e.userName || '').toLowerCase().includes(text)
      );
    }

    // Enforce permission rules centrally
    const permitted = filterEntriesByPermissions(nonHolidays, {
      myEmployeeId: context?.myEmployeeId,
      myRole: context?.myRole,
      isCoordinator: context?.isCoordinator,
      myDepartmentId: context?.myDepartmentId,
      employeeDepartmentMap: context?.employeeDepartmentMap
    });

    // Merge permitted non-holidays with all holidays (holidays always visible)
    return [...permitted, ...holidays];
  }
}