
// Helper global para peticiones GET autenticadas
export async function apiGet<T = any>(path: string): Promise<T> {
  const apiBase = (window as any).Auth?.getState?.().apiBase || 'https://api.luseoeng.com';
  const url = apiBase.replace(/\/$/, '') + path;
  let res: Response;
  if ((window as any).Auth && typeof (window as any).Auth.fetchWithAuth === 'function') {
    res = await (window as any).Auth.fetchWithAuth(url, { headers: { 'Accept': 'application/json' } });
  } else {
    res = await fetch(url, { credentials: 'include' });
  }
  if (res.status === 401) {
    try { await (window as any).Auth.logout(); } finally { location.href = '/login.html'; }
    throw new Error('HTTP 401');
  }
  if (!res.ok) {
    let detail = '';
    try {
      const data = await res.json();
      detail = data?.message || data?.error || data?.detail || JSON.stringify(data);
    } catch (_) {
      detail = 'No se pudo leer el detalle del error (no es JSON)';
    }
    throw new Error(`HTTP ${res.status}${detail ? ': ' + detail : ''}`);
  }
  return res.json();
}


export async function apiDelete(path: string): Promise<any> {
  const apiBase = (window as any).Auth?.getState?.().apiBase || 'https://api.luseoeng.com';
  const url = apiBase.replace(/\/$/, '') + path;
  let res: Response;
  if ((window as any).Auth && typeof (window as any).Auth.fetchWithAuth === 'function') {
    res = await (window as any).Auth.fetchWithAuth(url, {method: 'DELETE', headers: {'Accept': 'application/json'}});
  } else {
    res = await fetch(url, {method: 'DELETE', headers: {'Accept': 'application/json'}, credentials: 'include'});
  }
  if (res.status === 401) {
    try { await (window as any).Auth.logout(); } finally { location.href = '/login.html'; }
    throw new Error('HTTP 401');
  }
  if (!res.ok) {
    let detail = '';
    try {
      const data = await res.json();
      detail = data?.message || data?.error || data?.detail || JSON.stringify(data);
    } catch (_) {
      try { detail = await res.text(); } catch (__) {}
    }
    throw new Error(`HTTP ${res.status}${detail ? ': ' + detail : ''}`);
  }
  return res.status === 204 ? null : res.json();
}


// API Helper functions
export async function apiPost(path: string, data: any): Promise<any> {
  const apiBase = (window as any).Auth?.getState?.().apiBase || 'https://api.luseoeng.com';
  const url = apiBase.replace(/\/$/, '') + path;
  let res: Response;
  if ((window as any).Auth && typeof (window as any).Auth.fetchWithAuth === 'function') {
    res = await (window as any).Auth.fetchWithAuth(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
      body: JSON.stringify(data)
    });
  } else {
    res = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
      credentials: 'include',
      body: JSON.stringify(data)
    });
  }
  if (res.status === 401) {
    try { await (window as any).Auth.logout(); } finally { location.href = '/login.html'; }
    throw new Error('HTTP 401');
  }
  if (!res.ok) {
    let detail = '';
    try {
      const data = await res.json();
      detail = data?.message || data?.error || data?.detail || JSON.stringify(data);
    } catch (_) {
      try { detail = await res.text(); } catch (__) {}
    }
    throw new Error(`HTTP ${res.status}${detail ? ': ' + detail : ''}`);
  }
  return res.json();
}

export async function apiPut(path: string, data: any): Promise<any> {
  const apiBase = (window as any).Auth?.getState?.().apiBase || 'https://api.luseoeng.com';
  const url = apiBase.replace(/\/$/, '') + path;
  let res: Response;
  if ((window as any).Auth && typeof (window as any).Auth.fetchWithAuth === 'function') {
    res = await (window as any).Auth.fetchWithAuth(url, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
      body: JSON.stringify(data)
    });
  } else {
    res = await fetch(url, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
      credentials: 'include',
      body: JSON.stringify(data)
    });
  }
  if (res.status === 401) {
    try { await (window as any).Auth.logout(); } finally { location.href = '/login.html'; }
    throw new Error('HTTP 401');
  }
  if (!res.ok) {
    let detail = '';
    try {
      const data = await res.json();
      detail = data?.message || data?.error || data?.detail || JSON.stringify(data);
    } catch (_) {
      try { detail = await res.text(); } catch (__) {}
    }
    throw new Error(`HTTP ${res.status}${detail ? ': ' + detail : ''}`);
  }
  return res.json();
}


