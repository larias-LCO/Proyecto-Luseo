export interface TimeEntry {
  id: number;

  // Indica de dónde viene el registro
  type: 'SUB_TASK' | 'INTERNAL_TASK';

  date: string;
  hours: number;

  // Texto a mostrar en UI
  title: string;

  userId: number;
  userName: string;

  // Solo si viene de SubTask
  projectId?: number;
  projectName?: string;
}