import { SubTaskTag } from './enums/sub-task-tag.enum';

export interface SubTask {
  id: number;
  name: string;

  actualHours: number;
  issueDate: string; // YYYY-MM-DD

  tag: SubTaskTag | null;

  // Categoría (tabla relacionada)
  subTaskCategoryId: number;
  subTaskCategoryName: string;

  // Proyecto (tabla relacionada)
  projectId: number;
  projectName: string;

  // Empleado creador (tabla relacionada)
  createdByEmployeeId: number;
  createdByEmployeeName: string;

  // Snapshot organizacional
  snapshotJobpositionId: number;
  snapshotJobpositionName: string;

  snapshotDepartmentId: number;
  snapshotDepartmentName: string;

  snapshotBillablerate: number;
}