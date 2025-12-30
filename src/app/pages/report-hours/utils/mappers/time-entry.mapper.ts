import { SubTask } from '../../models/sub-task.model';
import { InternalTaskLog } from '../../models/internal-task-log.model';
import { TimeEntry } from '../../models/time-entry.model';

/**
 * Mapper de SubTask → TimeEntry
 */
export function mapSubTasksToTimeEntries(
  subTasks: SubTask[]
): TimeEntry[] {
  return subTasks.map(st => ({
    id: st.id,
    type: 'SUB_TASK',
    date: st.issueDate,
    hours: st.actualHours,
    title: st.name,
    userId: st.createdByEmployeeId,
    userName: st.createdByEmployeeName,
    projectId: st.projectId,
    projectCode: st.projectCode,
    projectName: st.projectName,
    // extras for calendar templates
    tag: st.tag,
    categoryName: st.subTaskCategoryName,
    createdBy: st.createdByEmployeeName
  }));
}

/**
 * Mapper de InternalTaskLog → TimeEntry
 */
export function mapInternalLogsToTimeEntries(
  internalLogs: InternalTaskLog[]
): TimeEntry[] {
  return internalLogs.map(log => ({
    id: log.id,
    type: 'INTERNAL_TASK',
    date: log.logDate,
    hours: log.reportHours,
    title: log.internalTaskName,
    userId: log.createdByEmployeeId,
    userName: log.createdByEmployeeName
    ,
    // extras for calendar templates
    description: log.description,
    categoryName: log.internalTaskName,
    createdBy: log.createdByEmployeeName
  }));
}

/**
 * Mapper unificado (el que usará el service)
 */
export function mapToTimeEntries(
  subTasks: SubTask[],
  internalLogs: InternalTaskLog[]
): TimeEntry[] {
  return [
    ...mapSubTasksToTimeEntries(subTasks),
    ...mapInternalLogsToTimeEntries(internalLogs)
  ];
}