export async function deleteGeneralTask(taskId: number, taskName: string): Promise<void> {
  //mensaje de confirmación
  if (!confirm(`Are you sure you want to delete the task "${taskName}"?\n\nNote: This will also delete all associated subtasks.`)) return;
  try {
    await apiDelete(`/general-tasks/${taskId}`);
    // Refresh immediately without alert (non-invasive)
    await renderTasksView();
  } catch (err: any) {
    console.error('Error deleting task:', err);
    // Provide helpful error message
    let errorMsg = 'Error deleting task: ';
    if (err?.message?.includes('404')) {
      errorMsg += 'Task not found. It may have already been deleted.';
    } else if (err?.message?.includes('403') || err?.message?.includes('401')) {
      errorMsg += 'You do not have permission to delete this task.';
    } else {
      errorMsg += err?.message;
    }
    alert(errorMsg);
  }
}


    
// Refresca la vista de tareas al cerrar el modal de edición
export async function onEditTaskClosed() {
  if (typeof window !== 'undefined') {
    if ((window as any).tasksPageInstance) {
      (window as any).tasksPageInstance.tareaSeleccionada = null;
      await (window as any).tasksPageInstance.fetchTasks();
      await renderTasksView();
    }
  }
}
// Ejemplo de uso para activar la importación y evitar que se vea opaca
// Puedes borrar o mover esto según tu lógica
setTimeout(() => {
  debounceRefetchOrFullRender();
}, 1000);



import {
  saveFullCalendarState,
  restoreFullCalendarState,
  debounceRefetchOrFullRender,
  tryRefetchCalendars
} from './render-all.service';


// ========== CALENDAR LEGEND ==========
export function createCalendarLegend(tasks: Array<{ taskCategoryName?: string; taskCategoryColorHex?: string }>): HTMLDivElement {
  const legend = document.createElement('div');
  legend.className = 'calendar-legend';
  legend.style.cssText = 'display: flex; flex-wrap: wrap; gap: 12px; align-items: center; padding: 12px 16px; background: linear-gradient(135deg, #f8fafc, #eef6ff); border-radius: 10px; margin-bottom: 16px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);';

  // Title
  const title = document.createElement('span');
  title.textContent = 'Legend:';
  title.style.cssText = 'font-weight: 700; font-size: 13px; color: #334155; margin-right: 4px;';
  legend.appendChild(title);

  // Project Types Section
  const projectTypesContainer = document.createElement('div');
  projectTypesContainer.style.cssText = 'display: flex; gap: 8px; align-items: center; padding-right: 12px; border-right: 2px solid #cbd5e1;';

  // Commercial
  const commercialBadge = document.createElement('span');
  commercialBadge.innerHTML = '🏢 Commercial';
  commercialBadge.style.cssText = 'display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; background: #7DD3FC; color: #000000; border-radius: 6px; font-size: 12px; font-weight: 700; box-shadow: 0 1px 3px rgba(0,0,0,0.2);';
  projectTypesContainer.appendChild(commercialBadge);

  // Residential
  const residentialBadge = document.createElement('span');
  residentialBadge.innerHTML = '🏠 Residential';
  residentialBadge.style.cssText = 'display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; background: #6EE7B7; color: #000000; border-radius: 6px; font-size: 12px; font-weight: 700; box-shadow: 0 1px 3px rgba(0,0,0,0.2);';
  projectTypesContainer.appendChild(residentialBadge);

  legend.appendChild(projectTypesContainer);

  // Task Categories Section
  const categoriesContainer = document.createElement('div');
  categoriesContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 8px; align-items: center;';

  // Extract unique categories from tasks
  const categoriesMap = new Map();
  (tasks || []).forEach((task: { taskCategoryName?: string; taskCategoryColorHex?: string }) => {
    if (task.taskCategoryName && task.taskCategoryColorHex) {
      categoriesMap.set(task.taskCategoryName, task.taskCategoryColorHex);
    }
  });

  // Create badge for each category
  const sortedCategories = Array.from(categoriesMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  sortedCategories.forEach(([categoryName, colorHex]: [string, string]) => {
    const categoryBadge = document.createElement('span');
    categoryBadge.textContent = categoryName;
    categoryBadge.style.cssText = `display: inline-flex; align-items: center; padding: 4px 10px; background: ${colorHex}; color: ${getContrastColor(colorHex)}; border-radius: 6px; font-size: 11px; font-weight: 700; border: 1px solid ${darkenColor(colorHex, 15)}; box-shadow: 0 1px 2px rgba(0,0,0,0.15);`;
    categoriesContainer.appendChild(categoryBadge);
  });

  legend.appendChild(categoriesContainer);

  return legend;
}

// Helper para hacer POST
// async function apiPost(endpoint: string, payload: any): Promise<any> {
//   const base = (window as any).ng?.getInjector?.(TasksPage)?.get(AuthService)?.getApiBase?.() || '';
//   const url = `${base.replace(/\/$/, '')}${endpoint}`;
//   const resp = await fetch(url, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(payload)
//   });
//   if (!resp.ok) throw new Error('POST failed: ' + resp.status);
//   return resp.json();
// }

// Helper para refrescar la vista de tareas
export async function renderTasksView() {
  // Busca el componente Angular y llama a fetchTasks y filterAndRenderTasks
  const ngComponent = (window as any).ng?.getInjector?.(TasksPage)?.get(TasksPage);
  if (ngComponent) {
    await ngComponent.fetchTasks();
    ngComponent.filterAndRenderTasks();
  } else if ((window as any).tasksPageInstance) {

  // declare const API: string | undefined;

    await (window as any).tasksPageInstance.fetchTasks();
    (window as any).tasksPageInstance.filterAndRenderTasks();
  }
}

// Lógica para crear una tarea general y refrescar la vista
async function createGeneralTaskLogic(payload: any) {
  // payload debe tener: name, description, projectId, projectPhaseId, taskCategoryId, personalTask, status, issuedDate, endDate (opcional)
  // Si no se especifica issuedDate, usar la fecha local de hoy
  if (!payload.issuedDate) {
    const today = new Date();
    // Formato YYYY-MM-DD en zona local
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    payload.issuedDate = `${yyyy}-${mm}-${dd}`;
  }
  await apiPost('/general-tasks', payload);
  await renderTasksView();
}
// Helpers para createTaskCard
function escapeHtml(str: string): string {
  return String(str).replace(/[&<>'"]/g, function (c) {
  return ({'&':'&amp;','<':'&lt;','>':'&gt;','\'':'&#39;','"':'&quot;'} as any)[c] || c;
  });
}

function getContrastColor(hex: string): string {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map((x: string) => x + x).join('');
  const r: number = parseInt(hex.substr(0,2),16), g: number = parseInt(hex.substr(2,2),16), b: number = parseInt(hex.substr(4,2),16);
  return ((r*0.299 + g*0.587 + b*0.114) > 186) ? '#222222' : '#ffffff';
}

function darkenColor(hex: string, percent: number): string {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map((x: string) => x + x).join('');
  let r: number = parseInt(hex.substr(0,2),16), g: number = parseInt(hex.substr(2,2),16), b: number = parseInt(hex.substr(4,2),16);
  r = Math.max(0, r - Math.round(2.55 * percent));
  g = Math.max(0, g - Math.round(2.55 * percent));
  b = Math.max(0, b - Math.round(2.55 * percent));
  return `#${(r<<16|g<<8|b).toString(16).padStart(6,'0')}`;
}

function showGeneralTaskDetails(id: number, name: string) {
  // Aquí deberías abrir el modal de edición o detalles
  alert(`Abrir detalles de la tarea: ${name} (ID: ${id})`);
}
    
// Helper para obtener el label de status
export function getStatusLabel(status: string): string {
  switch (status) {
    case 'IN_PROGRESS': return 'In Progress';
    case 'COMPLETED': return 'Completed';
    case 'PAUSED': return 'Paused';
    default: return status;
  }
}


// Usa el helper global para renderizar la tarjeta de tarea
import { createTaskCard } from '../../shared/task-card.helper';

import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CreateTaskCard } from '../../core/components/create-task-card/create-task-card';
import { EditTask } from '../../core/components/edit-task/edit-task';
import { HeaderComponent } from "../../core/components/header/header";
import { SubmenuComponent } from "../../core/components/submenu/submenu";
import { RouterOutlet } from '@angular/router';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarTask } from '../../core/components/calendar-task/calendar-task';
import { CalendarOptions } from '@fullcalendar/core'; 
import dayGridPlugin from '@fullcalendar/daygrid';


