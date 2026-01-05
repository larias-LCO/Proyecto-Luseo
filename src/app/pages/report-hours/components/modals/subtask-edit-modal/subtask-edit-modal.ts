import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SubTaskService } from '../../../../../pages/report-hours/services/sub-task.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { firstValueFrom } from 'rxjs';
import { IconButtonComponent } from '../../../../../core/components/animated-icons/icon-button.component';
import { ArchiveIconComponent } from '../../../../../core/components/animated-icons/archive-icon.component';
import { FileCheckIconComponent } from '../../../../../core/components/animated-icons/file-check-icon.component';

@Component({
  selector: 'app-subtask-edit-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconButtonComponent, ArchiveIconComponent, FileCheckIconComponent, NgIf, NgFor],
  templateUrl: './subtask-edit-modal.html',
  styleUrls: ['./subtask-edit-modal.scss']
})
export class SubtaskEditModal implements OnInit {
  @Input() subtask: any;
  @Input() projects: any[] = [];
  @Input() subTaskCategories: any[] = [];
  @Input() myRole: string | null = null;
  @Input() myEmployeeId?: number | string;

  @Output() close = new EventEmitter<boolean>();

  form: FormGroup;
  canEdit = false;
  canDelete = false;

  constructor(
    private fb: FormBuilder,
    private subTaskService: SubTaskService,
    private notification: NotificationService
  ) {
    this.form = this.fb.group({
      name: [''],
      actualHours: [0, [Validators.required, Validators.min(0.01)]],
      issueDate: ['', Validators.required],
      subTaskCategoryId: ['', Validators.required],
      projectId: [{ value: '', disabled: true }, Validators.required],
      tag: ['']
    });
  }

  ngOnInit(): void {
    if (this.subtask) {
      const dateVal = this.subtask.issueDate || this.subtask.date || this.subtask.start || '';
      const dateStr = this.normalizeDate(dateVal);
      this.form.patchValue({
        name: this.subtask.name || '',
        actualHours: (this.subtask.actualHours !== undefined && this.subtask.actualHours !== null) ? this.subtask.actualHours : 0,
        issueDate: dateStr,
        subTaskCategoryId: this.subtask.subTaskCategoryId || '',
        projectId: this.subtask.projectId || '',
        tag: this.subtask.tag || ''
      });
    }

    const createdById = (this.subtask && (this.subtask.createdByEmployeeId !== undefined)) ? this.subtask.createdByEmployeeId : undefined;
    const isOwn = createdById !== undefined ? Number(createdById) === Number(this.myEmployeeId) : false;
    this.canEdit = (this.myRole === 'OWNER') || Boolean(isOwn);
    this.canDelete = (this.myRole === 'OWNER') || Boolean(isOwn);

    try {
      const editable = ['name', 'actualHours', 'issueDate', 'subTaskCategoryId', 'tag'];
      editable.forEach((k) => {
        const ctrl = this.form.get(k);
        if (!ctrl) return;
        if (this.canEdit) { ctrl.enable({ emitEvent: false }); } else { ctrl.disable({ emitEvent: false }); }
      });
    } catch (e) {}
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

  get filteredCategories(): any[] {
    const cats = this.subTaskCategories || [];
    const manualWlIds = [1,2,3,4];
    const manualWlNames = ['Drafting','Design','Management','Construction Administration'];

    const wlIds = Array.isArray((window as any).SUBTASK_CATEGORY_WHITELIST_IDS) && (window as any).SUBTASK_CATEGORY_WHITELIST_IDS.length > 0
      ? (window as any).SUBTASK_CATEGORY_WHITELIST_IDS.map((x: any) => Number(x))
      : (manualWlIds.length ? manualWlIds.map(x => Number(x)) : null);

    const wlNames = Array.isArray((window as any).SUBTASK_CATEGORY_WHITELIST) && (window as any).SUBTASK_CATEGORY_WHITELIST.length > 0
      ? (window as any).SUBTASK_CATEGORY_WHITELIST.map((x: any) => String(x).toLowerCase())
      : (manualWlNames.length ? manualWlNames.map(x => String(x).toLowerCase()) : null);

    if (typeof this.myRole !== 'undefined' && this.myRole === 'OWNER') return cats;

    if (wlIds) return cats.filter(c => wlIds.includes(Number(c.id)));
    if (wlNames) return cats.filter(c => wlNames.includes(String(c.name || '').toLowerCase()));
    return cats;
  }

  cancel(): void { this.close.emit(false); }

  async saveChanges(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.value;
    const d = new Date(v.issueDate + 'T12:00:00');
    const day = d.getDay();
    if (day === 0 || day === 6) { this.notification.show('Weekends are not allowed.', 'error', 4000); return; }

    const payload: any = {
      id: this.subtask.id,
      name: v.name,
      actualHours: Number(v.actualHours),
      issueDate: v.issueDate,
      subTaskCategoryId: Number(v.subTaskCategoryId),
      projectId: Number(v.projectId),
      tag: v.tag || null,
      createdByEmployeeId: this.subtask.createdByEmployeeId
    };

    try {
      await firstValueFrom(this.subTaskService.edit(payload));
      this.notification.show('Subtask updated', 'success', 3000);
      this.close.emit(true);
    } catch (err: any) {
      console.error('[SubtaskEditModal] update error', err);
      const msg = err && err.error && (err.error.message || err.error) ? (err.error.message || JSON.stringify(err.error)) : (err && err.message) || 'Unknown error';
      this.notification.show(`Failed to update: ${msg}`, 'error', 7000);
    }
  }

  async deleteSubtask(): Promise<void> {
    if (!confirm('Delete this subtask? This cannot be undone.')) return;
    try {
      await firstValueFrom(this.subTaskService.delete(this.subtask.id));
      this.notification.show('Subtask deleted', 'success', 3000);
      this.close.emit(true);
    } catch (err: any) {
      console.error('[SubtaskEditModal] delete error', err);
      const msg = err && err.error && (err.error.message || err.error) ? (err.error.message || JSON.stringify(err.error)) : (err && err.message) || 'Unknown error';
      this.notification.show(`Failed to delete: ${msg}`, 'error', 7000);
    }
  }
}
