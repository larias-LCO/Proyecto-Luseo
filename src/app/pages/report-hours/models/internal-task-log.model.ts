export interface InternalTaskLog {
  id: number;

  logDate: string; // YYYY-MM-DD
  reportHours: number;

  description: string;

  // Categoría (tabla relacionada)
  internalTaskId: number;
  internalTaskName: string;

  // Empleado
  createdByEmployeeId: number;
  createdByEmployeeName: string;

  // Snapshot organizacional
  snapshotJobpositionId: number;
  snapshotJobpositionName: string;

  snapshotDepartmentId: number;
  snapshotDepartmentName: string;

  snapshotBillablerate: number;
}