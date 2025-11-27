import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-create-task-card',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-task-card.html',
  styleUrl: './create-task-card.scss'
})
export class CreateTaskCard implements OnInit {
  @Output() close = new EventEmitter<void>();

  projects: any[] = [];
  categories: any[] = [];
  statuses: any[] = [];
  phases: any[] = [];
  form: FormGroup;
  message = '';
  messageColor = '';
  showEndDate = false;

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      projectId: [''],
      projectPhaseId: [''],
      taskCategoryId: ['', Validators.required],
      issuedDate: [''],
      endDate: [''],
      status: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadProjects();
    this.loadCategories();
    this.loadStatuses();
    // Fases se cargan al seleccionar proyecto
    this.form.get('projectId')?.valueChanges.subscribe(val => this.onProjectChange(val));
    this.form.get('taskCategoryId')?.valueChanges.subscribe(val => this.onCategoryChange(val));
  }

  private apiGet<T>(endpoint: string) {
    const base = this.auth.getApiBase();
    const url = `${base.replace(/\/$/, '')}${endpoint}`;
    return this.http.get<T>(url);
  }

  loadProjects() {
    this.apiGet<any[]>('/projects').subscribe(data => this.projects = data);
  }
  loadCategories() {
    this.apiGet<any[]>('/task-categories').subscribe(data => this.categories = data);
  }
  loadStatuses() {
    this.apiGet<any>('/general-tasks/enums').subscribe(data => {
      this.statuses = data.statuses || [];
      // Set default status
      if (this.statuses.length && !this.form.get('status')?.value) {
        this.form.get('status')?.setValue('IN_PROGRESS');
      }
    });
  }
  onProjectChange(projectId: string) {
    this.phases = [];
    if (projectId && !isNaN(+projectId)) {
      this.apiGet<any[]>(`/projects/${projectId}/phases`).subscribe(data => this.phases = data || []);
    }
    this.form.get('projectPhaseId')?.setValue('');
  }
  onCategoryChange(categoryId: string) {
    const selected = this.categories.find(c => c.id == categoryId);
    this.showEndDate = selected && selected.name && selected.name.toLowerCase().includes('out of office');
    if (!this.showEndDate) {
      this.form.get('endDate')?.setValue('');
    }
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.message = 'Creating...';
    this.messageColor = '#64748b';
    const values = this.form.value;
    const isOutOfOffice = this.showEndDate;
    const basePayload: any = {
      name: values.name.trim(),
      description: values.description?.trim() || null,
      projectId: values.projectId && !isNaN(+values.projectId) ? +values.projectId : null,
      projectPhaseId: values.projectPhaseId && values.projectId ? +values.projectPhaseId : null,
      taskCategoryId: +values.taskCategoryId,
      personalTask: false,
      personal_task: false,
      status: values.status
    };
    try {
      if (isOutOfOffice) {
        const startDate = values.issuedDate;
        const endDate = values.endDate;
        if (!startDate || !endDate) {
          this.message = 'Please select start and end date for vacations';
          this.messageColor = '#ef4444';
          return;
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end < start) {
          this.message = 'End date must be after start date';
          this.messageColor = '#ef4444';
          return;
        }
        const payload = { ...basePayload, issuedDate: startDate, endDate: endDate };
        await this.apiPost('/general-tasks', payload);
        this.message = `Created vacation task (${Math.ceil((end.getTime() - start.getTime()) / (1000*60*60*24)) + 1} days)!`;
        this.messageColor = '#10b981';
      } else {
        const payload = { ...basePayload, issuedDate: values.issuedDate || null };
        await this.apiPost('/general-tasks', payload);
        this.message = 'Task created successfully!';
        this.messageColor = '#10b981';
      }
      this.form.reset();
      this.close.emit();
    } catch (err: any) {
      this.message = 'Error: ' + (err?.message || err);
      this.messageColor = '#ef4444';
    }
  }

  private apiPost(endpoint: string, payload: any) {
    const base = this.auth.getApiBase();
    const url = `${base.replace(/\/$/, '')}${endpoint}`;
    return this.http.post(url, payload).toPromise();
  }

  // Utilidad: crear tarjeta visual de tarea (devuelve HTMLElement)
  public createTaskCard(task: any, options: any = {}): HTMLElement {
  const card = document.createElement('div');
  card.className = 'gt-card gt-card-mini';
  card.style.position = 'relative';
  card.style.borderRadius = '10px';
  card.style.overflow = 'hidden';
  card.style.transition = 'transform 0.15s ease, box-shadow 0.15s ease, opacity 0.3s ease';

  // Use category color as background, with fallback to white
  const categoryColor = task.taskCategoryColorHex || '#ffffff';
  card.style.background = categoryColor;
  card.style.border = `2px solid ${this.darkenColor(categoryColor, 20)}`;

  // Add visual separator for project type (top border with specific color - light tones)
  if (task.projectType === 'COMMERCIAL') {
    card.style.borderTop = '4px solid #7DD3FC';
    card.setAttribute('data-project-type', 'COMMERCIAL');
  } else if (task.projectType === 'RESIDENTIAL') {
    card.style.borderTop = '4px solid #6EE7B7';
    card.setAttribute('data-project-type', 'RESIDENTIAL');
  }

  // Calculate text color based on background brightness
  const textColor = this.getContrastColor(categoryColor);
  card.style.color = textColor;

  // Reduce opacity if task is COMPLETED
  if (task.status === 'COMPLETED') {
    card.style.opacity = '0.45';
  }

   const statusConfig: Record<string, { text: string; color: string; bg: string; icon: string }> = {
    'IN_PROGRESS': { text: 'In Progress', color: '#1e40af', bg: '#dbeafe', icon: '⏱️' },
    'COMPLETED': { text: 'Completed', color: '#065f46', bg: '#d1fae5', icon: '✅' },
    'PAUSED': { text: 'Paused', color: '#92400e', bg: '#fef3c7', icon: '⛔' }
  };
  const status = (task.status || 'IN_PROGRESS') as keyof typeof statusConfig;
  const statusInfo = statusConfig[status] ?? statusConfig['IN_PROGRESS'];

  const pmName = task.projectManagerName || '';
  const creatorName = task.createdByEmployeeName || '';

  // No per-card buttons (edit/delete) to reduce clicks; open edit modal on click
  const actionsHtml = `
    <div class="task-card-actions" style="position:absolute; top:6px; right:6px; display:flex; gap:6px; pointer-events:none; opacity:0; z-index:10;">
    </div>
  `;

  if (options.compact) {
    card.style.padding = '0';
    card.style.fontSize = '12px';
    card.style.cursor = 'pointer';

    // Project type indicator (COMMERCIAL/RESIDENTIAL)
    const projectTypeIcon = task.projectType === 'COMMERCIAL' ? '🏢' : task.projectType === 'RESIDENTIAL' ? '🏠' : '';
    const projectTypeColor = task.projectType === 'COMMERCIAL' ? 'background:#7DD3FC; color:#fff;' : task.projectType === 'RESIDENTIAL' ? 'background:#6EE7B7; color:#fff;' : '';
    const projectTypeBadge = projectTypeIcon ? `<span style="position:absolute; top:2px; right:2px; font-size:14px; padding:3px 5px; ${projectTypeColor} border-radius:6px; font-weight:800; box-shadow:0 2px 4px rgba(0,0,0,0.3); z-index:1;">${projectTypeIcon}</span>` : '';
    const contentPaddingRight = projectTypeIcon ? 'padding-right: 30px;' : '';
    const projectInfo = (task.projectCode || task.projectName) ? `
      <div style="padding:0; margin:0;">
        <div style="display:flex; gap:2px; align-items:center; margin:0; padding:0;">
          <span style="font-size:12px; flex-shrink:0; line-height:1;">📦</span>
          <div style="flex:1; margin:0; padding:0; ${contentPaddingRight}">
            <div style="font-weight:700; font-size:11px; line-height:1; color: ${textColor}; text-shadow: 1px 1px 2px ${textColor === '#ffffff' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'}; margin:0; padding:0;">${this.escapeHtml(task.projectCode || 'No Project')} ${task.projectName ? '- ' + this.escapeHtml(task.projectName) : ''}</div>
          </div>
        </div>
      </div>
    ` : '';

    card.innerHTML = `
      ${actionsHtml}
      ${projectTypeBadge}
      <div class="gt-body" style="display:flex; flex-direction:column; gap:2px; margin:0;">
        ${projectInfo}
        <div style="padding:0; margin:0; display:flex; flex-direction:column; gap:2px;">
          <div style="display:flex; gap:2px; align-items:center; font-size:10px; margin:0; padding:0;">
            <span style="line-height:1;">📝</span>
            <div style="font-weight:700; flex:1; line-height:1; color: ${textColor}; text-shadow: 1px 1px 2px ${textColor === '#ffffff' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'}; margin:0; padding:0; ${contentPaddingRight}">${this.escapeHtml(task.name || '')}</div>
          </div>
          <div style="display:flex; gap:4px; align-items:flex-start; font-size:10px; opacity:0.9;">
            <span>📂</span>
            <div style="flex:1; line-height:1.2; color: ${textColor}; text-shadow: 1px 1px 2px ${textColor === '#ffffff' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'};">${this.escapeHtml(task.taskCategoryName || '-')}</div>
          </div>
          ${pmName ? `<div style="font-size:9px; padding:0; margin:0; font-weight:600; color: ${textColor}; line-height:1; text-shadow: 1px 1px 2px ${textColor === '#ffffff' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'};">👤 PM: ${this.escapeHtml(pmName)}</div>` : ''}
          <div style="display:flex; justify-content:flex-start; align-items:center; gap:2px; flex-wrap:wrap; margin:0; padding:0;">
            <span style="display:inline-flex; align-items:center; gap:1px; padding:0 3px; background:${statusInfo.bg}; color:${statusInfo.color}; border-radius:999px; font-size:8px; font-weight:700; border: 1px solid ${statusInfo.color}; line-height:1.2;">${statusInfo.icon} ${statusInfo.text}</span>
          </div>
        </div>
      </div>
    `;
  } else {
    card.style.padding = '3px';
    card.style.cursor = 'pointer';
    const projectTypeIcon = task.projectType === 'COMMERCIAL' ? '🏢' : task.projectType === 'RESIDENTIAL' ? '🏠' : '';
    const projectTypeColor = task.projectType === 'COMMERCIAL' ? 'background:#7DD3FC; color:#fff;' : task.projectType === 'RESIDENTIAL' ? 'background:#6EE7B7; color:#fff;' : '';
    const projectTypeBadge = projectTypeIcon ? `<span style="position:absolute; top:3px; right:3px; font-size:16px; padding:4px 7px; ${projectTypeColor} border-radius:8px; font-weight:800; box-shadow:0 2px 4px rgba(0,0,0,0.3); z-index:1;">${projectTypeIcon}</span>` : '';
    const projectInfo = (task.projectCode || task.projectName) ? `
      <div style="padding: 2px 4px; border-radius: 6px;">
        <div style="display:flex; gap:5px; align-items:flex-start;">
          <span style="font-size:14px; flex-shrink:0;">📦</span>
          <div style="display:flex; flex-direction:column; gap:2px; flex:1; padding-right:40px;">
            <div style="font-weight:800; font-size:12px; line-height:1.2; color: ${textColor}; text-shadow: 1px 1px 2px ${textColor === '#ffffff' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'};">${this.escapeHtml(task.projectCode || 'No Project')} ${task.projectName ? '- ' + this.escapeHtml(task.projectName) : ''}</div>
            ${task.projectPhaseName ? `<div style="font-size:9px; opacity:0.85; color: ${textColor}; text-shadow: 1px 1px 2px ${textColor === '#ffffff' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'};">${this.escapeHtml(task.projectPhaseName)}</div>` : ''}
          </div>
        </div>
      </div>
    ` : '';
    card.innerHTML = `
      ${actionsHtml}
      ${projectTypeBadge}
      <div style="display:flex; flex-direction:column; gap:3px;">
        ${projectInfo}
        <div style="padding: 2px 4px; border-radius: 6px; display:flex; flex-direction:column; gap:3px;">
          <div style="display:flex; gap:4px; align-items:flex-start; font-weight:700;">
            <span>📝</span>
            <div style="font-size:12px; flex:1; line-height:1.2; color: ${textColor}; text-shadow: 1px 1px 2px ${textColor === '#ffffff' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'}; padding-right:40px;">${this.escapeHtml(task.name)}</div>
          </div>
          <div style="display:flex; gap:4px; align-items:flex-start; font-size:10px; opacity:0.9;">
            <span>📂</span>
            <div style="flex:1; line-height:1.2; color: ${textColor}; text-shadow: 1px 1px 2px ${textColor === '#ffffff' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'};">${this.escapeHtml(task.taskCategoryName || '-')}</div>
          </div>
          <div style="display:flex; flex-wrap:wrap; gap:4px; font-size:9px;">
            ${pmName ? `<span style="padding:2px 5px; border-radius:4px; font-weight:600; color: ${textColor}; text-shadow: 1px 1px 2px ${textColor === '#ffffff' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'};">👤 PM: ${this.escapeHtml(pmName)}</span>` : ''}
            ${creatorName ? `<span style="padding:2px 5px; border-radius:4px; font-weight:600; color: ${textColor}; text-shadow: 1px 1px 2px ${textColor === '#ffffff' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'};">✍️ Created by: ${this.escapeHtml(creatorName)}</span>` : ''}
          </div>
          <div style="display:flex; flex-wrap:wrap; gap:3px; align-items:center; margin-top:1px;">
            ${task.personalTask ? `<span style="font-size:10px; padding:2px 5px; border-radius:6px; font-weight:600; color: ${textColor}; text-shadow: 1px 1px 2px ${textColor === '#ffffff' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'};">👤 Personal</span>` : ''}
            <span style="display:inline-flex; align-items:center; gap:3px; padding:2px 6px; background:${statusInfo.bg}; color:${statusInfo.color}; border-radius:999px; font-size:10px; font-weight:700; border: 1px solid ${statusInfo.color};">${statusInfo.icon} ${statusInfo.text}</span>
          </div>
        </div>
      </div>
    `;
  }
  card.addEventListener('mouseenter', () => {
    card.style.transform = 'translateY(-1px)';
    card.style.boxShadow = '0 4px 10px rgba(0,0,0,0.12)';
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = 'translateY(0)';
    card.style.boxShadow = 'none';
  });
  if (!options.skipHandlers) {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      this.showGeneralTaskDetails(task.id, task.name);
    });
  }
  return card;
  }

  private darkenColor(hex: string, percent: number): string {
  // Simple darken for hex colors
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  let r = (num >> 16) - percent;
  let g = ((num >> 8) & 0x00FF) - percent;
  let b = (num & 0x0000FF) - percent;
  r = Math.max(0, r); g = Math.max(0, g); b = Math.max(0, b);
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
  }

  private getContrastColor(hex: string): string {
  // Returns black or white depending on brightness
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  const r = (num >> 16);
  const g = ((num >> 8) & 0x00FF);
  const b = (num & 0x0000FF);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? '#222222' : '#ffffff';
  }

  private escapeHtml(str: string): string {
  return String(str).replace(/[&<>"]/g, function (m) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[m] || m;
  });
  }

  private showGeneralTaskDetails(id: any, name: string) {
  // Aquí deberías abrir el modal de edición o detalles de la tarea
  alert(`Abrir detalles de la tarea: ${name} (ID: ${id})`);
  }

  // Cancel button
  Cerrar() {
    this.close.emit();
  }
}