import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { firstValueFrom } from 'rxjs';
import { ProjectService } from '../../core/services/project.service';
import { CalendarWeekPrev } from '../../core/components/calendar-week-prev/calendar-week-prev';
import { ConfirmModalComponent } from '../../core/components/confirm-modal/confirm-modal';

@Component({
  selector: 'app-task',
  standalone: true,
  imports: [HeaderComponent, SubmenuComponent, CommonModule, CreateTaskCard, FullCalendarModule, CalendarTask, EditTask, CalendarWeekPrev],
  templateUrl: './task.html',
  styleUrls: ['./task.scss']
})
export class TasksPage implements OnInit {
  // Eliminar constructor duplicado. El constructor correcto es el que inyecta dependencias:
  // (Constructor duplicado eliminado)
  showMineOnly: boolean = false;

  @ViewChild('calendarTaskRef') calendarTaskRef?: CalendarTask;
  @ViewChild('calendarWeekPrevRef') calendarWeekPrevRef?: CalendarWeekPrev;

  /**
   * Devuelve true si el usuario autenticado tiene rol USER (no puede editar/eliminar)
   */
  get isUserOnly(): boolean {
    try {
      return this.auth.hasRole && this.auth.hasRole('USER');
    } catch {
      return false;
    }
  }

    showCreatedByMe: boolean = false;
  // Filtra tareas por creador (usuario autenticado)
  onShowCreatedByMeChange(event: any) {
    this.showCreatedByMe = event.target.checked;
    this.filterTasks();
  }

filterTasks() {
    // DEBUG: Mostrar valores actuales de usuario y tareas
    const state = this.auth.getState?.();
    const myUsername = state?.username ?? null;
    console.log('[DEBUG] myEmployeeId:', this.myEmployeeId);
    console.log('[DEBUG] myUsername:', myUsername);
    (this.allTasks || []).forEach(task => {
      console.log('[DEBUG] Task', {
        id: task.id,
        name: task.name,
        createdByEmployeeId: task.createdByEmployeeId,
        createdByEmployeeName: task.createdByEmployeeName,
        createdByUsername: task.createdByUsername,
        createdBy: task.createdBy,
        sub: task.sub
      });
    });
  let filtered = [...this.allTasks];
  // Filtro: solo tareas creadas por mí
  if (this.showCreatedByMe) {
    const state = this.auth.getState?.();
    const myUsername = state?.username ?? null;
    const myEmployeeId = this.myEmployeeId;
    filtered = filtered.filter(task => {
      // Prioridad: employeeId si existe, si no username
      if (myEmployeeId && task.createdByEmployeeId) {
        return String(task.createdByEmployeeId) === String(myEmployeeId);
      }
      return (
        myUsername && (
          (task.createdByUsername && String(task.createdByUsername).toLowerCase() === String(myUsername).toLowerCase()) ||
          (task.createdBy && String(task.createdBy).toLowerCase() === String(myUsername).toLowerCase()) ||
          (task.sub && String(task.sub).toLowerCase() === String(myUsername).toLowerCase())
        )
      );
    });
  }
  // Filtro: solo tareas asignadas a mí (ya existente)
  if (this.currentFilters.showMineOnly && this.myEmployeeId) {
    filtered = filtered.filter(task =>
      Array.isArray(task.assignedEmployeeIds) &&
      task.assignedEmployeeIds.includes(this.myEmployeeId)
    );
  }
  // Log de fechas de tareas filtradas para depuración
  console.log('[DEBUG][Calendar] Tareas enviadas al calendario:');
  filtered.forEach(task => {
    console.log(`ID: ${task.id}, Name: ${task.name}, issuedDate: ${task.issuedDate}, createdDate: ${task.createdDate}`);
  });
  this.tasks = filtered;
  console.log('[DEBUG][Calendar] this.tasks después de asignar:', this.tasks);
  // Forzar actualización del calendario si es necesario
  setTimeout(() => {
    const todayStr = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
    if (this.calendarTaskRef && this.calendarTaskRef.setCalendarDate) {
      this.calendarTaskRef.setCalendarDate(todayStr);
    }
    if (this.calendarWeekPrevRef && this.calendarWeekPrevRef.setCalendarDate) {
      this.calendarWeekPrevRef.setCalendarDate(todayStr);
    }
  }, 0);
}


