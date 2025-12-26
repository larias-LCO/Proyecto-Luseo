import { Injectable } from '@angular/core';
import { SubTask } from '../models/sub-task.model';
import { InternalTaskLog } from '../models/internal-task-log.model';
import { TimeEntry } from '../models/time-entry.model';
import { TimeMetrics } from '../models/metrics.model';
import { ReportHoursFilters } from '../models/filters.model';

@Injectable({ providedIn: 'root' })
export class ReportHoursDataService {

  /**
   * Convierte SubTasks + InternalTaskLogs
   * en una sola lista homogénea para UI
   */
  buildTimeEntries(
    subTasks: SubTask[],
    internalLogs: InternalTaskLog[]
  ): TimeEntry[] {

    const subTaskEntries: TimeEntry[] = subTasks.map(st => ({
      id: st.id,
      type: 'SUB_TASK',
      date: st.issueDate,
      hours: st.actualHours,
      title: st.name,
      userId: st.createdByEmployeeId,
      userName: st.createdByEmployeeName,
      projectId: st.projectId,
      projectName: st.projectName
    }));

    const internalEntries: TimeEntry[] = internalLogs.map(log => ({
      id: log.id,
      type: 'INTERNAL_TASK',
      date: log.logDate,
      hours: log.reportHours,
      title: log.internalTaskName,
      userId: log.createdByEmployeeId,
      userName: log.createdByEmployeeName
    }));

    return [...subTaskEntries, ...internalEntries];
  }

  /**
   * Calcula métricas generales de tiempo
   */
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

  /**
   * Aplica filtros de UI
   */
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