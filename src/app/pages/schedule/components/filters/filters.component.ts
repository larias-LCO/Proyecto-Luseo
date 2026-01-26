import { Component, Input, Output, EventEmitter, OnInit, HostListener } from '@angular/core';
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
export class ScheduleFiltersComponent implements OnInit {
  @Input() projects: Project[] = [];
  @Input() categories: TaskCategory[] = [];
  @Input() initialFilters?: ScheduleFilters;
  @Input() myEmployeeId?: number;

  @Output() filtersChange = new EventEmitter<ScheduleFilters>();

  filters: ScheduleFilters = createDefaultFilters();
  projectDropdownOpen = false;
  selectedCategory: any = '';

  ngOnInit(): void {
    if (this.initialFilters) {
      this.filters = { ...createDefaultFilters(), ...this.initialFilters };
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
}