import { Injectable } from '@angular/core';
import { TaskFiltersService } from './task-filters.service';
import { TasksPage } from './task';

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

  // ========== RENDER TASKS ==========
  async renderTasksView(currentProjectId: number|null, allProjects: any[], renderAllFilteredTasks: (projects: any[]) => Promise<void>, renderGeneralTasksForProject: (projectId: number) => Promise<void>, escapeHtml: (s: string) => string): Promise<void> {
    const container = document.getElementById('tasks-container');
    if (!container) return;

    // Get filtered projects
    const filteredProjects = this.taskFiltersService.getFilteredProjects();

    // Modified: Always show tasks view, even if no projects (for tasks without project)
    if (filteredProjects.length === 0 && !currentProjectId) {
      container.innerHTML = `
        <div class="tasks-header">
            <p class="muted">No projects found • Showing tasks without project assignment</p>
        </div>
        <div class="tasks-content" id="tasks-content"></div>
      `;
      return await renderAllFilteredTasks([]);
    }

    // If a specific project is selected, show only that project's tasks
    if (currentProjectId) {
      const selectedProject = allProjects.find((p: any) => p.id === currentProjectId);
      if (!selectedProject) {
        container.innerHTML = '<div class="muted">Selected project not found</div>';
        return;
      }
      container.innerHTML = `
        <div class="tasks-header">
            <h2>📋 ${escapeHtml(selectedProject.name)}</h2>
            <p class="muted">Tasks</p>
        </div>
        <div class="tasks-content" id="tasks-content"></div>
      `;
      return await renderGeneralTasksForProject(currentProjectId);
    }

    // Show all tasks from all filtered projects using custom multi-project view
    container.innerHTML = `
      <div class="tasks-header">
          <p class="muted">${filteredProjects.length} project${filteredProjects.length !== 1 ? 's' : ''} • Click on any task to view deliverable information</p>
      </div>
      <div class="tasks-content" id="tasks-content"></div>
    `;
    return await renderAllFilteredTasks(filteredProjects);
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
      if (allTasksArray.length === 0) {
        const msg = currentFilters.searchText || currentFilters.category || currentFilters.creator || currentFilters.mineOnly || currentFilters.week ?
          'No tasks found matching your filters' :
          (projects.length === 0 ? 'No tasks found without project assignment' : 'No tasks found in the filtered projects');
        contentEl.innerHTML = `<div class="muted">${msg}</div>`;
        return;
      }
      // renderMultiProjectCalendar eliminado, ahora está en CalendarTask
    } catch (err: any) {
      console.error('Error loading tasks:', err);
      contentEl.innerHTML = `<div class="error-message">Error loading tasks: ${escapeHtml(err.message)}</div>`;
    }
  }

  // ========== RENDER GENERAL TASKS FOR PROJECT ==========
  async renderGeneralTasksForProject(
    projectId: number,
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
      let tasks = await apiGet(`/general-tasks/search?projectId=${projectId}&size=1000`);
      populateFilterDropdowns(tasks);
      tasks = applyAllFilters(tasks);
      if (tasks.length === 0) {
        const msg = currentFilters.searchText || currentFilters.category || currentFilters.creator || currentFilters.mineOnly || currentFilters.week ?
          'No tasks found matching your filters in this project' :
          'No tasks found in this project';
        contentEl.innerHTML = `<div class="muted">${msg}</div>`;
        return;
      }
      // renderMultiProjectCalendar eliminado, ahora está en CalendarTask
    } catch (err: any) {
      console.error('Error loading tasks:', err);
      contentEl.innerHTML = `<div class="error-message">Error loading tasks: ${escapeHtml(err.message)}</div>`;
    }
  }

  // ========== FILTER HELPER FUNCTIONS ==========
  populateFilterDropdowns(tasks: any[]): void {
    // Get unique categories and creators from tasks
    const categories = [...new Set(tasks.map(t => t.taskCategoryName).filter(Boolean))];
    const creators = [...new Set(tasks.map(t => t.createdByEmployeeName).filter(Boolean))];

    // Populate category dropdown
    const categorySelect = document.getElementById('category-filter') as HTMLSelectElement | null;
    if (categorySelect) {
      const currentValue = categorySelect.value;
      categorySelect.innerHTML = '<option value="">All</option>';
      categories.sort().forEach((cat: string) => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        if (cat === currentValue) opt.selected = true;
        categorySelect.appendChild(opt);
      });
    }
    // Puedes agregar aquí la lógica para el dropdown de creadores si lo necesitas
  }

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
      // Mine only filter
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
        let dateStr = task.issuedDate || task.createdDate;
        if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          // YYYY-MM-DD => YYYY-MM-DDT00:00:00 (local)
          dateStr = dateStr + 'T00:00:00';
        }
        const taskDate = new Date(dateStr);
        const weekStart = getWeekStart(currentFilters.week);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const prevStart = new Date(weekStart);
        prevStart.setDate(prevStart.getDate() - 7);
        const prevEnd = new Date(prevStart);
        prevEnd.setDate(prevEnd.getDate() + 6);
        const inSelected = taskDate >= weekStart && taskDate <= weekEnd;
        const inPrevious = taskDate >= prevStart && taskDate <= prevEnd;
        if (!inSelected && !inPrevious) {
          return false;
        }
      }
      return true;
    });
  }

  // ========== MULTI-PROJECT CALENDAR RENDER & HELPERS ==========
  getWeekStart(weekString: string): Date {
    // weekString format: "2025-W02"
    const [year, week] = weekString.split('-W');
    const date = new Date(Number(year), 0, 1 + (Number(week) - 1) * 7);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  }

  getMonday(date: Date | string): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  formatDateLocal(d: Date | string): string {
    const date = new Date(d);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

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
        console.log('My projects filter:', currentFilters.myProjects);
        this.updateProjectDropdown();
        renderTasksView();
      } else if (e.target.id === 'project-filter') {
        const value = e.target.value;
        setCurrentProjectId(value ? parseInt(value) : null);
        console.log('Selected project:', value);
        renderTasksView();
      } else if (e.target.id === 'category-filter') {
        currentFilters.category = e.target.value;
        console.log('Category filter:', currentFilters.category);
        renderTasksView();
      } else if (e.target.id === 'creator-filter') {
        currentFilters.creator = e.target.value;
        console.log('Creator filter:', currentFilters.creator);
        renderTasksView();
      } else if (e.target.id === 'mine-only-filter') {
        currentFilters.mineOnly = e.target.checked;
        console.log('Mine only filter:', currentFilters.mineOnly);
        renderTasksView();
      } else if (e.target.id === 'week-filter') {
        currentFilters.week = e.target.value || null;
        console.log('Week filter:', currentFilters.week);
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

  // Ejemplo de uso:
  async getCategoriesForDropdown(): Promise<any[]> {
    return await this.tasksPage.loadCategories();
  }

  
}