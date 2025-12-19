// Helper para obtener el inicio de la semana desde un string tipo '2025-49' o '2025-W49'
function getWeekStart(weekString: string): Date {
  // Soporta formatos 'YYYY-Www' o 'YYYY-ww'
  const match = weekString.match(/(\d{4})-W?(\d{1,2})/);
  if (!match) return new Date();
  const year = parseInt(match[1], 10);
  const week = parseInt(match[2], 10);
  const date = new Date(year, 0, 1 + (week - 1) * 7);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { TaskFiltersService } from './task-filters.service';
import { TasksPage } from './task';
import { Project } from './task.model';
declare const escapeHtml: (s: string) => string;


@Injectable({ providedIn: 'root' })
export class TaskRenderService {
  constructor(private taskFiltersService: TaskFiltersService, private tasksPage: TasksPage) {}

      // ========== RENDER FILTERS ==========
      renderFilters() {
        const filterSection = document.querySelector('.filter-section .filter-row');
        if (!filterSection) return;
      }

      updateProjectDropdown(): void {
        const select = document.getElementById('project-filter') as HTMLSelectElement | null;
        if (!select) return;
        const filtered = this.taskFiltersService?.getFilteredProjects();
        const currentValue = select.value;
        select.innerHTML = '<option value="">All Filtered Projects</option>';
        filtered.forEach((p: any) => {
          const opt = document.createElement('option');
          opt.value = p.id;
          opt.textContent = `${p.name}${p.projectCode ? ' (' + p.projectCode + ')' : ''}`;
          if (String(p.id) === currentValue) opt.selected = true;
          select.appendChild(opt);
        });
        console.log('Updated dropdown with', filtered.length, 'projects');
      } 

  // ========== SETUP EVENT LISTENERS ========
setupEventListeners(renderTasksView: () => void, createGeneralTask: () => void, currentFilters: any, setCurrentProjectId: (id: number|null) => void): void {
    // New Task button
    const newTaskBtn = document.getElementById('openCreateTask');
    if (newTaskBtn) {
      newTaskBtn.addEventListener('click', () => {
        createGeneralTask();
      });
    }
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        const win = window as any;
        if (win.Auth && win.Auth.logout) {
          await win.Auth.logout();
        }
        location.href = '/login.html';
      });
    }
    // Delegate events to document for dynamically created elements
    document.addEventListener('click', (e: any) => {
      if (e.target.id === 'clear-all-filters') {
        setCurrentProjectId(null);
        currentFilters.searchText = '';
        currentFilters.category = '';
        currentFilters.creator = '';
        currentFilters.mineOnly = false;
        currentFilters.week = null;
        // Update UI
        const projectDropdown = document.getElementById('project-filter') as HTMLSelectElement | null;
        if (projectDropdown) projectDropdown.value = '';
        const searchInput = document.getElementById('project-search') as HTMLInputElement | null;
        if (searchInput) searchInput.value = '';
        const categorySelect = document.getElementById('category-filter') as HTMLSelectElement | null;
        if (categorySelect) categorySelect.value = '';
        const creatorSelect = document.getElementById('creator-filter') as HTMLSelectElement | null;
        if (creatorSelect) creatorSelect.value = '';
        const mineCheckbox = document.getElementById('mine-only-filter') as HTMLInputElement | null;
        if (mineCheckbox) mineCheckbox.checked = false;
        const weekInput = document.getElementById('week-filter') as HTMLInputElement | null;
        if (weekInput) weekInput.value = '';
        renderTasksView();
      }
    });
    document.addEventListener('change', (e: any) => {
      if (e.target.id === 'filter-my-projects') {
        currentFilters.myProjects = e.target.checked;
          this.updateProjectDropdown();
                renderTasksView();
      } else if (e.target.id === 'project-filter') {
        const value = e.target.value;
        setCurrentProjectId(value ? parseInt(value) : null);
        renderTasksView();

      } else if (e.target.id === 'category-filter') {
        currentFilters.category = e.target.value;
        renderTasksView();
        
      } else if (e.target.id === 'creator-filter') {
        currentFilters.creator = e.target.value;
        renderTasksView();
      } else if (e.target.id === 'mine-only-filter') {
        currentFilters.mineOnly = e.target.checked;
        renderTasksView();
      } else if (e.target.id === 'week-filter') {
        currentFilters.week = e.target.value || null;
        renderTasksView();
      }
    });
    document.addEventListener('input', (e: any) => {
      if (e.target.id === 'project-search') {
        currentFilters.searchText = e.target.value;
      this.updateProjectDropdown();
        renderTasksView();
      }
    });
  }


  //====================================RENDER TASKS VIEW======================================
