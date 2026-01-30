import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { XIconComponent } from '../../../../core/components/animated-icons/x-icon.component';
import { GeneralTaskService } from '../../services/general-task.service';
import { GeneralTaskStatus } from '../../models/enums/generalTask-status.enum';

@Component({
  selector: 'app-schedule-task-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, XIconComponent, NgIf],
  templateUrl: './schedule-task-modal.html',
  styleUrls: ['./schedule-task-modal.scss']
})
export class ScheduleTaskModal implements OnInit {
  @Input() task: any | null = null; // existing task for edit, null for create
  @Input() myEmployeeId?: number | string;
  @Input() myRole?: string | null;
  @Input() projects: any[] = [];
  @Input() categories: any[] = [];
  @Input() employees: any[] = []; // optional global employees model (from report-hours/cache)

  @Output() save = new EventEmitter<any>();
  @Output() delete = new EventEmitter<number>();
  @Output() close = new EventEmitter<void>();

  form: FormGroup;
  canEdit = false;
  // assignedEmployees holds objects so we can render name + jobPosition + department
  assignedEmployees: Array<{ id?: any; name: string; jobPositionName?: string; departmentName?: string }> = [];
  isSaving = false;

  get isEditMode(): boolean {
    return !!(this.task && (this.task.id !== undefined && this.task.id !== null));
  }

  constructor(private fb: FormBuilder, private generalTaskService: GeneralTaskService) {
    // Form controls: DB fields (editable with permissions) + visual-only fields (always readonly)
    this.form = this.fb.group({
      name: ['', Validators.required],
      issuedDate: [''],
      endDate: [''],
      projectId: [''],
      categoryId: [''],
      description: [''],
      // BIM / discipline-specific fields (stored in DB)
      bimDate: [''],
      description_bim: [''],
      description_electrical: [''],
      description_mechanical: [''],
      description_plumbing: [''],
      description_structural: [''],
      status: [GeneralTaskStatus.IN_PROGRESS],
      // visual-only metadata (read-only display)
      projectName: [''],
      taskCategoryName: [''],
      projectCode: [''],
      projectManagerName: [''],
      projectPhaseName: [''],
      createByEmployeeName: [''],
      createByEmployeeId: ['']
    });
  }

  ngOnInit(): void {
    if (this.task) {
      this.form.patchValue({
        name: this.task.name || '',
        issuedDate: this.normalizeDate(this.task.issuedDate || this.task.start),
        endDate: this.normalizeDate(this.task.endDate || this.task.end),
        projectId: this.task.projectId || '',
        categoryId: this.task.taskCategoryId || '',
        description: this.task.description || '',
        bimDate: this.normalizeDate(this.task.bim_date || this.task.bimDate || this.task.BimDate),
        description_bim: this.task.description_bim || '',
        description_electrical: this.task.description_electrical || '',
        description_mechanical: this.task.description_mechanical || '',
        description_plumbing: this.task.description_plumbing || '',
        description_structural: this.task.description_structural || '',
        status: this.task.status || GeneralTaskStatus.IN_PROGRESS,
        
        // visual-only
        projectName: this.task.projectName || '',
        taskCategoryName: this.task.taskCategoryName || '',
        projectCode: this.task.projectCode || '',
        projectManagerName: this.task.projectManagerName || '',
        projectPhaseName: this.task.projectPhaseName || '',
        createByEmployeeName: this.task.createByEmployeeName || '',
        createByEmployeeId: this.task.createByEmployeeId || ''
      });

      // populate assigned employees from provided projects list
      this.updateAssignedEmployees(this.form.get('projectId')?.value);

      // watch for projectId changes to update assigned list dynamically
      this.form.get('projectId')?.valueChanges.subscribe((val) => this.updateAssignedEmployees(val));

      // permission: creator or admin/owner
      const createdBy = this.task.createdByEmployeeId || this.task.createdById || this.task.employeeId;
      const isOwner = this.myRole === 'OWNER' || this.myRole === 'ADMIN';
      this.canEdit = isOwner || (createdBy !== undefined && Number(createdBy) === Number(this.myEmployeeId));
      if (!this.canEdit) this.form.disable({ emitEvent: false });
    } else {
      // create mode: allow by default
      this.canEdit = true;
      const today = new Date();
      const iso = today.toISOString().split('T')[0];
      this.form.patchValue({ issuedDate: iso });
    }
  }

  get isOutOfOfficeSelected(): boolean {
    const catId = this.form.get('categoryId')?.value;
    if (!catId) return false;
    const cat = this.categories?.find(c => String(c.id) === String(catId));
    if (!cat) return false;
    const name = (cat.name || '').toString().toLowerCase();
    if (name.includes('out') && name.includes('office')) return true;
    // also accept common variants
    if (name === 'outofoffice' || name === 'out_of_office' || name === 'out of office') return true;
    return false;
  }