  // Permisos para el modal de edición
  public isOwnTask: boolean = false;
  public canEditTask: boolean = false;
  public canDeleteTask: boolean = false;

  public currentProjectId: number | null = null
  
  tareaSeleccionada: any = null;
  editTaskDataLoaded: boolean = false;
  editTaskProjects: any[] = [];
  editTaskCategories: any[] = [];
  editTaskEmployees: any[] = [];
  async ngAfterViewInit() {
    // Forzar inicialización de Auth al cargar la vista
    try {
      await this.initAuth();
      console.log('[PERM DEBUG][ngAfterViewInit] myEmployeeId:', this.myEmployeeId);
    } catch (err) {
      console.error('[PERM DEBUG][ngAfterViewInit] Error inicializando Auth:', err);
    }
    const clearBtn = document.getElementById('clear-all-filters');
    if (clearBtn) {
      await this.initAuth();
      clearBtn.addEventListener('click', () => {
        this.clearAllFilters();
        debounceRefetchOrFullRender();
      });

const state = this.auth.getState?.();
if (!state) {
  alert('No se pudo obtener la información de usuario.');
  return;
}

    }
    // Escuchar evento global para abrir modal de edición
    window.addEventListener('open-edit-task-modal', async (e: any) => {
      // Esperar a que Auth esté inicializado y los datos estén listos
      let maxTries = 10;
      while ((!this.myEmployeeId || !this.auth.getState()?.role) && maxTries > 0) {
        try {
          await this.initAuth();
        } catch (err) {
          console.error('[PERM DEBUG] Error inicializando Auth:', err);
        }
        await new Promise(res => setTimeout(res, 50));
        maxTries--;
      }
      // Si después de varios intentos sigue sin datos, no abrir el modal
      const state = this.auth.getState && this.auth.getState();
      const roleValue = Array.isArray(state?.role) ? state.role[0] : state?.role;
      if (!this.myEmployeeId && !state?.username && !roleValue) {
        alert('No se pudo obtener la información de usuario. Intenta recargar la página.');
        return;
      }
      // Cargar datos necesarios antes de abrir el modal
      this.editTaskDataLoaded = false;
      this.tareaSeleccionada = e.detail.task;
      // Cargar proyectos, categorías y empleados
      try {
        const [projectsResult, categories, employees] = await Promise.all([
          this.projectService.loadProjects({}),
          this.apiGet<any[]>('/task-categories'),
          this.apiGet<any[]>('/employees')
        ]);
        this.editTaskProjects = projectsResult.items || [];
        this.editTaskCategories = categories || [];
        this.editTaskEmployees = employees || [];
        this.editTaskDataLoaded = true;
      } catch (err) {
        this.editTaskProjects = [];
        this.editTaskCategories = [];
        this.editTaskEmployees = [];
        this.editTaskDataLoaded = true;
        console.error('Error loading edit modal data:', err);
      }
      // Inyectar permisos de edición/borrado
      const myEmployeeId = this.myEmployeeId;
      const myRole = this.normRole(roleValue || '');
      // LOGS DE DEPURACIÓN
      console.log('[PERM DEBUG] myEmployeeId:', myEmployeeId);
      console.log('[PERM DEBUG] tareaSeleccionada:', this.tareaSeleccionada);
      console.log('[PERM DEBUG] tareaSeleccionada.createdByEmployeeId:', this.tareaSeleccionada?.createdByEmployeeId);
      let isOwnTask = false;
      const myUsername = state?.username ?? null;
      if (this.tareaSeleccionada) {
        // Permitir editar si el usuario es el creador por employeeId o username
        // Solo comparar por username, ya que employeeId no está en AuthState
        if (false) {
          // No se puede comparar employeeId
        } else if (
          myUsername &&
          (
            this.tareaSeleccionada.createdByUsername ||
            this.tareaSeleccionada.createdBy ||
            this.tareaSeleccionada.sub
          )
        ) {
          const createdBy =
            this.tareaSeleccionada.createdByUsername ||
            this.tareaSeleccionada.createdBy ||
            this.tareaSeleccionada.sub;
          isOwnTask =
            String(myUsername).toLowerCase() === String(createdBy).toLowerCase();
        }
      }
      
      console.log('[PERM DEBUG] isOwnTask:', isOwnTask);
      console.log('[PERM DEBUG] myRole:', myRole);
      this.isOwnTask = isOwnTask;
      // Solo los USER tienen restricción, ADMIN y OWNER siempre pueden editar/eliminar
      if (myRole === 'USER') {
        // Solo puede editar si es propia
        this.canEditTask = isOwnTask;
        this.canDeleteTask = isOwnTask;
      } else {
        // ADMIN y OWNER pueden editar todo
        this.canEditTask = true;
        this.canDeleteTask = true;
      }
      // Forzar actualización si es necesario
      setTimeout(() => {
        tryRefetchCalendars();
      }, 0);
    });

    // Restaurar estado de calendario al montar vista
    setTimeout(() => restoreFullCalendarState(), 100);
  }

