import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { SubTaskService } from '../../../../../pages/report-hours/services/sub-task.service';
import { SubTaskCategoryService } from '../../../../../pages/report-hours/services/sub-task-category.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { IconButtonComponent } from '../../../../../core/components/animated-icons/icon-button.component';
import { PlusIconComponent } from '../../../../../core/components/animated-icons/plus-icon.component';
import { ArchiveIconComponent } from '../../../../../core/components/animated-icons/archive-icon.component';
import { FileCheckIconComponent } from '../../../../../core/components/animated-icons/file-check-icon.component';

@Component({
  selector: 'app-subtask-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconButtonComponent, PlusIconComponent, ArchiveIconComponent, FileCheckIconComponent],
  templateUrl: './subtask-modal.html',
  styleUrls: ['./subtask-modal.scss']
})
export class SubtaskModal implements OnInit, OnChanges {
  @Input() projects: any[] = [];
  @Input() subTaskCategories: any[] = [];
  @Input() myRole?: string | null = null;
  @Input() presetProjectId?: number | string;
  @Input() myEmployeeId?: number | string;
  @Output() close = new EventEmitter<boolean>();

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private subTaskService: SubTaskService,
    private subTaskCategoryService: SubTaskCategoryService,
    private notification: NotificationService
  ) {
    this.form = this.fb.group({ entries: this.fb.array([this.createEntryGroup()]) });
  }

  ngOnInit(): void {
    if (!this.subTaskCategories || !this.subTaskCategories.length) {
      try {
        this.subTaskCategoryService.getAll().subscribe({ next: cats => this.subTaskCategories = cats || [], error: () => this.subTaskCategories = [] });
      } catch (e) { this.subTaskCategories = []; }
    }

    // Ensure initial entries respect preset project if provided
    try {
      const pid = (this.presetProjectId === undefined || this.presetProjectId === null) ? undefined : Number(this.presetProjectId);
      if (pid !== undefined) {
        this.form.setControl('entries', this.fb.array([this.createEntryGroup(pid)]));
      }
    } catch (e) {
      console.error('[SubtaskModal] ❌ Error setting preset project:', e);
    }

    try { this.updatePresetProjectLabel(); } catch (e) {}
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['presetProjectId']) {
      try {
        const pid = (this.presetProjectId === undefined || this.presetProjectId === null) ? undefined : Number(this.presetProjectId);
        // Update all existing entry controls to use the new preset (or leave as-is if undefined)
        (this.entries.controls || []).forEach((c: AbstractControl) => {
          try { 
            if (pid !== undefined) { 
              c.get('projectId')?.setValue(pid, { emitEvent: false });
            } 
          } catch (e) {}
        });
        // If there were no entries, create one
        if (!this.entries || this.entries.length === 0) {
          this.form.setControl('entries', this.fb.array([this.createEntryGroup(pid)]));
        }
      } catch (e) {
        console.error('[SubtaskModal] ❌ Error in ngOnChanges:', e);
      }
    }
    if (changes['projects']) {
      try { this.updatePresetProjectLabel(); } catch (e) {}
    }
  }

  presetProjectLabel?: string;

  private updatePresetProjectLabel(): void {
    this.presetProjectLabel = undefined;
    if (this.presetProjectId === undefined || this.presetProjectId === null) return;
    try {
      const pid = Number(this.presetProjectId);
      const found = (this.projects || []).find(p => Number(p.id) === pid);
      if (found) {
        this.presetProjectLabel = `${found.projectCode || 'N/A'} - ${found.name || 'Unknown Project'}`;
      } else {
        console.warn('[SubtaskModal] ⚠️ Project not found in projects array');
      }
    } catch (e) { 
      console.error('[SubtaskModal] ❌ Error updating preset label:', e);
      this.presetProjectLabel = undefined; 
    }
  }

  private createEntryGroup(presetProject?: number): FormGroup {
    return this.fb.group({
      projectId: [presetProject !== undefined ? presetProject : '', Validators.required],
      subTaskCategoryId: ['', Validators.required],
      name: ['', Validators.required],
      actualHours: [null, [Validators.required, Validators.min(0.01)]],
      issueDate: [this.todayStr(), [Validators.required, this.weekdayValidator]],
      tag: ['']
    });
  }

  private todayStr(): string { const t = new Date(); return t.toISOString().split('T')[0]; }

  get entries(): FormArray { return this.form.get('entries') as FormArray; }

  addEntry(): void {
    const pid = (this.presetProjectId === undefined || this.presetProjectId === null) ? undefined : Number(this.presetProjectId);
    const g = this.createEntryGroup(pid);
    this.entries.push(g);
  }
  removeEntry(i: number): void { if (this.entries.length <= 1) return; this.entries.removeAt(i); }

  get filteredCategories(): any[] {
    const cats = this.subTaskCategories || [];
    return cats.filter(c => !this.isCategoryRestricted(c));
  }

  private isCategoryRestricted(cat: any): boolean {
    const manualWlIds = [1,2,3,4];
    const manualWlNames = ['Drafting','Design','Management','Construction Administration'];

    const wlIds = Array.isArray((window as any).SUBTASK_CATEGORY_WHITELIST_IDS) && (window as any).SUBTASK_CATEGORY_WHITELIST_IDS.length > 0
      ? (window as any).SUBTASK_CATEGORY_WHITELIST_IDS.map((x: any) => Number(x))
      : (manualWlIds.length ? manualWlIds.map(x => Number(x)) : null);

    const wlNames = Array.isArray((window as any).SUBTASK_CATEGORY_WHITELIST) && (window as any).SUBTASK_CATEGORY_WHITELIST.length > 0
      ? (window as any).SUBTASK_CATEGORY_WHITELIST.map((x: any) => String(x).toLowerCase())
      : (manualWlNames.length ? manualWlNames.map(x => String(x).toLowerCase()) : null);

    if (typeof this.myRole !== 'undefined' && this.myRole === 'OWNER') return false;

    if (wlIds) return !wlIds.includes(Number(cat.id));
    if (wlNames) return !wlNames.includes(String(cat.name || '').toLowerCase());
    return false;
  }

  weekdayValidator(control: AbstractControl | null) {
    if (!control || !control.value) return null;
    try { const d = new Date(String(control.value) + 'T12:00:00'); const day = d.getDay(); return (day === 0 || day === 6) ? { weekend: true } : null; } catch (e) { return null; }
  }

  saveAll(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const payloads = (this.entries.controls || []).map((c: AbstractControl) => {
      const v = c.value;
      const p: any = {
        name: v.name,
        actualHours: Number(v.actualHours),
        issueDate: v.issueDate,
        subTaskCategoryId: Number(v.subTaskCategoryId),
        projectId: Number(v.projectId),
        tag: v.tag || null
      };
      try { if (this.myEmployeeId !== undefined && this.myEmployeeId !== null && this.myEmployeeId !== '') p.createdByEmployeeId = Number(this.myEmployeeId); } catch (e) {}
      return p;
    });

    import('rxjs').then(rx => {
      const { forkJoin } = rx;
      const calls = payloads.map(p => this.subTaskService.create(p));
      forkJoin(calls).subscribe({
        next: () => { this.notification.show(`Saved ${payloads.length} subtask(s)`, 'success', 4000); this.form.setControl('entries', this.fb.array([this.createEntryGroup()])); this.close.emit(true); },
        error: (err) => { console.error('[SubtaskModal] create error', err); let m = 'Unknown'; try { m = err && err.error ? (err.error.message || JSON.stringify(err.error)) : (err && err.message) || 'Unknown'; } catch (e) {} this.notification.show(`Failed: ${m}`, 'error', 7000); }
      });
    });
  }

  cancel(): void { this.close.emit(false); }
}