  private normalizeDate(d: any): string {
    if (!d) return '';
    if (typeof d === 'string') return String(d).split('T')[0];
    const dt = new Date(d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private updateAssignedEmployees(projectId: any): void {
    this.assignedEmployees = [];
    if (!projectId) return;
    const pid = String(projectId);
    const proj = this.projects?.find(p => String(p.id) === pid);
    if (!proj) return;

    // 1) If project provides employee objects, use them
    if (Array.isArray(proj.employees) && proj.employees.length) {
      this.assignedEmployees = proj.employees.map((e: any) => ({
        id: e.id,
        name: e.name || '',
        jobPositionName: e.jobPositionName || e.jobPosition || '',
        departmentName: e.departmentName || e.department || ''
      }));
      // filter out PMs by id or name
      if (Array.isArray(proj.pmIds) && proj.pmIds.length) {
        const pmIdSet = new Set((proj.pmIds || []).map((id: any) => String(id)));
        this.assignedEmployees = this.assignedEmployees.filter((e: any) => !pmIdSet.has(String(e.id)));
      } else if (Array.isArray(proj.pmNames) && proj.pmNames.length) {
        const pmSet = new Set((proj.pmNames || []).map((n: any) => String(n)));
        this.assignedEmployees = this.assignedEmployees.filter((e: any) => !pmSet.has(String(e.name)));
      }
    }

    // 2) If not, but we have employeeIds and a global employees list, map ids -> employees
    if (!this.assignedEmployees.length && Array.isArray(proj.employeeIds) && proj.employeeIds.length) {
      const global = Array.isArray(this.employees) ? this.employees : [];
      this.assignedEmployees = proj.employeeIds.map((id: any) => {
        const found = global.find((g: any) => String(g.id) === String(id));
        if (found) return { id: found.id, name: found.name || '', jobPositionName: found.jobPositionName || found.jobPosition || '', departmentName: found.departmentName || found.department || '' };
        return { id, name: String(id), jobPositionName: '', departmentName: '' };
      });
      if (Array.isArray(proj.pmIds) && proj.pmIds.length) {
        const pmIdSet = new Set((proj.pmIds || []).map((id: any) => String(id)));
        this.assignedEmployees = this.assignedEmployees.filter((e: any) => !pmIdSet.has(String(e.id)));
      }
    }

    // 3) fallback to simple names if provided
    if (!this.assignedEmployees.length && Array.isArray(proj.employeeNames) && proj.employeeNames.length) {
      this.assignedEmployees = proj.employeeNames.map((n: any) => ({ name: String(n), jobPositionName: '', departmentName: '' }));
      if (Array.isArray(proj.pmNames) && proj.pmNames.length) {
        const pmSet = new Set((proj.pmNames || []).map((n: any) => String(n)));
        this.assignedEmployees = this.assignedEmployees.filter(e => !pmSet.has(String(e.name)));
      }
    }

    // also patch a readonly form field for display if needed
    this.form.patchValue({ projectName: proj.name || this.form.get('projectName')?.value });
  }

  onClose(): void { this.close.emit(); }

  onSave(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    // use getRawValue() to include disabled controls (in case form is readonly)
    const v = this.form.getRawValue();
    const start = v.issuedDate || this.form.get('issuedDate')?.value || new Date().toISOString().split('T')[0];
    const payload: any = {
      id: this.task && this.task.id ? this.task.id : undefined,
      name: v.name,
      description: v.description || null,
      issuedDate: start,
      taskCategoryId: v.categoryId || null,
      projectId: v.projectId || null,
      projectPhaseId: v['projectPhaseId'] || null,
      createByEmployeeId: v['createByEmployeeId'] || this.myEmployeeId || null,
      status: v.status || null,
      endDate: v.endDate || null,
      bimDate: v.bimDate || null,
      description_bim: v.description_bim || null,
      description_electrical: v.description_electrical || null,
      description_mechanical: v.description_mechanical || null,
      description_plumbing: v.description_plumbing || null,
      description_structural: v.description_structural || null
    };

    // call service to save (create or update)
    console.log('Saving GeneralTask payload:', payload);
    this.isSaving = true;
    this.generalTaskService.saveTask(payload).subscribe({
      next: (saved) => {
        console.log('Save successful', saved);
        this.isSaving = false;
        this.save.emit(saved);
        this.close.emit();
      },
      error: (err) => {
        console.error('Failed to save task', err);
        this.isSaving = false;
        alert('Failed to save task. See console for details.');
      }
    });
  }

  onDelete(): void {
    if (!this.task || !this.task.id) return;
    if (!confirm('Delete this task? This cannot be undone.')) return;
    this.generalTaskService.delete(this.task.id).subscribe({
      next: () => {
        this.delete.emit(this.task.id);
        this.close.emit();
      },
      error: (err) => {
        console.error('Failed to delete task', err);
        alert('Failed to delete task. See console for details.');
      }
    });
  }
}
