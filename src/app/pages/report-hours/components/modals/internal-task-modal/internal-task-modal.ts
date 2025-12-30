import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { InternalTaskService } from '../../../../../pages/report-hours/services/internal-task-category.service';

@Component({
  selector: 'app-internal-task-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './internal-task-modal.html',
  styleUrls: ['./internal-task-modal.scss']
})
export class InternalTaskModal {
  @Input() allInternalTasks: any[] = [];
  @Input() myRole = '';
  @Input() myEmployeeId?: number | string;

  @Output() save = new EventEmitter<any[]>();
  @Output() close = new EventEmitter<void>();

  form: FormGroup;

  constructor(private fb: FormBuilder, private internalTaskService: InternalTaskService) {
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

  private todayStr(): string {
    const t = new Date();
    return t.toISOString().split('T')[0];
  }

  private createEntryGroup(): FormGroup {
    return this.fb.group({
      mainTaskId: ['', Validators.required],
      subTaskId: [''],
      description: [''],
      hours: [null, [Validators.required, Validators.min(0.01)]],
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
        hours: Number(v.hours),
        date: v.date
      };
    });

    // emit array of created entries
    this.save.emit(payload);
      // After emitting saved payload, reset form to a single empty entry so
      // the user can create more reports (but while editing without saving,
      // the data stays intact).
      try {
        this.form.setControl('entries', this.fb.array([this.createEntryGroup()]));
      } catch (e) {}
  }

  // Close when clicking on overlay background
  onOverlayClick(evt: MouseEvent): void {
    const target = evt.target as HTMLElement | null;
    if (target && target.classList && target.classList.contains('modal-overlay')) {
      this.cancel();
    }
  }

  cancel(): void {
    this.close.emit();
  }
}
