import { Component, Input, Output, EventEmitter, OnInit, HostListener, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScheduleFilters, createDefaultFilters } from '../../utils/filters/schedule-filters.model';
import { Project } from '../../services/project.service';
import { TaskCategory } from '../../models/task-category.model';

@Component({
  standalone: true,
  selector: 'schedule-filters',
  imports: [CommonModule, FormsModule, NgIf],
  templateUrl: './filters.component.html',
  styleUrls: ['./filters.component.scss']
})
export class ScheduleFiltersComponent implements OnInit, OnChanges {
  @Input() projects: Project[] = [];
  @Input() categories: TaskCategory[] = [];
  @Input() initialFilters?: ScheduleFilters;
  @Input() myEmployeeId?: number;
  @Input() tasks: any[] = [];

  @Output() filtersChange = new EventEmitter<ScheduleFilters>();

  filters: ScheduleFilters = createDefaultFilters();
  projectDropdownOpen = false;
  categoryDropdownOpen = false;
  selectedCategory: any = '';
  // creators extracted from tasks (only people who have tasks)
  creators: Array<{ id: number; name: string }> = [];
  creatorsDropdownOpen: boolean = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tasks']) {
      this.rebuildCreatorsFromTasks();
    }
    if (changes['initialFilters'] && this.initialFilters) {
      this.filters = { ...createDefaultFilters(), ...this.initialFilters };
      this.filters.createdByEmployeeIds = this.filters.createdByEmployeeIds || [];
    }
  }

  ngOnInit(): void {
    if (this.initialFilters) {
      this.filters = { ...createDefaultFilters(), ...this.initialFilters };
    }
    // build initial creators list
    this.rebuildCreatorsFromTasks();
    // ensure creators array exists
    this.filters.createdByEmployeeIds = this.filters.createdByEmployeeIds || [];
  }

  private rebuildCreatorsFromTasks(): void {
    try {
      const map = new Map<number, string>();
      (this.tasks || []).forEach((t: any) => {
        const id = Number(t.createByEmployeeId ?? t.createdByEmployeeId ?? t.create_by_employee_id ?? t.created_by_employee_id ?? NaN);
        const name = String(t.createByEmployeeName ?? t.createdByEmployeeName ?? t.create_by_employee_name ?? t.created_by_employee_name ?? '').trim();
        if (!isNaN(id) && id > 0) {
          map.set(id, name || `User ${id}`);
        }
      });
      this.creators = Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    } catch (e) {
      this.creators = [];
    }
  }

  updateAndEmit(): void {
    this.filtersChange.emit({ ...this.filters });
  }

  // UI handlers
  onProjectChange(value: any): void {
    const id = Number(value);
    if (!id) return;
    this.toggleProject(id);
  }

  toggleProjectDropdown(event?: Event): void {
    if (event) { event.stopPropagation(); }
    this.projectDropdownOpen = !this.projectDropdownOpen;
  }

  @HostListener('document:click')
  closeDropdown(): void {
    this.projectDropdownOpen = false;
    this.categoryDropdownOpen = false;
    this.creatorsDropdownOpen = false;
  }

  toggleCategoryDropdown(event?: Event): void {
    if (event) { event.stopPropagation(); }
    this.categoryDropdownOpen = !this.categoryDropdownOpen;
  }

  toggleProject(id: number): void {
    if (this.filters.projectIds.includes(id)) {
      this.filters.projectIds = this.filters.projectIds.filter((p: number) => p !== id);
    } else {
      this.filters.projectIds = [...this.filters.projectIds, id];
    }
    this.updateAndEmit();
  }

  onCategoryChange(value: any): void {
    const id = Number(value);
    if (!id) return;
    this.toggleCategory(id);
  }

  toggleMyProjectsOnly(): void {
    this.filters.myProjectsOnly = !this.filters.myProjectsOnly;
    this.updateAndEmit();
  }

  toggleCreatedByMe(): void {
    this.filters.createdByMe = !this.filters.createdByMe;
    this.updateAndEmit();
  }

  toggleCreator(id: number): void {
    if (!this.filters.createdByEmployeeIds) this.filters.createdByEmployeeIds = [];
    if (this.filters.createdByEmployeeIds.includes(id)) {
      this.filters.createdByEmployeeIds = this.filters.createdByEmployeeIds.filter((c: number) => c !== id);
    } else {
      this.filters.createdByEmployeeIds = [...this.filters.createdByEmployeeIds, id];
    }
    this.updateAndEmit();
  }

  toggleCategory(id: number): void {
    if (this.filters.categoryIds.includes(id)) {
      this.filters.categoryIds = this.filters.categoryIds.filter((c: number) => c !== id);
    } else {
      this.filters.categoryIds = [...this.filters.categoryIds, id];
    }
    this.updateAndEmit();
  }

  clearFilters(): void {
    this.filters = createDefaultFilters();
    this.selectedCategory = '';
    this.projectDropdownOpen = false;
    this.updateAndEmit();
  }

  getProjectLabel(id: number): string {
    const p = this.projects.find(pr => pr.id === id);
    return p ? `${p.projectCode} - ${p.name}` : `Project ${id}`;
  }

  getCategoryLabel(id: number): string {
    const c = this.categories.find(cat => cat.id === id);
    return c ? c.name : `Category ${id}`;
  }

  getCreatorLabel(id: number): string {
    const f = this.creators.find(c => c.id === id);
    return f ? f.name : `User ${id}`;
  }
}