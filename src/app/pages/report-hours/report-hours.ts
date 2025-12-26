import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule, NgIf } from '@angular/common';

import { ProjectService } from './services/projects.service';
import { ChangeDetectorRef } from '@angular/core';
import { Project } from './models/project.model';

import { ProjectCards } from './components/project-cards/project-cards';
import { Filters } from './components/filters/filters';

import { AuthStateService } from './auth/services/auth-state.service';

@Component({
  selector: 'app-report-hours',
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    ProjectCards,
    Filters
  ],
  templateUrl: './report-hours.html',
  styleUrls: ['./report-hours.scss']
})
export class ReportHours implements OnInit, OnDestroy {

  /** Proyectos crudos del backend */
  projects: Project[] = [];

  /** Proyectos ya filtrados (lo que se renderiza) */
  filteredProjects: Project[] = [];

  loadingProjects = false;
  employeeId?: number;
  isAdminOrOwner = false;
  private authSub?: Subscription;

  constructor(
    private projectsService: ProjectService,
    public authState: AuthStateService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadProjects();

    // Initialize employeeId/isAdmin from current auth state (if available)
    this.employeeId = this.authState.employeeId ?? undefined;
    this.isAdminOrOwner = this.authState.role === 'ADMIN' || this.authState.role === 'OWNER';

    // Subscribe to auth state so we can update when session changes
      this.authSub = this.authState.session$.subscribe((me) => {
        this.employeeId = this.authState.employeeId ?? undefined;
        this.isAdminOrOwner = this.authState.role === 'ADMIN' || this.authState.role === 'OWNER';
    });
  }

  /** Carga proyectos */
  private loadProjects(): void {
    this.loadingProjects = true;

    this.projectsService.getAll().subscribe({
      next: projects => {
        this.projects = [...projects].sort(
          (a, b) => a.projectCode.localeCompare(b.projectCode)
        );

        // Inicialmente mostramos todo
        this.filteredProjects = [...this.projects];
        this.loadingProjects = false;
      },
      error: () => {
        this.projects = [];
        this.filteredProjects = [];
        this.loadingProjects = false;
      }
    });
  }

  /** Recibe proyectos ya filtrados desde FiltersComponent */
  onProjectsFiltered(projects: Project[]): void {
    this.filteredProjects = projects;
    // Force change detection in case parent view doesn't update
    try { this.cd.detectChanges(); } catch {}
  }

  onProjectSelected(projectId: number): void {
    this.filteredProjects = this.projects.filter(p => p.id === projectId);
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
  }
}