async renderTasksView(): Promise<void> {
    const container = document.getElementById('tasks-container');
    if (!container) 
      return Promise.resolve();

    // Asume que estas funciones/variables existen y tienen tipos correctos
    const filteredProjects: Project[] = this.taskFiltersService.getFilteredProjects();
    // currentProjectId: number | null
    // allProjects: Project[]
    // escapeHtml: (s: string) => string
    // renderAllFilteredTasks: (projects: Project[]) => Promise<void>
    // renderGeneralTasksForProject: (projectId: number) => Promise<void>
    // currentFilters: { searchText?: string; category?: string; creator?: string; mineOnly?: boolean; week?: string }

    if (filteredProjects.length === 0 && !this.tasksPage.currentProjectId) {
        container.innerHTML = `
            <div class="tasks-header">
                <p class="muted">No projects found • Showing tasks without project assignment</p>
            </div>
            <div class="tasks-content" id="tasks-content"></div>
        `;
        // Use a local implementation or import if available
        // await renderAllFilteredTasks([], this.tasksPage.apiGet, this.tasksPage.currentFilters, this.populateFilterDropdowns, this.applyAllFilters, escapeHtml);
        return Promise.resolve();
    }

    if (this.tasksPage.currentProjectId) {
      const selectedProject = this.tasksPage.allProjects.find((p: any) => p.id === this.tasksPage.currentProjectId);
      if (!selectedProject) {
        container.innerHTML = '<div class="muted">Selected project not found</div>';
        return Promise.resolve();
      }

      container.innerHTML = `
        <div class="tasks-header">
          <h2>📋 ${escapeHtml(selectedProject.name)}</h2>
          <p class="muted">Tasks</p>
        </div>
        <div class="tasks-content" id="tasks-content"></div>
      `;

      // await renderGeneralTasksForProject(this.tasksPage.currentProjectId);
      return Promise.resolve();
    }

    container.innerHTML = `
        <div class="tasks-header">
            <p class="muted">${filteredProjects.length} project${filteredProjects.length !== 1 ? 's' : ''} • Click on any task to view deliverable information</p>
        </div>
        <div class="tasks-content" id="tasks-content"></div>
    `;

    if (filteredProjects.length === 0) {
        const msg =
            this.tasksPage.currentFilters.searchText || this.tasksPage.currentFilters.category || this.tasksPage.currentFilters.creator || this.tasksPage.currentFilters.showMineOnly || this.tasksPage.currentFilters.week
                ? 'No tasks found matching your filters'
                : 'No tasks found without project assignment';

        // await renderAllFilteredTasks(filteredProjects);

        try {
            const firstChild = container.firstElementChild;
            const note = document.createElement('div');
            note.className = 'muted';
            note.style.cssText = 'padding:8px 12px; margin-bottom:8px; color: #64748b; font-weight:600;';
            note.textContent = msg;
            if (firstChild) container.insertBefore(note, firstChild);
        } catch (e) { /* ignore DOM insert errors */ }

        return Promise.resolve();
    }

    // await renderAllFilteredTasks(filteredProjects, this.tasksPage.apiGet, this.tasksPage.currentFilters, this.populateFilterDropdowns, this.applyAllFilters, escapeHtml);
}


    // ========== RENDER ALL FILTERED TASKS ==========
  async renderAllFilteredTasks(
    projects: any[],
    apiGet: (url: string) => Promise<any>,
    currentFilters: any,
    populateFilterDropdowns: (tasks: any[]) => void,
    applyAllFilters: (tasks: any[]) => any[],
    // renderMultiProjectCalendar eliminado, ahora está en CalendarTask
    escapeHtml: (s: string) => string
  ): Promise<void> {
    const contentEl = document.getElementById('tasks-content');
    if (!contentEl) return;

    contentEl.innerHTML = '<div class="loading">Loading tasks...</div>';

    try {
      const projectIds = projects.map(p => p.id);
      let allTasksArray: any[] = [];


      if (projectIds.length > 0) {
        const queryString = projectIds.map(id => `projectIds=${id}`).join('&');
        allTasksArray = await apiGet(`/general-tasks/bulk?${queryString}`);
        if (currentFilters.myProjects) {
          allTasksArray = allTasksArray.filter(t => t.projectId != null);
        }
      } else {
        if (currentFilters.myProjects) {
          allTasksArray = [];
        } else {
          try {
            allTasksArray = await apiGet('/general-tasks');
          } catch (err) {
            console.error('Error loading all tasks:', err);
          }
        }
      }
      populateFilterDropdowns(allTasksArray);
      allTasksArray = applyAllFilters(allTasksArray);

       try { console.debug('renderAllFilteredTasks -> loaded tasks:', allTasksArray.length, 'projects:', projects.length); } catch (e) {}

      if (allTasksArray.length === 0) {
        const msg = currentFilters.searchText || currentFilters.category || currentFilters.creator || currentFilters.mineOnly || currentFilters.week ?
          'No tasks found matching your filters' :
          (projects.length === 0 ? 'No tasks found without project assignment' : 'No tasks found in the filtered projects');

        // contentEl.innerHTML = `<div class="muted">${msg}</div>`;
        // return;

         //aqui va esta linea de miltiprojectcalendar que esta en calendar task, debo importarla
         // Render calendar (will insert legend + weeks). After rendering, prepend a muted message.
        // renderMultiProjectCalendar(contentEl, allTasksArray);

                // Prepend a single-line muted note above the calendar (non-invasive)
                try {
                    const firstChild = contentEl.firstElementChild;
                    const note = document.createElement('div');
                    note.className = 'muted';
                    note.style.cssText = 'padding:8px 12px; margin-bottom:8px; color: #64748b; font-weight:600;';
                    note.textContent = msg;
                    if (firstChild) contentEl.insertBefore(note, firstChild);
                } catch (e) { /* ignore DOM insert errors */ }

                return;
      }
      // return await renderMultiProjectCalendar(contentEl, allTasksArray);
      // renderMultiProjectCalendar eliminado, ahora está en CalendarTask
    } catch (err: any) {
      console.error('Error loading tasks:', err);
      contentEl.innerHTML = `<div class="error-message">Error loading tasks: ${escapeHtml(err.message)}</div>`;
    }
  }



  async renderGeneralTasksForProject(projectId: number): Promise<void> {
    const contentEl = document.getElementById('tasks-content');
    if (!contentEl) return;

    contentEl.innerHTML = '<div class="loading">Loading tasks...</div>';

    try {
      let tasks: any[] = await this.tasksPage.apiGet(`/general-tasks/search?projectId=${projectId}&size=1000`);
      this.populateFilterDropdowns(tasks);
        tasks = this.applyAllFilters(
          tasks,
          this.tasksPage.currentFilters,
          this.tasksPage.createdByEmployeeId ?? 0,
          this.tasksPage.allProjects,
          getWeekStart
        );
      if (tasks.length === 0) {
        const msg =
          this.tasksPage.currentFilters.searchText || this.tasksPage.currentFilters.category || this.tasksPage.currentFilters.creator || this.tasksPage.currentFilters.showMineOnly || this.tasksPage.currentFilters.week
            ? 'No tasks found matching your filters in this project'
            : 'No tasks found in this project';
        try {
          const firstChild = contentEl.firstElementChild;
          const note = document.createElement('div');
          note.className = 'muted';
          note.style.cssText = 'padding:8px 12px; margin-bottom:8px; color: #64748b; font-weight:600;';
          note.textContent = msg;
          if (firstChild) contentEl.insertBefore(note, firstChild);
        } catch (e) {}
        return;
      }
      // Aquí puedes agregar lógica para renderizar las tareas si existen
    } catch (err: any) {
      console.error('Error loading tasks:', err);
      contentEl.innerHTML = `<div class="error-message">Error loading tasks: ${escapeHtml(err.message)}`;
    }
  }

