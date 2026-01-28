import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { ProjectService } from '../../../../../core/services/project.service';
import { Subject } from 'rxjs';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { XIconComponent } from '../../../../../core/components/animated-icons/x-icon.component';
import { AuthStateService } from '../../../../report-hours/auth/services/auth-state.service';
import { GeneralTaskService } from '../../../services/general-task.service';
import { GeneralTaskStatus } from '../../../models/enums/generalTask-status.enum';

@Component({
  selector: 'app-schedule-task-create-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, XIconComponent, NgIf],
  templateUrl: './schedule-task-create-modal.component.html',
  styleUrls: ['./schedule-task-create-modal.component.scss']
})
export class ScheduleTaskCreateModal implements OnInit, OnChanges {
  @Input() myEmployeeId?: number | string;
  @Input() preset?: any;
  @Input() projects: any[] = [];
  @Input() categories: any[] = [];
  @Input() employees: any[] = [];

  @Output() created = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();

  form: FormGroup;
  isSaving = false;
  phases: any[] = [];
  private destroy$ = new Subject<void>();
  statusList = Object.values(GeneralTaskStatus);

  constructor(private fb: FormBuilder, private generalTaskService: GeneralTaskService, private projectService: ProjectService, private authState: AuthStateService) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      issuedDate: ['', Validators.required],
      endDate: [''],
      projectId: [''],
      projectPhaseId: [''],
      taskCategoryId: ['', Validators.required],
      description: [''],
      status: [GeneralTaskStatus.IN_PROGRESS],
      bimDate: [''],
      descriptionBim: [''],
      descriptionElectrical: [''],
      descriptionMechanical: [''],
      descriptionPlumbing: [''],
      descriptionStructural: ['']
    });

    // load phases when project selection changes
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
    this.applyPresetToForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['preset'] && !changes['preset'].isFirstChange()) {
      this.applyPresetToForm();
    }
  }

  private formatDateValue(val: any): string {
    if (val === null || val === undefined || val === '') return '';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return '';
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch (e) { return '' }
  }

  private applyPresetToForm(): void {
    const today = new Date().toISOString().split('T')[0];
    this.form.patchValue({ issuedDate: today });
    if (this.preset) {
      const p: any = this.preset || {};
      if (p.issuedDate) this.form.patchValue({ issuedDate: this.formatDateValue(p.issuedDate) });
      if (p.endDate) this.form.patchValue({ endDate: this.formatDateValue(p.endDate) });
    }
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

  onClose(): void { this.close.emit(); }

  onCreate(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.value;
    // If category requires end date (OutOfOffice), ensure it's provided
    try {
      if (this.showEndDate() && (!v.endDate || String(v.endDate).trim() === '')) {
        this.form.get('endDate')?.setErrors({ required: true });
        this.form.markAllAsTouched();
        alert('La fecha de fin es requerida para esta categoría');
        return;
      }
    } catch (e) {}
    
    const payload: any = {
      name: v.name,
      description: v.description || null,
      issuedDate: this.formatDateValue(v.issuedDate),
      taskCategoryId: v.taskCategoryId ? (Number.isNaN(Number(v.taskCategoryId)) ? v.taskCategoryId : Number(v.taskCategoryId)) : null,
      projectId: v.projectId ? (Number.isNaN(Number(v.projectId)) ? v.projectId : Number(v.projectId)) : null,
      projectPhaseId: v.projectPhaseId ? (Number.isNaN(Number(v.projectPhaseId)) ? v.projectPhaseId : Number(v.projectPhaseId)) : null,
      // Prefer live auth state employeeId, fallback to parent-provided `myEmployeeId`
      createdByEmployeeId: this.authState?.employeeId ?? this.myEmployeeId ?? null,
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
        this.created.emit(saved);
        this.close.emit();
      },
      error: (err) => {
        console.error('Failed to create task', err);
        try { console.error('Server response body:', err && err.error ? err.error : null); } catch(e) {}
        this.isSaving = false;
        const serverMsg = err && err.error && (err.error.message || err.error.error || err.error.errors) ? (err.error.message || err.error.error || err.error.errors) : err.message || null;
        alert('Failed to create task' + (serverMsg ? (': ' + (typeof serverMsg === 'string' ? serverMsg : JSON.stringify(serverMsg))) : '. See console for details.'));
      }
    });
  }

  showEndDate(): boolean {
    try {
      const catId = this.form.get('taskCategoryId')?.value;
      if (!catId) return false;
      const cat = (this.categories || []).find((c: any) => String(c.id) === String(catId));
      const name = (cat && (cat.name || cat.label || cat.slug || cat.key || cat.code)) ? (cat.name || cat.label || cat.slug || cat.key || cat.code).toString().toLowerCase() : '';
      if (name) return (name.indexOf('out') !== -1 && name.indexOf('office') !== -1) || name === 'outofoffice' || name.indexOf('out_of_office') !== -1 || name.indexOf('out-of-office') !== -1;
      return false;
    } catch (e) {
      return false;
    }
  }
}
