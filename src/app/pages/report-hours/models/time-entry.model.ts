export interface TimeEntry {
  id: number;
  type: 'SUB_TASK' | 'INTERNAL_TASK';

  date: string;
  hours: number;

  title: string;

  userId: number;
  userName: string;

  projectId?: number;
  projectName?: string;
}