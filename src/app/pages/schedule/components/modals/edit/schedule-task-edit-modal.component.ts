import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectService } from '../../../../../core/services/project.service';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { XIconComponent } from '../../../../../core/components/animated-icons/x-icon.component';
import { GeneralTaskService } from '../../../services/general-task.service';
import { GeneralTaskStatus } from '../../../models/enums/generalTask-status.enum';

@Component({
  selector: 'app-schedule-task-edit-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, XIconComponent],
  templateUrl: './schedule-task-edit-modal.component.html',
  styleUrls: ['./schedule-task-edit-modal.component.scss']
})
export class ScheduleTaskEditModalComponent implements OnInit, OnChanges {
  @Input() task: any | null = null;
  @Input() myEmployeeId?: number | string;
  @Input() projects: any[] = [];
  @Input() categories: any[] = [];
  @Input() employees: any[] = [];

  @Output() saved = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();

  form: FormGroup;
  isSaving = false;
  isDeleting = false;
  statusList = Object.values(GeneralTaskStatus);
  phases: any[] = [];

  constructor(private fb: FormBuilder, private generalTaskService: GeneralTaskService, private projectService: ProjectService) {
    this.form = this.fb.group({
      id: [null],
      name: ['', Validators.required],
      issuedDate: ['', Validators.required],
      endDate: [''],
      projectId: [''],
      projectPhaseId: [''],
      taskCategoryId: [''],
      createdByEmployeeId: [''],
      description: [''],
      status: [GeneralTaskStatus.IN_PROGRESS],
      bimDate: [''],
      descriptionBim: [''],
      descriptionElectrical: [''],
      descriptionMechanical: [''],
      descriptionPlumbing: [''],
      descriptionStructural: ['']
    });
    this.form.get('projectId')?.valueChanges.subscribe((pid) => {
      if (!pid) {
        this.phases = [];
        this.form.patchValue({ projectPhaseId: '' });
        return;
      }
      this.loadPhases(pid);
    });
  }