//===============POPULATE FILTER DROPDOWNS=========]
  populateFilterDropdowns(tasks: any[]): void {
    // Obtener categorías y creadores únicos
    const categories: string[] = [...new Set(tasks.map(t => t.taskCategoryName).filter(Boolean))];
    const creators: string[] = [...new Set(tasks.map(t => t.createdByEmployeeName).filter(Boolean))];

    // Poblar el dropdown de categorías
    const categorySelect = document.getElementById('category-filter') as HTMLSelectElement | null;
    if (categorySelect) {
        const currentValue = categorySelect.value;
        categorySelect.innerHTML = '<option value="">All</option>';
        categories.sort().forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            if (cat === currentValue) opt.selected = true;
            categorySelect.appendChild(opt);
        });
    }

    // Poblar el dropdown de creadores
    const creatorSelect = document.getElementById('creator-filter') as HTMLSelectElement | null;
    if (creatorSelect) {
        const currentValue = creatorSelect.value;
        creatorSelect.innerHTML = '<option value="">All</option>';
        creators.sort().forEach(creator => {
            const opt = document.createElement('option');
            opt.value = creator;
            opt.textContent = creator;
            if (creator === currentValue) opt.selected = true;
            creatorSelect.appendChild(opt);
        });
    }
}

//================================APPLY ALL FILTERS==================================
 // ========== APPLY ALL FILTERS ========== 
