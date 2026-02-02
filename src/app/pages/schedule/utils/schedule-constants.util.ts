import { GeneralTaskStatus } from '../models/enums/generalTask-status.enum';

/**
 * Colores por defecto para estados de tareas
 */
export const TASK_STATUS_COLORS: Record<GeneralTaskStatus, string> = {
  [GeneralTaskStatus.IN_PROGRESS]: '#17a2b8', // info blue
  [GeneralTaskStatus.COMPLETED]: '#28a745',   // success green
  [GeneralTaskStatus.PAUSED]: '#ffc107'       // warning yellow
};

/**
 * Iconos de Bootstrap para estados de tareas
 */
export const TASK_STATUS_ICONS: Record<GeneralTaskStatus, string> = {
  [GeneralTaskStatus.IN_PROGRESS]: 'bi-play-circle',
  [GeneralTaskStatus.COMPLETED]: 'bi-check-circle',
  [GeneralTaskStatus.PAUSED]: 'bi-pause-circle'
};

/**
 * Labels traducidos para estados
 */
export const TASK_STATUS_LABELS: Record<GeneralTaskStatus, string> = {
  [GeneralTaskStatus.IN_PROGRESS]: 'En Progreso',
  [GeneralTaskStatus.COMPLETED]: 'Completada',
  [GeneralTaskStatus.PAUSED]: 'Pausada'
};

/**
 * Configuración de colores para el calendario
 */
export const CALENDAR_COLORS = {
  holiday: {
    background: '#ffc107',
    border: '#ff9800',
    text: '#000000'
  },
  defaultTask: {
    background: '#6c757d',
    border: '#6c757d',
    text: '#ffffff'
  },
  personalTask: {
    borderLeft: '#dc3545',
    borderWidth: '4px'
  },
  today: {
    background: 'rgba(102, 126, 234, 0.1)',
    highlight: '#667eea'
  }
};

/**
 * Configuración de cache TTL (en milisegundos)
 */
export const CACHE_CONFIG = {
  tasks: 5 * 60 * 1000,        // 5 minutos
  categories: 10 * 60 * 1000,  // 10 minutos
  projects: 5 * 60 * 1000,     // 5 minutos
  holidays: 4.320 * 60 * 60 * 1000 // 4.320 horas (6 meses)
};

/**
 * Formato de fechas para el backend
 */
export const DATE_FORMATS = {
  backend: 'YYYY-MM-DD',
  display: 'DD/MM/YYYY',
  displayLong: 'DD [de] MMMM [de] YYYY',
  time: 'HH:mm',
  datetime: 'DD/MM/YYYY HH:mm'
};

/**
 * Configuración de paginación
 */
export const PAGINATION_CONFIG = {
  defaultPageSize: 20,
  pageSizeOptions: [10, 20, 50, 100]
};

/**
 * Mensajes de error comunes
 */
export const ERROR_MESSAGES = {
  REQUIRED_FIELD: 'Este campo es requerido',
  INVALID_DATE: 'La fecha ingresada no es válida',
  DATE_RANGE_INVALID: 'La fecha de fin debe ser posterior a la fecha de inicio',
  NETWORK_ERROR: 'Error de conexión. Por favor, intente nuevamente.',
  UNAUTHORIZED: 'No tiene permisos para realizar esta acción',
  NOT_FOUND: 'El recurso solicitado no fue encontrado',
  SERVER_ERROR: 'Error del servidor. Por favor, contacte al administrador.'
};

/**
 * Mensajes de éxito
 */
export const SUCCESS_MESSAGES = {
  TASK_CREATED: 'Tarea creada exitosamente',
  TASK_UPDATED: 'Tarea actualizada exitosamente',
  TASK_DELETED: 'Tarea eliminada exitosamente',
  CATEGORY_CREATED: 'Categoría creada exitosamente',
  CATEGORY_UPDATED: 'Categoría actualizada exitosamente',
  CATEGORY_DELETED: 'Categoría eliminada exitosamente'
};

/**
 * Obtiene el label traducido de un estado
 */
export function getStatusLabel(status: GeneralTaskStatus): string {
  return TASK_STATUS_LABELS[status] || status;
}

/**
 * Obtiene el color de un estado
 */
export function getStatusColor(status: GeneralTaskStatus): string {
  return TASK_STATUS_COLORS[status] || CALENDAR_COLORS.defaultTask.background;
}

/**
 * Obtiene el icono de un estado
 */
export function getStatusIcon(status: GeneralTaskStatus): string {
  return TASK_STATUS_ICONS[status] || 'bi-question-circle';
}

/**
 * Verifica si un color hexadecimal es válido
 */
export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

/**
 * Genera un color aleatorio en hexadecimal
 */
export function generateRandomColor(): string {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

/**
 * Convierte un color hexadecimal a RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Determina si un color es claro u oscuro (para decidir color de texto)
 */
export function isLightColor(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  
  // Fórmula de luminancia
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5;
}

/**
 * Obtiene el color de texto adecuado según el fondo
 */
export function getTextColorForBackground(backgroundColor: string): string {
  return isLightColor(backgroundColor) ? '#000000' : '#ffffff';
}

/**
 * Formatea una fecha al formato del backend
 */
export function formatDateForBackend(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formatea una fecha para mostrar
 */
export function formatDateForDisplay(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Calcula la diferencia en días entre dos fechas
 */
export function getDaysDifference(startDate: Date, endDate: Date): number {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Verifica si una fecha está en un rango
 */
export function isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
  return date >= startDate && date <= endDate;
}

/**
 * Obtiene el inicio de la semana para una fecha
 */
export function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajustar cuando es domingo
  return new Date(d.setDate(diff));
}

/**
 * Obtiene el fin de la semana para una fecha
 */
export function getEndOfWeek(date: Date): Date {
  const start = getStartOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end;
}

/**
 * Verifica si dos fechas son del mismo día
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

/**
 * Obtiene el nombre del mes en español
 */
export function getMonthName(monthIndex: number): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return months[monthIndex] || '';
}

/**
 * Obtiene el nombre del día de la semana en español
 */
export function getDayName(dayIndex: number): string {
  const days = [
    'Domingo', 'Lunes', 'Martes', 'Miércoles',
    'Jueves', 'Viernes', 'Sábado'
  ];
  return days[dayIndex] || '';
}

export default {
  TASK_STATUS_COLORS,
  TASK_STATUS_ICONS,
  TASK_STATUS_LABELS,
  CALENDAR_COLORS,
  CACHE_CONFIG,
  DATE_FORMATS,
  PAGINATION_CONFIG,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  getStatusLabel,
  getStatusColor,
  getStatusIcon,
  isValidHexColor,
  generateRandomColor,
  getTextColorForBackground,
  formatDateForBackend,
  formatDateForDisplay,
  getDaysDifference,
  isDateInRange,
  getStartOfWeek,
  getEndOfWeek,
  isSameDay,
  getMonthName,
  getDayName
};