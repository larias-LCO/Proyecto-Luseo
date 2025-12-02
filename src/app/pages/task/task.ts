// Helper para obtener el label de status
function getStatusLabel(status: string): string {
  switch (status) {
    case 'IN_PROGRESS': return 'In Progress';
    case 'COMPLETED': return 'Completed';
    case 'PAUSED': return 'Paused';
    default: return status;
  }
}

// Helper para hacer POST
async function apiPost(endpoint: string, payload: any): Promise<any> {
  const base = (window as any).ng?.getInjector?.(TasksPage)?.get(AuthService)?.getApiBase?.() || '';
  const url = `${base.replace(/\/$/, '')}${endpoint}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!resp.ok) throw new Error('POST failed: ' + resp.status);
  return resp.json();
}

// Helper para refrescar la vista de tareas
async function renderTasksView() {
  // Busca el componente Angular y llama a fetchTasks y filterAndRenderTasks
  const ngComponent = (window as any).ng?.getInjector?.(TasksPage)?.get(TasksPage);
  if (ngComponent) {
    await ngComponent.fetchTasks();
    ngComponent.filterAndRenderTasks();
  } else if ((window as any).tasksPageInstance) {
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
  if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
  const r = parseInt(hex.substr(0,2),16), g = parseInt(hex.substr(2,2),16), b = parseInt(hex.substr(4,2),16);
  return ((r*0.299 + g*0.587 + b*0.114) > 186) ? '#222222' : '#ffffff';
}

function darkenColor(hex: string, percent: number): string {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
  let r = parseInt(hex.substr(0,2),16), g = parseInt(hex.substr(2,2),16), b = parseInt(hex.substr(4,2),16);
  r = Math.max(0, r - Math.round(2.55 * percent));
  g = Math.max(0, g - Math.round(2.55 * percent));
  b = Math.max(0, b - Math.round(2.55 * percent));
  return `#${(r<<16|g<<8|b).toString(16).padStart(6,'0')}`;
}

function showGeneralTaskDetails(id: number, name: string) {
  // Aquí deberías abrir el modal de edición o detalles
  alert(`Abrir detalles de la tarea: ${name} (ID: ${id})`);
}


// Usa el helper global para renderizar la tarjeta de tarea
import { createTaskCard } from '../../shared/task-card.helper';

import { Component, OnInit } from '@angular/core';
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

@Component({
  selector: 'app-task',
  standalone: true,
  imports: [HeaderComponent, SubmenuComponent, CommonModule, CreateTaskCard, FullCalendarModule, CalendarTask, EditTask],
  templateUrl: './task.html',
  styleUrls: ['./task.scss']
})
export class TasksPage implements OnInit {

  
  tareaSeleccionada: any = null;
  ngAfterViewInit(): void {
    const clearBtn = document.getElementById('clear-all-filters');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearAllFilters());
    }
    // Escuchar evento global para abrir modal de edición
    window.addEventListener('open-edit-task-modal', (e: any) => {
      this.tareaSeleccionada = e.detail.task;
      // Forzar actualización si es necesario
      setTimeout(() => {}, 0);
    });
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
    this.tasks = this.allTasks;
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
    mineOnly: boolean;
    myProjects: boolean;
    week: string | null;
  } = {
    searchText: '',
    project: '',
    category: '',
    creator: '',
    mineOnly: false,
    myProjects: false,
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
  private apiGet<T>(endpoint: string): Promise<T> {
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
      this.creators = await this.apiGet<any[]>('/employees');
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
    const projectSelect = document.getElementById('project-filter');
    const categorySelect = document.getElementById('category-filter');
    const creatorSelect = document.getElementById('creator-filter');
    if (projectSelect) projectSelect.addEventListener('change', () => this.onFilterChange());
    if (categorySelect) categorySelect.addEventListener('change', () => this.onFilterChange());
    if (creatorSelect) creatorSelect.addEventListener('change', () => this.onFilterChange());
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
    if (this.currentFilters.project) filtered = filtered.filter(t => String(t.projectId) === this.currentFilters.project);
    if (this.currentFilters.category) filtered = filtered.filter(t => String(t.taskCategoryId) === this.currentFilters.category);
    if (this.currentFilters.creator) filtered = filtered.filter(t => String(t.createdByEmployeeId) === this.currentFilters.creator);
    this.tasks = filtered;
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
      await this.loadCreatorsFromBackend();
      this.populateProjectSelect();
      this.populateCategorySelect();
      this.populateCreatorSelect();
      await this.fetchTasks();
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
      throw new Error('Auth module not available');
    }

    const state = win.Auth.getState();
    this.myEmployeeId = state.employeeId || null;

    // Actualizar UI con info de usuario (si tienes user-info en el template)
    const userName = state.username || 'User';
    const role = this.normRole(state.role || (state.authorities && state.authorities[0]) || '');

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
      this.tasks = this.allTasks;
      console.log('Tareas cargadas:', this.tasks);
    } catch (error) {
      console.error('Error al cargar tareas:', error);
    }
  }



  

}
