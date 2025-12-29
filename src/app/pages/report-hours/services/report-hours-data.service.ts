import { Injectable } from '@angular/core';
import { SubTask } from '../models/sub-task.model';
import { InternalTaskLog } from '../models/internal-task-log.model';
import { TimeEntry } from '../models/time-entry.model';
import { TimeMetrics } from '../models/metrics.model';
import { ReportHoursFilters } from '../models/filters.model';
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
    currentEmployeeId?: number
  ): TimeEntry[] {

    let result = [...entries];

    if (filters.onlyMyReports && currentEmployeeId) {
      result = result.filter(e => e.userId === currentEmployeeId);
    }

    if (filters.selectedEmployeeId) {
      result = result.filter(e => e.userId === filters.selectedEmployeeId);
    }

    if (filters.searchText) {
      const text = filters.searchText.toLowerCase();
      result = result.filter(e =>
        e.title.toLowerCase().includes(text) ||
        e.userName.toLowerCase().includes(text)
      );
    }

    return result;
  }
}