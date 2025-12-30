import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthStateService } from '../../auth/services/auth-state.service';

import { Project } from '../../models/project.model';
import { ReportHoursFilters } from '../../models/filters.model';
import { applyProjectFilters, getAvailableProjectYears } from '../../utils/filters/project-filters.util';

@Component({
  selector: 'app-report-hours-filters',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './filters.html',
  styleUrls: ['./filters.scss']
})
export class Filters implements OnInit, OnChanges {

  @Input() projects: Project[] = [];
  @Input() myEmployeeId?: number;
  @Input() isAdminOrOwner = false;

  @Output() projectsFiltered = new EventEmitter<Project[]>();
  @Output() timeEntryFiltersChanged = new EventEmitter<any>();

  // Initialize filters so OnChanges can safely update `filters.year`
  filters: ReportHoursFilters = {
    year: Number(new Date().getFullYear().toString().slice(2)),
    myProjectsOnly: false,
    onlyMyReports: false
  };
  availableYears: number[] = [];

  @Input() employees: { id: number; name: string }[] = [];

  ngOnInit(): void {
    // initialize filters; actual availableYears may arrive later via @Input
    const currentYear = Number(new Date().getFullYear().toString().slice(2));

    this.filters = {
      year: currentYear,
      myProjectsOnly: false,
      onlyMyReports: false
    };
  }

  ngOnChanges(changes: SimpleChanges): void {
    // When projects change, recalc available years and set default year
    if (changes['projects']) {
      this.availableYears = getAvailableProjectYears(this.projects || []);

      const currentYear = Number(new Date().getFullYear().toString().slice(2));

      if (this.availableYears.length > 0) {
        this.filters.year = this.availableYears.includes(currentYear)
          ? currentYear
          : this.availableYears[0];
      } else {
        this.filters.year = currentYear;
      }

      this.applyFilters();
    }

    // If the current user id changes (login/logout), re-apply filters so "Mis proyectos" updates
    if (changes['myEmployeeId']) {
      this.applyFilters();
    }
  }

  constructor() {
    // Filters receives `myEmployeeId` and `isAdmin` via @Input from parent
  }

  applyFilters(): void {
    const result = applyProjectFilters(
      this.projects,
      this.filters,
      this.myEmployeeId
    );

    this.projectsFiltered.emit(result);

    // Emit time entry filters so parent/services can consume them.
    // Date ranges are handled by the calendar; do not include them here.
    this.timeEntryFiltersChanged.emit({ ...this.filters });
  }

  /**
   * Reset only year and searchText to defaults (do NOT change myProjectsOnly)
   */
  resetFilters(): void {
    const currentYear = Number(new Date().getFullYear().toString().slice(2));

    // reset search text
    (this.filters as any).searchText = '';
    // Do not reset calendar date ranges here (calendar manages them)

    (this.filters as any).selectedEmployeeId = undefined;
    // reset year to current if available, otherwise first available or current
    if (this.availableYears && this.availableYears.length > 0) {
      this.filters.year = this.availableYears.includes(currentYear)
        ? currentYear
        : this.availableYears[0];
    } else {
      this.filters.year = currentYear;
    }

    this.applyFilters();
  }
}