applyAllFilters(
    tasks: any[],
    currentFilters: any,
    myEmployeeId: number,
    allProjects: any[],
    getWeekStart: (week: string) => Date
  ): any[] {
    return tasks.filter(task => {
      // MyProjects filter
      if (currentFilters.myProjects && myEmployeeId) {
        const hasProject = task.projectId != null;
        if (hasProject) {
          const project = allProjects.find((p: any) => p.id === task.projectId);
          if (project) {
            const isPM = project.projectManagerId === myEmployeeId;
            const isTeamMember = Array.isArray(project.employeeIds) && project.employeeIds.includes(myEmployeeId);
            if (!isPM && !isTeamMember) {
              return false;
            }
          } else {
            return false;
          }
        } else {
          return false;
        }
      }
      // Search filter
      if (currentFilters.searchText && currentFilters.searchText.trim()) {
        const searchLower = currentFilters.searchText.toLowerCase();
        const projectCode = (task.projectCode || '').toLowerCase();
        const projectName = (task.projectName || '').toLowerCase();
        const clientName = (task.clientName || '').toLowerCase();
        const taskName = (task.name || '').toLowerCase();
        const matchesSearch = projectCode.includes(searchLower) ||
                             projectName.includes(searchLower) ||
                             clientName.includes(searchLower) ||
                             taskName.includes(searchLower);
        if (!matchesSearch) return false;
      }
      // Category filter
      if (currentFilters.category && task.taskCategoryName !== currentFilters.category) {
        return false;
      }
      // Creator filter
      if (currentFilters.creator && task.createdByEmployeeName !== currentFilters.creator) {
        return false;
      }
      // Mine only filter: mostrar tareas de proyectos donde soy miembro
      if (currentFilters.mineOnly && myEmployeeId) {
         const taskCreatorId = task.createdByEmployeeId || task.createdById ||
                    (task.createdByEmployee && task.createdByEmployee.id) ||
                    (task.createdBy && task.createdBy.id);
                if (!taskCreatorId || Number(taskCreatorId) !== Number(myEmployeeId)) {
                    return false;
        }
      }
      // Week filter
      if (currentFilters.week) {
 const dateStr = (task.issuedDate || task.createdDate || '').split('T')[0];
                let taskDate;
                if (dateStr) {
                    const [y, m, d] = dateStr.split('-');
                    taskDate = new Date(Number(y), Number(m) - 1, Number(d));
                    taskDate.setHours(0,0,0,0);
                } else {
                    // Fallback to now (will likely be excluded)
                    taskDate = new Date();
                    taskDate.setHours(0,0,0,0);
                }

                const weekStart = getWeekStart(currentFilters.week);
                weekStart.setHours(0,0,0,0);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);
                weekEnd.setHours(23,59,59,999);

                // Also include previous week
                const prevStart = new Date(weekStart);
                prevStart.setDate(prevStart.getDate() - 7);
                prevStart.setHours(0,0,0,0);
                const prevEnd = new Date(prevStart);
                prevEnd.setDate(prevEnd.getDate() + 6);
                prevEnd.setHours(23,59,59,999);

                const inSelected = taskDate >= weekStart && taskDate <= weekEnd;
                const inPrevious = taskDate >= prevStart && taskDate <= prevEnd;
                if (!inSelected && !inPrevious) {
                    return false;
                }
            }

            return true;
    });
  }

}