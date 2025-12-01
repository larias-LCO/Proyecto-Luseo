

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

  // Cancel button
  Cerrar() {
    this.close.emit();
  }
}