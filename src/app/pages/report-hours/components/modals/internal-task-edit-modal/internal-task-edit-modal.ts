import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InternalTaskLogService } from '../../../../../pages/report-hours/services/internal-tasks.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { firstValueFrom } from 'rxjs';
import { IconButtonComponent } from '../../../../../core/components/animated-icons/icon-button.component';
import { ArchiveIconComponent } from '../../../../../core/components/animated-icons/archive-icon.component';
import { FileCheckIconComponent } from '../../../../../core/components/animated-icons/file-check-icon.component';

@Component({
  selector: 'app-internal-task-edit-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconButtonComponent, ArchiveIconComponent, FileCheckIconComponent],
  templateUrl: './internal-task-edit-modal.html',
  styleUrls: ['./internal-task-edit-modal.scss']
})
export class InternalTaskEditModal implements OnInit {
  @Input() log: any;
  @Input() allInternalTasks: any[] = [];
  @Input() myRole: string | null = null;
  @Input() myEmployeeId?: number | string;

  // emit boolean: true => item updated/deleted, false => closed without changes
  @Output() close = new EventEmitter<boolean>();

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private internalTaskLogService: InternalTaskLogService,
    private notification: NotificationService
  ) {
    this.form = this.fb.group({
      description: [''],
      reportHours: [0, [Validators.required, Validators.min(0.01)]],
      logDate: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    if (this.log) {
      // handle either InternalTaskLog shape or TimeEntry shape
      const dateVal = this.log.logDate || this.log.date || this.log.start || this.log.logDateString || '';
      const hoursVal = (this.log.reportHours !== undefined && this.log.reportHours !== null) ? this.log.reportHours : (this.log.hours !== undefined ? this.log.hours : 0);
      const descVal = this.log.description || this.log.title || '';
      const dateStr = this.normalizeDate(dateVal);
      this.form.patchValue({
        description: descVal,
        reportHours: hoursVal,
        logDate: dateStr
      });
    }
    // compute display category for the modal
    try {
      if (this.log && this.log.type === 'INTERNAL_TASK') {
        const internalId = this.log.internalTaskId || this.log.internalTaskId || this.log.idInternalTask || undefined;
        let t: any = undefined;
        if (internalId !== undefined && this.allInternalTasks && this.allInternalTasks.length) {
          t = (this.allInternalTasks || []).find((i: any) => String(i.id) === String(internalId));
        }
        // prefer explicit internalTaskName from log, otherwise resolved task name, otherwise fallback
        this.displayCategory = this.log.internalTaskName || (t ? t.name : '') || '';
      } else {
        // for subtasks or other entries prefer categoryName or title
        this.displayCategory = this.log && (this.log.categoryName || this.log.title || this.log.internalTaskName) ? (this.log.categoryName || this.log.title || this.log.internalTaskName) : '';
      }
    } catch (e) { this.displayCategory = this.log && (this.log.internalTaskName || this.log.categoryName || this.log.title) || ''; }
    // compute permissions - support both shapes
    const createdById = (this.log && (this.log.createdByEmployeeId !== undefined)) ? this.log.createdByEmployeeId : (this.log && (this.log.userId !== undefined) ? this.log.userId : undefined);
    const isOwn = createdById !== undefined ? Number(createdById) === Number(this.myEmployeeId) : false;
    this.canEdit = (this.myRole === 'OWNER') || Boolean(isOwn);
    this.canDelete = (this.myRole === 'OWNER') || Boolean(isOwn);

    // Enable/disable reactive form controls instead of using `[disabled]` in template
    try {
      if (this.canEdit) {
        this.form.enable({ emitEvent: false });
      } else {
        this.form.disable({ emitEvent: false });
      }
    } catch (e) {}
  }

  canEdit = false;
  canDelete = false;

  displayCategory = '';

  private normalizeDate(d: any): string {
    if (!d) return '';
    if (typeof d === 'string') return String(d).split('T')[0];
    const dt = new Date(d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  cancel(): void { this.close.emit(false); }

  async saveChanges(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value;
    // weekend validation
    const d = new Date(v.logDate + 'T12:00:00');
    const day = d.getDay();
    if (day === 0 || day === 6) {
      this.notification.show('Weekends are not allowed. Choose a weekday.', 'error', 5000);
      return;
    }

    const payload: any = {
      logDate: v.logDate,
      reportHours: Number(v.reportHours),
      description: v.description || ''
    };

    try {
      await firstValueFrom(this.internalTaskLogService.update(this.log.id, payload));
      this.notification.show('Internal task updated', 'success', 3000);
      this.close.emit(true);
    } catch (err: any) {
      console.error('[InternalTaskEditModal] update error', err);
      const msg = err && err.error && (err.error.message || err.error) ? (err.error.message || JSON.stringify(err.error)) : (err && err.message) || 'Unknown error';
      this.notification.show(`Failed to update: ${msg}`, 'error', 7000);
    }
  }

  async deleteLog(): Promise<void> {
    if (!confirm('Delete this internal task log? This cannot be undone.')) return;
    try {
      await firstValueFrom(this.internalTaskLogService.delete(this.log.id));
      this.notification.show('Internal task deleted', 'success', 3000);
      this.close.emit(true);
    } catch (err: any) {
      console.error('[InternalTaskEditModal] delete error', err);
      const msg = err && err.error && (err.error.message || err.error) ? (err.error.message || JSON.stringify(err.error)) : (err && err.message) || 'Unknown error';
      this.notification.show(`Failed to delete: ${msg}`, 'error', 7000);
    }
  }
}