  clearAllFilters(): void {
    // Limpiar selects
    const projectSelect = document.getElementById('project-filter') as HTMLSelectElement | null;
    const categorySelect = document.getElementById('category-filter') as HTMLSelectElement | null;
    const creatorSelect = document.getElementById('creator-filter') as HTMLSelectElement | null;
    if (projectSelect) projectSelect.value = '';
    if (categorySelect) categorySelect.value = '';
    if (creatorSelect) creatorSelect.value = '';
    // Limpiar filtros en el modelo
    this.currentFilters.project = '';
    this.currentFilters.category = '';
    this.currentFilters.creator = '';
    // Mostrar todas las tareas
    this.filterTasks();
    saveFullCalendarState();
  }

  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth',
    plugins: [dayGridPlugin],
    eventContent: (arg: any) => {
      const t = arg.event.extendedProps && arg.event.extendedProps.task ? arg.event.extendedProps.task : arg.event;
      if (!t) return { domNodes: [document.createTextNode(arg.event.title || '')] };
      try {
        const card = createTaskCard(t, { compact: true });
        return { domNodes: [card] };
      } catch {
        return { domNodes: [document.createTextNode(arg.event.title || '')] };
      }
    }
  };
  showCreateTaskModal = false;
  ngOnInit(): void {
    this.init();
    setTimeout(() => this.ngAfterViewInit(), 0);
  }
  currentFilters: {
    searchText: string;
    project?: string;
    category: string;
    creator: string;
    showMineOnly: boolean,
    myProjects: true,
    week: string | null;
  } = {
    searchText: '',
    project: '',
    category: '',
    creator: '',
    showMineOnly: false,
    myProjects: true,
    week: null
  };
  tasks: any[] = [];
  allTasks: any[] = [];
  allProjects: any[] = [];
  creators: any[] = [];
  generalTaskEnums = { statuses: [] as string[] };
  cachedCategories: any[] | null = null;
  myEmployeeId: number | null = null;
  

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private projectService: ProjectService
  ) {}

  // ======= API HELPERS =======
  public apiGet<T>(endpoint: string): Promise<T> {
    const base = this.auth.getApiBase();
    const url = `${base.replace(/\/$/, '')}${endpoint}`;
    return firstValueFrom(this.http.get<T>(url));
  }

  // ======= ENUMS =======
  async loadGeneralTaskEnums(): Promise<{ statuses: string[] }> {
    if (this.generalTaskEnums && Array.isArray(this.generalTaskEnums.statuses) && this.generalTaskEnums.statuses.length) return this.generalTaskEnums;
    try {
      const res = await this.apiGet<any>('/general-tasks/enums');
      this.generalTaskEnums.statuses = res.statuses || [];
    } catch (e) {
      console.warn('Could not load general task enums, falling back to defaults', e);
      this.generalTaskEnums.statuses = ['IN_PROGRESS', 'COMPLETED', 'PAUSED'];
    }
    return this.generalTaskEnums;
  }

  

  // ================= FILTROS BACKEND =================
  async loadCreatorsFromBackend(): Promise<void> {
    try {
      // Obtener todos los empleados
      const allEmployees = await this.apiGet<any[]>('/employees');
      // Obtener los IDs únicos de creadores de tareas (pueden ser string o number)
      const creatorIds = Array.from(new Set((this.allTasks || []).map(t => t.createdByEmployeeId).filter(id => id !== undefined && id !== null)));
      // Filtrar solo empleados que hayan creado tareas (comparar como string y number)
      this.creators = allEmployees.filter(emp => creatorIds.some(cid => String(cid) === String(emp.id)));
    } catch (err) {
      console.error('Error loading creators:', err);
      this.creators = [];
    }
  }

  populateCreatorSelect(): void {
    const select = document.getElementById('creator-filter') as HTMLSelectElement | null;
    if (!select) return;
    select.innerHTML = '<option value="">All</option>';
    (this.creators || []).forEach((creator: any) => {
      const opt = document.createElement('option');
      opt.value = creator.id;
      opt.textContent = creator.name;
      select.appendChild(opt);
    });
  }

  // ========== PROYECTOS ========== 
  async loadProjectsFromService(query: any = {}): Promise<void> {
    try {
      const { items } = await this.projectService.loadProjects(query);
      this.allProjects = items;
    } catch (err) {
      console.error('Error loading projects:', err);
      this.allProjects = [];
    }
  }

  setupFilterListeners(): void {
    const weekInput = document.getElementById('week-filter') as HTMLInputElement | null;
    if (weekInput) {
      weekInput.addEventListener('change', () => {
        this.currentFilters.week = weekInput.value;
        this.onFilterChange();
        // Ir a la semana seleccionada en ambos calendarios
        setTimeout(() => {
          if (weekInput.value) {
            // El valor es "YYYY-Www", convertir a fecha lunes de esa semana
            const [year, week] = weekInput.value.split('-W');
            if (year && week) {
              // ISO: semana inicia en lunes
              const simpleDate = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));
              const firstDay = simpleDate(Number(year), 0, 1);
              const dayOfWeek = firstDay.getUTCDay();
              const daysToAdd = ((Number(week) - 1) * 7) + (dayOfWeek <= 4 ? 1 - dayOfWeek : 8 - dayOfWeek);
              const monday = new Date(firstDay.getTime() + daysToAdd * 86400000);
              const mondayStr = monday.toISOString().slice(0, 10);
              if (this.calendarTaskRef) {
                this.calendarTaskRef.setCalendarDate(mondayStr);
              }
              if (this.calendarWeekPrevRef) {
                this.calendarWeekPrevRef.setCalendarDate(mondayStr);
              }
            }
          }
        }, 0);
      });
    }
    // Filtro de búsqueda por texto (en vivo desde la primera letra)
    const searchInput = document.getElementById('project-search') as HTMLInputElement | null;
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const value = searchInput.value.trim();
        this.currentFilters.searchText = value;
        this.onFilterChange(); // Siempre filtra en vivo
      });
    }
    const projectSelect = document.getElementById('project-filter');
    const categorySelect = document.getElementById('category-filter');
    const creatorSelect = document.getElementById('creator-filter');
    if (projectSelect) projectSelect.addEventListener('change', () => this.onFilterChange());
    if (categorySelect) categorySelect.addEventListener('change', () => this.onFilterChange());
    if (creatorSelect) creatorSelect.addEventListener('change', () => this.onFilterChange());
    const mineOnlyCheckbox = document.getElementById('mine-only-filter') as HTMLInputElement | null;
    if (mineOnlyCheckbox) {
      const self = this;
      mineOnlyCheckbox.checked = !!self.currentFilters.showMineOnly;
      mineOnlyCheckbox.addEventListener('change', () => {
        this.currentFilters.showMineOnly = mineOnlyCheckbox.checked;
        this.onFilterChange();
      });
    }

  }

  onFilterChange(): void {
    const projectSelect = document.getElementById('project-filter') as HTMLSelectElement | null;
    const categorySelect = document.getElementById('category-filter') as HTMLSelectElement | null;
    const creatorSelect = document.getElementById('creator-filter') as HTMLSelectElement | null;
    if (projectSelect) this.currentFilters.project = projectSelect.value;
    if (categorySelect) this.currentFilters.category = categorySelect.value;
    if (creatorSelect) this.currentFilters.creator = creatorSelect.value;

    // Filtrar tareas y actualizar el array mostrado en el calendario
    let filtered = this.allTasks;
    // Filtro de texto (en vivo desde la primera letra)
    const search = (this.currentFilters.searchText || '').trim().toLowerCase();
    if (search.length > 0) {
      filtered = filtered.filter(t => {
        return (
          (t.name && t.name.toLowerCase().includes(search)) ||
          (t.projectName && t.projectName.toLowerCase().includes(search)) ||
          (t.projectCode && t.projectCode.toLowerCase().includes(search)) ||
          (t.clientName && t.clientName.toLowerCase().includes(search))
        );
      });
    }
    if (this.currentFilters.project) filtered = filtered.filter(t => String(t.projectId) === this.currentFilters.project);
    if (this.currentFilters.category) filtered = filtered.filter(t => String(t.taskCategoryId) === this.currentFilters.category);
    if (this.currentFilters.creator) filtered = filtered.filter(t => String(t.createdByEmployeeId) === this.currentFilters.creator);

    // Filtro por semana (ISO 8601)
    if (this.currentFilters.week) {
      // El valor del input type="week" es "YYYY-Www" (ej: "2025-W51")
      const [year, week] = this.currentFilters.week.split('-W');
      if (year && week) {
        filtered = filtered.filter(t => {
          if (!t.issuedDate) return false;
          const date = new Date(t.issuedDate);
          // Obtener año y semana ISO de la fecha de la tarea
          const getWeek = (d: Date) => {
            d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
            const dayNum = d.getUTCDay() || 7;
            d.setUTCDate(d.getUTCDate() + 4 - dayNum);
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
            const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
            return { year: d.getUTCFullYear(), week: weekNum };
          };
          const { year: taskYear, week: taskWeek } = getWeek(date);
          return String(taskYear) === year && String(taskWeek).padStart(2, '0') === week;
        });
      }
    }

    // Mine only filter (Show only tasks from projects where I am assigned)
    const myEmployeeId = this.myEmployeeId;
    if (this.currentFilters.showMineOnly && myEmployeeId) {
      // Obtener los IDs de proyectos donde el usuario está asignado
      const myProjectIds = this.allProjects
        .filter(p => Array.isArray(p.employeeIds) && p.employeeIds.includes(myEmployeeId))
        .map(p => p.id);
      // Filtrar tareas que pertenezcan a esos proyectos
      filtered = filtered.filter(task => myProjectIds.includes(task.projectId));
    }
    // If not filtering by mine only, just show all filtered tasks (no extra filter)
    this.filterTasks();

    // Mostrar mensajes personalizados y ocultar calendario si no hay proyectos asignados
    const calendarContainer = document.getElementById('calendar-legend-container');
    const calendarMessage = document.getElementById('calendar-message');
    const mainCalendar = document.getElementById('main-calendar');
    if (calendarContainer && calendarMessage && mainCalendar) {
      let message = '';
      let hideCalendar = false;
      if (this.currentFilters.showMineOnly) {
        const myProjectIds = this.allProjects
          .filter(p => Array.isArray(p.employeeIds) && p.employeeIds.includes(myEmployeeId))
          .map(p => p.id);
        if (myProjectIds.length === 0) {
          message = 'No projects found • Showing tasks without project assignment';
          hideCalendar = true;
        } else if (filtered.length === 0) {
          message = 'No tasks found without project assignment';
          hideCalendar = true;
        }
      }
      calendarContainer.innerHTML = '';
      calendarMessage.innerText = message;
      calendarMessage.style.display = hideCalendar && message ? 'block' : 'none';
      mainCalendar.style.display = hideCalendar ? 'none' : '';
    }
    
  }



  async loadCategories(): Promise<any[]> {
    if (this.cachedCategories !== null) return this.cachedCategories;
    try {
      this.cachedCategories = await this.apiGet<any[]>('/task-categories');
    } catch (err) {
      console.error('Error loading categories:', err);
      this.cachedCategories = [];
    }
    return this.cachedCategories;
  }

  // ========== INITIALIZATION ========== 
  async init(): Promise<void> {
    try {
      await this.initAuth();
      await this.loadProjectsFromService();
      await this.loadCategories();
      await this.fetchTasks();
      await this.loadCreatorsFromBackend();
      this.populateProjectSelect();
      this.populateCategorySelect();
      this.populateCreatorSelect();
      // Ya no se renderiza la lista, solo en el calendario
      this.setupFilterListeners();
    } catch (err) {
      console.error('Initialization error:', err);
    }
  }

  // Llena el select de proyectos con los datos cargados
  populateProjectSelect(): void {
    const select = document.getElementById('project-filter') as HTMLSelectElement | null;
    if (!select) return;
    select.innerHTML = '<option value="">All Filtered Projects</option>';
    this.allProjects.forEach((p: any) => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.name}${p.projectCode ? ' (' + p.projectCode + ')' : ''}`;
      select.appendChild(opt);
    });
  }

  // Llena el select de categorías con los datos cargados
  populateCategorySelect(): void {
    const select = document.getElementById('category-filter') as HTMLSelectElement | null;
    if (!select) return;
    select.innerHTML = '<option value="">All</option>';
    (this.cachedCategories || []).forEach((cat: any) => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      select.appendChild(opt);
    });
  }

  async initAuth(): Promise<void> {

    // Esperar a que Auth esté listo
    let attempts = 0;
    const win = window as any;
    while ((!win.Auth || !win.Auth.getState) && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 50));
      attempts++;
    }

    if (!win.Auth || !win.Auth.getState) {
      console.warn('No se pudo inicializar el módulo de autenticación. La app continuará en modo limitado.');
      return;
    }

    const state = this.auth.getState?.();
    let myEmployeeId = state?.employeeId != null ? Number(state.employeeId) : null;
    const myUsername = state?.username ?? null;

    if (!myEmployeeId && myUsername && Array.isArray(this.editTaskEmployees) && this.editTaskEmployees.length > 0) {
      // Fallback: buscar por username si no viene en el token
      const found = this.editTaskEmployees.find((e: any) => String(e.username).toLowerCase() === String(myUsername).toLowerCase());
      if (found && found.id) {
        myEmployeeId = found.id;
      }
    }
    this.myEmployeeId = myEmployeeId;


    // Actualizar UI con info de usuario (si tienes user-info en el template)
    const userName = state.username || 'User';
    const role = this.normRole(Array.isArray(state.role) ? state.role[0] : state.role || '');

    const userInfoEl = document.getElementById('user-info');
    if (userInfoEl) {
      // Helpers
      function escapeHtml(s: string) { return String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;'); }
      function roleToClass(r: string) { if(!r) return 'role-user'; const R=String(r).toUpperCase(); if(R==='OWNER') return 'role-owner'; if(R==='ADMIN') return 'role-admin'; return 'role-user'; }
      const initials = userName.split(' ').filter(Boolean).map((n: string) => n.charAt(0)).slice(0, 2).join('').toUpperCase() || userName.slice(0, 2).toUpperCase();
      const cls = roleToClass(role);
      userInfoEl.innerHTML = `
        <div class="user-pill">
            <div class="user-avatar">${escapeHtml(initials)}</div>
            <span class="user-name">${escapeHtml(userName)}</span>
            ${role ? `<span class="role-badge ${cls}">${escapeHtml(role)}</span>` : ''}
        </div>
      `;
      const navConfig = document.getElementById('nav-config');
      if (navConfig) {
        const isAdminOrOwner = role === 'ADMIN' || role === 'OWNER';
        navConfig.style.display = isAdminOrOwner ? '' : 'none';
      }
    }
  }

  normRole(role: string): string {
    if (!role) return '';
    const r = String(role).toUpperCase();
    if (r === 'OWNER') return 'OWNER';
    if (r === 'ADMIN') return 'ADMIN';
    return r;
  }

  async fetchTasks(): Promise<void> {
    const base = this.auth.getApiBase();
    const url = `${base.replace(/\/$/, '')}/general-tasks`;
    try {
      this.allTasks = await firstValueFrom(this.http.get<any[]>(url));
      console.log('Tareas cargadas:', this.allTasks);
      this.filterTasks();
      // Render calendar legend in etiquetas section
      setTimeout(() => {
        const legendContainer = document.getElementById('calendar-legend-container');
        if (legendContainer) {
          legendContainer.innerHTML = '';
          legendContainer.appendChild(createCalendarLegend(this.tasks));
        }
      }, 0);
    } catch (error) {
      console.error('Error al cargar tareas:', error);
    }
  }

async onEditTaskClosed() {
  this.tareaSeleccionada = null;
  await this.fetchTasks(); // O el método que refresca las tareas y el calendario
}


  

}

// Variable global para almacenar los festivos
let allHolidays: any[] = [];

// Cargar festivos (holidays) - mismo endpoint y comportamiento que reportHours
export async function loadHolidays(): Promise<void> {
  try {
    const currentYear = new Date().getFullYear();
    const response = await apiGet(`/holidays/all/${currentYear}`);

    if (response && response.colombia && response.usa) {
      allHolidays = [
        ...response.colombia.map((h: any) => ({ ...h, countryCode: 'CO' })),
        ...response.usa.map((h: any) => ({ ...h, countryCode: 'US' }))
      ];
    } else {
      allHolidays = [];
      console.warn('⚠️ No holidays data received');
    }
  } catch (err) {
    console.error('❌ Error loading holidays:', err);
    allHolidays = [];
  }
}
