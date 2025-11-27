// project.model.ts
export interface Project {
  id: number;
  name: string;
  projectCode: string;
  projectArea?: string;
  areaUnit?: string;
  cost?: number;
  realCost?: number;
  trackedTime?: number;
  estimatedTime?: number;
  realTime?: number;
  officeName?: string;
  clientName?: string;
  softwareName?: string;
  projectType?: string;
  scope?: string;
  status?: string;
  employeeIds?: number[];
  pmIds?: number[];
  // Optional additional fields used by template
  customerName?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  description?: string;
  notes?: string;
  phase?: string;
}
