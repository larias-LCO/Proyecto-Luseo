import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { InternalTaskService } from '../../../../../pages/report-hours/services/internal-task-category.service';
import { InternalTaskLogService } from '../../../../../pages/report-hours/services/internal-tasks.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { XIconComponent } from '../../../../../core/components/animated-icons/x-icon.component';
import { timeToDecimal, decimalToTime } from '../../../utils/time-conversion.utils';
import { hoursMinutesToDecimal, decimalToHoursMinutes } from '../../../utils/time-conversion.utils';
import { MasIconComponent } from "../../../../../core/components/animated-icons/mas-icon.component";
import { ClockIconComponent } from "../../../../../core/components/animated-icons/clock-icon.component";

@Component({
  selector: 'app-internal-task-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, XIconComponent,  MasIconComponent, ClockIconComponent, MasIconComponent],
  templateUrl: './internal-task-modal.html',
  styleUrls: ['./internal-task-modal.scss']
})
export class InternalTaskModal implements OnInit, OnChanges {
  @Input() allInternalTasks: any[] = [];
  @Input() myRole: string | null = null;
  @Input() myEmployeeId?: number | string;
  @Input() presetEntry?: any;

  @Output() save = new EventEmitter<any[]>();
  // emit object: { changed: boolean, draft?: any[] }
  @Output() close = new EventEmitter<any>();

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private internalTaskService: InternalTaskService,
    private internalTaskLogService: InternalTaskLogService,
    private notification: NotificationService
  ) {
    this.form = this.fb.group({
      entries: this.fb.array([this.createEntryGroup()])
    });
  }

  ngOnInit(): void {
    // If parent didn't provide tasks, load them from service
    if (!this.allInternalTasks || !this.allInternalTasks.length) {
      try {
        this.internalTaskService.getAll().subscribe({
          next: tasks => { this.allInternalTasks = tasks || []; },
          error: () => { this.allInternalTasks = []; }
        });
      } catch (e) {
        this.allInternalTasks = [];
      }
    }
  }

  ngOnChanges(changes: any): void {
    if (changes && changes['presetEntry'] && changes['presetEntry'].currentValue) {
      try {
        const e = changes['presetEntry'].currentValue;
        // support either single-object preset or an array of drafts
        if (Array.isArray(e)) {
          const groups = (e || []).map((it: any) => {
            const g = this.createEntryGroup();
            const hoursValue = it.hours || it.reportHours;
            let h = 0, m = 0;
            if (typeof hoursValue === 'number') {
              const result = decimalToHoursMinutes(hoursValue);
              h = result.hours;
              m = result.minutes;
            } else if (typeof hoursValue === 'object') {
              h = hoursValue.hours || 0;
              m = hoursValue.minutes || 0;
            }
            g.patchValue({
              mainTaskId: it.mainTaskId || it.internalTaskId || '',
              subTaskId: it.subTaskId || '',
              description: it.description || '',
              hours: h,
              minutes: m,
              date: it.date || it.start || this.todayStr()
            }, { emitEvent: false });
            return g;
          });
          this.form.setControl('entries', this.fb.array(groups.length ? groups : [this.createEntryGroup()]));
        } else {
          const g = this.createEntryGroup();
          const hoursValue = e.hours || e.reportHours;
          let h = 0, m = 0;
          if (typeof hoursValue === 'number') {
            const result = decimalToHoursMinutes(hoursValue);
            h = result.hours;
            m = result.minutes;
          } else if (typeof hoursValue === 'object') {
            h = hoursValue.hours || 0;
            m = hoursValue.minutes || 0;
          }
          g.patchValue({
            mainTaskId: e.mainTaskId || e.internalTaskId || '',
            subTaskId: e.subTaskId || '',
            description: e.description || '',
            hours: h,
            minutes: m,
            date: e.date || e.start || this.todayStr()
          }, { emitEvent: false });
          this.form.setControl('entries', this.fb.array([g]));
        }
      } catch (err) { console.error('[InternalTaskModal] ❌ Error applying presetEntry', err); }
    }
  }

  private todayStr(): string {
    const t = new Date();
    return t.toISOString().split('T')[0];
  }

  private createEntryGroup(): FormGroup {
    return this.fb.group({
      mainTaskId: ['', Validators.required],
      subTaskId: [''],
      description: [''],
      hours: [0, [Validators.required, Validators.min(0)]],
      minutes: [0, [Validators.required, Validators.min(0), Validators.max(59)]],
      date: [this.todayStr(), [Validators.required, this.weekdayValidator]]
    });
  }

  get entries(): FormArray {
    return this.form.get('entries') as FormArray;
  }

  addEntry(): void {
    this.entries.push(this.createEntryGroup());
  }

  removeEntry(index: number): void {
    if (this.entries.length <= 1) return;
    this.entries.removeAt(index);
  }

  onMainChange(index: number): void {
    // when main task changes we clear selected subtask so user must pick again
    const grp = this.entries.at(index) as FormGroup;
    grp.patchValue({ subTaskId: '' });
  }

  weekdayValidator(control: AbstractControl | null) {
    if (!control || !control.value) return null;
    try {
      const d = new Date(String(control.value) + 'T12:00:00');
      const day = d.getDay();
      return (day === 0 || day === 6) ? { weekend: true } : null;
    } catch (e) {
      return null;
    }
  }

  getMainTasks(): any[] {
    return (this.allInternalTasks || []).filter(t => !!t.isMainTask);
  }

  getSubtasksFor(mainId: any): any[] {
    if (!mainId) return [];
    const byParent = (this.allInternalTasks || []).filter(t => String((t.parentTaskId || t.parentId) || '') === String(mainId));
    return byParent;
  }

  saveAll(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const payload = (this.entries.controls || []).map((c: AbstractControl) => {
      const v = c.value;
      return {
        mainTaskId: v.mainTaskId,
        subTaskId: v.subTaskId,
        description: v.description,
        hours: hoursMinutesToDecimal(v.hours, v.minutes),
        date: v.date
      };
    });

    // Perform API calls here (modal owns creation logic)
    const calls = payload.map(p => {
      const internalTaskId = p.subTaskId || p.mainTaskId;
      const task = (this.allInternalTasks || []).find((t: any) => String(t.id) === String(internalTaskId));
      const createPayload: any = {
        logDate: p.date,
        reportHours: p.hours,
        description: p.description || '',
        internalTaskId: Number(internalTaskId),
        internalTaskName: task ? task.name : ''
      };
      // Attach creator id when available (backend often requires this)
      try {
        if (this.myEmployeeId !== undefined && this.myEmployeeId !== null && this.myEmployeeId !== '') {
          createPayload.createdByEmployeeId = Number(this.myEmployeeId);
        }
      } catch (e) {}
      try { console.log('[InternalTaskModal] createPayload:', createPayload); } catch (e) {}
      return this.internalTaskLogService.create(createPayload);
    });

    import('rxjs').then(rx => {
      const { forkJoin } = rx;
      forkJoin(calls).subscribe({
        next: () => {
          try { this.notification.show(`Saved ${payload.length} report(s)`, 'success', 4000); } catch (e) {}
          // reset form
          try { this.form.setControl('entries', this.fb.array([this.createEntryGroup()])); } catch (e) {}
          // close modal (parent should refresh entries)
          try { this.close.emit({ changed: true }); } catch (e) {}
        },
        error: (err) => {
          console.error('[InternalTaskModal] Failed to create internal task logs', err);
          try { console.debug('[InternalTaskModal] create error response:', err && err.error ? err.error : err); } catch (e) {}
          let serverMsg = 'Unknown error';
          try {
            if (err && err.error) {
              if (typeof err.error === 'string') {
                serverMsg = err.error;
              } else {
                serverMsg = err.error.message || JSON.stringify(err.error);
              }
            } else if (err && err.message) {
              serverMsg = err.message;
            }
          } catch (e) { serverMsg = 'Unknown error'; }
          try { this.notification.show(`Failed to save: ${serverMsg}`, 'error', 9000); } catch (e) {}
        }
      });
    });
  }

  // Close when clicking on overlay background
  onOverlayClick(evt: MouseEvent): void {
    const target = evt.target as HTMLElement | null;
    if (target && target.classList && (target.classList.contains('modal-overlay') || target.classList.contains('rh-internal-modal-overlay'))) {
      this.cancel();
    }
  }

  cancel(): void {
    // emit current draft so parent can keep it until an actual save occurs
    try {
      const draft = (this.entries.controls || []).map((c: AbstractControl) => {
        const v: any = c.value;
        return {
          mainTaskId: v.mainTaskId,
          subTaskId: v.subTaskId,
          description: v.description,
          hours: v.hours,
          date: v.date
        };
      });
      this.close.emit({ changed: false, draft });
    } catch (e) {
      this.close.emit({ changed: false });
    }
  }
}