  ngOnInit(): void {
    this.applyTaskToForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['task'] && !changes['task'].isFirstChange()) {
      this.applyTaskToForm();
    }
  }

  private formatDateValue(val: any): string {
    if (val === null || val === undefined || val === '') return '';

    // If it's already a simple YYYY-MM-DD string, return as-is (backend accepts this)
    if (typeof val === 'string') {
      const s = val.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      // numeric string: epoch seconds or millis
      if (/^\d+$/.test(s)) {
        try {
          let n = Number(s);
          if (s.length === 10) n = n * 1000;
          const d = new Date(n);
          if (!isNaN(d.getTime())) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
          }
        } catch (e) {}
      }
      // ISO datetime or other string containing 'T' -> take date part
      const tIdx = s.indexOf('T');
      if (tIdx > 0) return s.split('T')[0];
      // fallback: return trimmed string and let backend parse/validate
      return s;
    }

    // Numbers (epoch seconds/millis)
    if (typeof val === 'number') {
      let n = val;
      if (String(val).length === 10) n = n * 1000;
      const d = new Date(n);
      if (isNaN(d.getTime())) return '';
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }

    // Date object
    try {
      if (val instanceof Date) {
        const yyyy = val.getFullYear();
        const mm = String(val.getMonth() + 1).padStart(2, '0');
        const dd = String(val.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
    } catch (e) {}

    return '';
  }

  private applyTaskToForm(): void {
    if (this.task) {
      this.form.patchValue({
        id: this.task.id || null,
        name: this.task.name || '',
        issuedDate: this.formatDateValue(this.task.issuedDate || this.task.start || ''),
        endDate: this.formatDateValue(this.task.endDate || this.task.end || ''),
        projectId: this.task.projectId || '',
        projectPhaseId: this.task.projectPhaseId || '',
        taskCategoryId: this.task.taskCategoryId || '',
        createdByEmployeeId: this.task.createdByEmployeeId || this.task.createByEmployeeId || '',
        description: this.task.description || '',
        status: this.task.status || GeneralTaskStatus.IN_PROGRESS,
        bimDate: this.formatDateValue(this.task.bimDate || this.task.bim_date || ''),
        descriptionBim: this.task.descriptionBim || this.task.description_bim || '',
        descriptionElectrical: this.task.descriptionElectrical || this.task.description_electrical || '',
        descriptionMechanical: this.task.descriptionMechanical || this.task.description_mechanical || '',
        descriptionPlumbing: this.task.descriptionPlumbing || this.task.description_plumbing || '',
        descriptionStructural: this.task.descriptionStructural || this.task.description_structural || ''
      });
      // load phases for current project
      if (this.task.projectId) this.loadPhases(this.task.projectId);
    } else {
      const today = new Date().toISOString().split('T')[0];
      this.form.patchValue({ issuedDate: today });
    }
  }

  onClose(): void { this.close.emit(); }

  onSave(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.value;
    const payload: any = {
      id: this.task && this.task.id ? this.task.id : (v.id || undefined),
      name: v.name,
      description: v.description || null,
      issuedDate: this.formatDateValue(v.issuedDate),
      taskCategoryId: v.taskCategoryId ? (Number.isNaN(Number(v.taskCategoryId)) ? v.taskCategoryId : Number(v.taskCategoryId)) : null,
      projectId: v.projectId ? (Number.isNaN(Number(v.projectId)) ? v.projectId : Number(v.projectId)) : null,
      projectPhaseId: v.projectPhaseId ? (Number.isNaN(Number(v.projectPhaseId)) ? v.projectPhaseId : Number(v.projectPhaseId)) : null,
      createdByEmployeeId: v.createdByEmployeeId || this.task?.createdByEmployeeId || this.myEmployeeId || null,
      status: v.status ?? GeneralTaskStatus.IN_PROGRESS,
      endDate: this.formatDateValue(v.endDate) || null,
      bimDate: this.formatDateValue(v.bimDate) || null,
      descriptionBim: v.descriptionBim || null,
      descriptionElectrical: v.descriptionElectrical || null,
      descriptionMechanical: v.descriptionMechanical || null,
      descriptionPlumbing: v.descriptionPlumbing || null,
      descriptionStructural: v.descriptionStructural || null
    };

    this.isSaving = true;
    this.generalTaskService.saveTask(payload).subscribe({
      next: (saved) => {
        this.isSaving = false;
        this.saved.emit(saved);
        this.close.emit();
      },
      error: (err) => {
        console.error('Failed to save task', err);
        try { console.error('Server response body:', err && err.error ? err.error : null); } catch(e) {}
        this.isSaving = false;
        const serverMsg = err && err.error && (err.error.message || err.error.error || err.error.errors) ? (err.error.message || err.error.error || err.error.errors) : err.message || null;
        alert('Failed to save task' + (serverMsg ? (': ' + (typeof serverMsg === 'string' ? serverMsg : JSON.stringify(serverMsg))) : '. See console for details.'));
      }
    });
  }

  onDelete(): void {
    const id = this.task?.id;
    if (!id) return;
    if (!confirm('Are you sure you want to delete this task?')) return;
    this.isDeleting = true;
    this.generalTaskService.delete(id).subscribe({
      next: () => {
        this.isDeleting = false;
        this.saved.emit({ deletedId: id });
        this.close.emit();
      },
      error: (err) => {
        console.error('Failed to delete task', err);
        try { console.error('Server response body:', err && err.error ? err.error : null); } catch(e) {}
        this.isDeleting = false;
        const serverMsg = err && err.error && (err.error.message || err.error.error || err.error.errors) ? (err.error.message || err.error.error || err.error.errors) : err.message || null;
        alert('Failed to delete task' + (serverMsg ? (': ' + (typeof serverMsg === 'string' ? serverMsg : JSON.stringify(serverMsg))) : '. See console for details.'));
      }
    });
  }

  private async loadPhases(projectId: any) {
    try {
      const id = Number(projectId);
      const phases = await this.projectService.getPhasesByProjectId(id);
      this.phases = Array.isArray(phases) ? phases : [];
    } catch (e) {
      this.phases = [];
    }
  }

  showEndDate(): boolean {
    try {
      const catId = this.form.get('taskCategoryId')?.value || this.task?.taskCategoryId || this.task?.categoryId;
      if (!catId) return false;
      const cat = (this.categories || []).find((c: any) => String(c.id) === String(catId));
      const name = (cat && (cat.name || cat.label || cat.slug || cat.key || cat.code)) ? (cat.name || cat.label || cat.slug || cat.key || cat.code).toString().toLowerCase() : '';
      if (name) return (name.indexOf('out') !== -1 && name.indexOf('office') !== -1) || name === 'outofoffice' || name.indexOf('out_of_office') !== -1 || name.indexOf('out-of-office') !== -1;
      return false;
    } catch (e) {
      return false;
    }
  }

  get createdByName(): string {
    try {
      const id = this.form.get('createdByEmployeeId')?.value || this.task?.createdByEmployeeId || this.task?.createByEmployeeId;
      if (!id) return '';
      const emp = (this.employees || []).find((e: any) => String(e.id) === String(id));
      return emp ? (emp.name || emp.fullName || emp.label || '') : '';
    } catch (e) { return ''; }
  }
}
