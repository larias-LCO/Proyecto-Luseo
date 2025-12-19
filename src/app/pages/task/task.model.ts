// =============================================
// 📌 MODEL: Task + Project + Filters + Calendar
// =============================================

// 🔹 Tarea EXACTAMENTE como la responde tu backend
export interface TaskModel {
  id: number;

  // Nombre / descripción
  name: string;
  description: string | null;

  // Fechas
  issuedDate: string | null;
  endDate: string | null;

  // Categoría
  taskCategoryName: string | null;
  taskCategoryId: number | null;
  taskCategoryColorHex: string | null;

  // Proyecto
  projectName: string | null;
  projectId: number | null;
  projectCode: string | null;
  projectType: string | null;

  // Manager / Phase
  projectManagerName: string | null;
  projectPhaseName: string | null;
  projectPhaseId: number | null;

  // Creador
  createdByEmployeeName: string | null;
  createdByEmployeeId: number | null;

  // Personal
  personalTask: boolean;
  personal_task: boolean;

  // Estado
  status: string | null;

  // Campo adicional para tu agrupación por semana
  week?: string | null;

  // Permite campos adicionales sin romper la app
  [key: string]: any;
}

// =============================================
// 📌 Project Interface (simple para filtros)
// =============================================
export interface Project {
  id: number;
  name: string;
  projectCode?: string | null;
  projectManagerId?: number | null;
  employeeIds?: number[];
}


// =============================================
// 📌 User Filters interface
export interface Filters {
  searchText: string;
  category: string;
  creator: string;
  mineOnly: boolean;
  myProjects: boolean;
  week: string | null;
}
// =============================================
// 📌 Calendar Models
// =============================================
export interface TypeGroup {
  [typeName: string]: TaskModel[];
}

export interface WeekSection {
    team: Record<string, TaskModel[]>;
}


export interface AuthState {
  employeeId: number;
  role: 'ADMIN' | 'OWNER' | 'USER';
}



