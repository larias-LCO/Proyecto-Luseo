
import { Component, Input, OnInit } from '@angular/core';
import { EventEmitter, Output } from '@angular/core';
import { CommonModule, NgIf, NgForOf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService, ProjectPayload } from '../../services/project.service';
import { CatalogsService, Employee, Office, Client, Software, JobPosition, Department } from '../../services/catalogs.service';
import { ProjectFiltersService } from '../../services/project-filters.service';
import { Enums, EnumsService } from '../../services/enums.service';
import { XIconComponent } from '../animated-icons/x-icon.component';
import { MasIconComponent } from "../animated-icons/mas-icon.component";
import { TeamIconComponent } from '../animated-icons/team-icon.component';

// Utilidad para cache local de códigos
const cache = { allProjectCodes: new Set<string>() };

@Component({
  selector: 'app-create-project',
  standalone: true,
  imports: [CommonModule, FormsModule, XIconComponent, MasIconComponent, TeamIconComponent],
  templateUrl: './create-project.html',
  styleUrls: ['./create-project.scss']
})
export class CreateProjectComponent implements OnInit {
  showSuccessModal = false;
  // --- Validación de código de proyecto ---
  projectCodeDuplicate: boolean = false;
  loadingProjectCodes: boolean = false;
          @Output() close = new EventEmitter<void>();
        phaseOptions: any[] = [];
        phaseStatusOptions: any[] = [];
      @Input() projectId?: number;
    phaseStartDate: string = '';
    phases: any[] = [];

    async fetchProjectPhases(projectId: number): Promise<any[]> {
      try {
        const phases = await this.projectService.getPhasesByProjectId(projectId);
        this.phases = Array.isArray(phases) ? phases : [];
        this.phaseOptions = this.phases.map(ph => ({ value: ph.id, label: ph.phase }));
        // Phase status options vendrán de enums si existen
        this.phaseStatusOptions = Array.isArray(this.enums.phaseStatuses)
          ? this.enums.phaseStatuses.map((s: any) => ({ value: s, label: s }))
          : [];
        console.log('Fases cargadas:', this.phases);
        console.log('Opciones de phaseOptions:', this.phaseOptions);
        console.log('Opciones de phaseStatusOptions:', this.phaseStatusOptions);
        return this.phases;
      } catch (e) {
        this.phases = [];
        this.phaseOptions = [];
        this.phaseStatusOptions = [];
        console.warn(`Failed to fetch phases for project ${projectId}:`, e);
        return [];
      }
    }

    async loadPhaseStartDate(projectId: number) {
      let phases = [];
      try { phases = await this.fetchProjectPhases(projectId); } catch (e) { phases = []; }
      // pickDefaultPhaseId: elige la fase actual (puedes implementar tu lógica)
      const defPhaseId = phases.length ? phases[0].id : null;
      const currentPhaseObj = (phases || []).find(ph => String(ph.id) === String(defPhaseId));
      this.phaseStartDate = currentPhaseObj && currentPhaseObj.startDate ? currentPhaseObj.startDate : '';
    }
  // Datos del formulario
  project: ProjectPayload & { phaseId?: string | number | null; phaseStatus?: string | null } = {
    projectCode: null,
    name: null,
    projectArea: null,
    areaUnit: null,
    projectType: null,
    notes: null,
    status: null,
    scope: null,
    trackedTime: null,
    realCost: null,
    clientId: null,
    officeId: null,
    softwareId: null,
    employeeIds: [],
    pmIds: [],
    clientName: null,
    officeName: null,
    softwareName: null,
    phaseId: null,
    phaseStatus: null,
  };

  message = '';
  visible = false; // Control de visibilidad del modal
  teamOptions: Employee[] = [];
  pmOptions: Employee[] = [];
  teamFiltered: Employee[] = [];
  pmFiltered: Employee[] = [];
  employeesAll: Employee[] = [];
  offices: Office[] = [];
  clients: Client[] = [];
  software: Software[] = [];
  enums: Enums = { areaUnit: [], type: [], status: [], scope: [] };
  teamSelection: number[] = [];
  pmSelection: number[] = [];
  // filtros UI
  teamQuery = '';
  teamJob = '';
  teamDept = '';
  pmQuery = '';
  jobs: JobPosition[] = [];
  departments: Department[] = [];
  // Team-specific lists (filtered to allowed roles/departments)
  teamJobs: JobPosition[] = [];
  teamDepartments: Department[] = [];

  // Listas base de roles por sección
  private readonly TEAM_ROLE_LIST = ['coordinator', 'designer', 'drafter', 'engineer', 'senior engineer'];
  private readonly PM_ROLE_LIST = ['project manager', 'manager', 'coordinator', 'senior engineer'];
  private pmIdSet: Set<number> = new Set();
  private teamRoleMode = true; // true si filtramos Team por roles; si no, usamos fallback
  private pmRoleMode = true;   // true si filtramos PM por roles; si no, usamos fallback onlyPM

  constructor(
    private projectService: ProjectService,
    private catalogs: CatalogsService,
    private filters: ProjectFiltersService,
    private enumsService: EnumsService
  ) {}


  async ngOnInitAsync() {
    await this.loadPhaseEnums();
    this.loadAllProjectCodes();
  }

  ngOnInit() {
    this.ngOnInitAsync();
  }

  phaseEnums: { names: string[]; statuses: string[] } = { names: [], statuses: [] };
  private phasesByProject: Map<string, any[]> = new Map();

  async loadPhaseEnums() {
    this.phaseEnums = await this.enumsService.loadPhaseEnums();
  }

  pickDefaultPhaseId(phases: any[]): string {
    return this.enumsService.pickDefaultPhaseId(phases);
  }

  async loadAllProjectCodes() {
    this.loadingProjectCodes = true;
    try {
      // Cargar todos los proyectos sin paginación (solo necesitamos projectCode)
      const data = await this.projectService.getProjects({ page: 0, size: 10000, sort: 'projectCode,asc' });
      const allProjects = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
      cache.allProjectCodes.clear();
      allProjects.forEach((p: any) => {
        if (p.projectCode) {
          cache.allProjectCodes.add(p.projectCode.toLowerCase());
        }
      });
      // Opcional: console.log(`✅ Loaded ${cache.allProjectCodes.size} project codes for validation`);
    } catch (e) {
      console.warn('Failed to load all project codes:', e);
    } finally {
      this.loadingProjectCodes = false;
    }

    
  }

  isProjectCodeDuplicate(code: string): boolean {
    if (!code || code.trim() === '') return false;
    const normalizedCode = code.trim().toLowerCase();
    return cache.allProjectCodes.has(normalizedCode);
  }

  onProjectCodeInput() {
    this.projectCodeDuplicate = this.isProjectCodeDuplicate(this.project.projectCode || '');
  }

  async onSubmit() {
    this.onProjectCodeInput();
    if (this.projectCodeDuplicate) {
      this.message = '❌ El código de proyecto ya existe. Usa uno diferente.';
      return;
    }
    this.message = 'Creando proyecto...';
    try {
      const employeeIds = Array.from(new Set([...(this.teamSelection || []), ...(this.pmSelection || [])]));
      const pmIds = [...(this.pmSelection || [])];
      const payload: ProjectPayload = {
        projectCode: this.project.projectCode ?? null,
        name: this.project.name ?? null,
        projectArea: this.project.projectArea != null ? Number(this.project.projectArea) : null,
        areaUnit: this.project.areaUnit ?? null,
        projectType: this.project.projectType ?? null,
        notes: this.project.notes ?? null,
        status: this.project.status ?? null,
        scope: this.project.scope ?? null,
        trackedTime: this.project.trackedTime != null ? Number(this.project.trackedTime) : null,
        realCost: this.project.realCost != null ? Number(this.project.realCost) : null,
        clientId: this.project.clientId != null ? Number(this.project.clientId) : null,
        officeId: this.project.officeId != null ? Number(this.project.officeId) : null,
        softwareId: this.project.softwareId != null ? Number(this.project.softwareId) : null,
        employeeIds,
        pmIds,
        clientName: this.project.clientName ?? null,
        officeName: this.project.officeName ?? null,
        softwareName: this.project.softwareName ?? null
      };
      const created = await this.projectService.createProject(payload);
      // Si el usuario seleccionó una phase, crearla
      try {
        if (this.project.phaseId) {
          const phaseName = this.phaseOptions.find(ph => ph.value === this.project.phaseId)?.label || this.project.phaseId;
          const phaseStatus = this.project.phaseStatus || 'ACTIVE';
          const phaseStartDate = this.phaseStartDate || null;
          const phaseBody = {
            phase: phaseName,
            status: phaseStatus,
            startDate: phaseStartDate,
            endDate: null,
            projectId: created.id
          };
          await this.projectService.createProjectPhase(phaseBody);
        }
      } catch (e) {
        console.warn('Phase creation failed:', e);
      }
      this.message = `✅ Proyecto creado: ${created?.name || created?.projectCode || 'OK'}`;
      window.dispatchEvent(new CustomEvent('project:created', { detail: created }));
      await this.loadAllProjectCodes(); // Refresca el cache después de crear
      this.showSuccessModal = true;
      setTimeout(() => {
        this.showSuccessModal = false;
        this.closeModal();
      }, 1500);
    } catch (err: any) {
      this.message = '❌ Error creando proyecto: ' + err.message;
    }
  }

  displayEnum(v: string | null | undefined): string {
    return String(v ?? '').replace(/_/g, ' ');
  }

  openModal() {
    // Ensure a fresh form each time the modal opens
    this.resetForm();
    this.visible = true;
    void this.loadLookups();
    // Esperar a que los enums de fases estén listos antes de poblar los selects
    (async () => {
      await this.loadPhaseEnums();
      this.phaseOptions = Array.isArray(this.phaseEnums.names)
        ? this.phaseEnums.names
            .slice()
            .sort((a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
            .map((ph: any) => ({ value: ph, label: ph }))
        : [];
      this.phaseStatusOptions = Array.isArray(this.phaseEnums.statuses)
        ? this.phaseEnums.statuses
            .slice()
            .sort((a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
            .map((s: any) => ({ value: s, label: s }))
        : [];
      // Si tienes el projectId, carga las fases y la fecha de inicio
      if (this.projectId) {
        await this.fetchProjectPhases(this.projectId);
        await this.loadPhaseStartDate(this.projectId!);
      }
      // Por defecto, dejar Project Phase en None y limpiar los otros dos
      this.project.phaseId = '';
      this.project.phaseStatus = 'ACTIVE';
      this.phaseStartDate = '';
    })();
    // always refresh people options to get latest state from server
    void this.loadPeopleOptions();
  }

  closeModal() {
    this.visible = false;
    this.close.emit();
  }

  /** Reset the form model and selections so modal opens clean */
  private resetForm(): void {
    this.project = {
      projectCode: null,
      name: null,
      projectArea: null,
      areaUnit: null,
      projectType: null,
      notes: null,
      status: null,
      scope: null,
      trackedTime: null,
      realCost: null,
      clientId: null,
      officeId: null,
      softwareId: null,
      employeeIds: [],
      pmIds: [],
      clientName: null,
      officeName: null,
      softwareName: null
    };
    this.message = '';
    this.teamSelection = [];
    this.pmSelection = [];
    // clear any visual selections in options
    this.teamFiltered = [];
    this.pmFiltered = [];
  }
private async loadPeopleOptions() {
  try {
    const employeesRaw = await this.catalogs.getEmployees();

    // Normalizamos los campos de empleados (roles es string en nuestro modelo)
    this.employeesAll = (employeesRaw as any[])
      .map((e: any) => {
        const id = Number(e.id ?? e.employeeId ?? e.personId ?? e.userId);
        const name = (e.name ?? e.fullName ?? e.displayName ?? [e.firstName, e.lastName].filter(Boolean).join(' ') ?? '').toString();
        const jobTitle = (e.jobTitle ?? e.position ?? e.positionName ?? e.job ?? e.jobName ?? e.jobPosition ?? e.jobPositionName ?? e.role ?? e.roles ?? '-').toString();
        const department = (e.department ?? e.departmentName ?? e.dept ?? e.area ?? e.areaName ?? (e.department && e.department.name) ?? '-').toString();
        const roles = (e.roles ?? e.role ?? '').toString();
        return { id, name, jobTitle, department, roles } as Employee;
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));

    // Guarda lista completa para filtros
    this.filters.setEmployees(this.employeesAll);

    // Opciones PM por roles; si vacío, fallback a heurística onlyPM
    const pmByRoles = this.filters.filterEmployees({ roleList: this.PM_ROLE_LIST });
    this.pmRoleMode = pmByRoles.length > 0;
    this.pmOptions = this.pmRoleMode ? pmByRoles : this.filters.filterEmployees({ onlyPM: true });
    this.pmIdSet = new Set(this.pmOptions.map(p => Number(p.id)));

    // Opciones Team por roles; si vacío, fallback a "todos menos PMs"
    const teamByRoles = this.filters.filterEmployees({ roleList: this.TEAM_ROLE_LIST });
    this.teamRoleMode = teamByRoles.length > 0;
    this.teamOptions = this.teamRoleMode ? teamByRoles : this.employeesAll.filter(e => !this.pmIdSet.has(Number(e.id)));

    // Construye listas de jobs y departments visibles para el filtro Team.
    // teamJobs se limita a los jobs cuyo nombre encaja con TEAM_ROLE_LIST.
    const normalize = (s: string) => (s || '').toString().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const allowedRolesNorm = this.TEAM_ROLE_LIST.map(r => normalize(r));
    // teamJobs: filtra los jobs del catálogo según la lista de roles permitidas
    this.teamJobs = this.jobs.filter(j => {
      const jn = normalize(j.name || (j as any).title || '');
      return allowedRolesNorm.some(ar => jn === ar || jn.includes(ar) || ar.includes(jn));
    });

    // teamDepartments: limita departments a los que aparecen en teamOptions (preserva objetos del catálogo si existen)
    const deptSet = new Set(this.teamOptions.map(e => normalize(e.department || '')));
    this.teamDepartments = this.departments.filter(d => deptSet.has(normalize((d as any).name || (d as any).department || '')));
    // Si no se encontraron departamentos en el catálogo, usar nombres detectados desde teamOptions
    if (!this.teamDepartments.length && deptSet.size) {
      this.teamDepartments = Array.from(deptSet).map(dn => ({ name: dn } as Department));
    }

    // Aplica filtros UI iniciales
    this.applyFilters();
  } catch (e) {
    console.error('Error cargando empleados/PMs:', e);
  }
}



  private async loadLookups() {
    try {
      if (!this.offices.length || !this.clients.length || !this.software.length || !this.jobs.length || !this.departments.length) {
        const [offices, clients, software, jobs, departments] = await Promise.all([
          this.catalogs.getOffices(),
          this.catalogs.getClients(),
          this.catalogs.getSoftware(),
          this.catalogs.getJobs(),
          this.catalogs.getDepartments()
        ]);
        this.offices = offices as Office[];
        this.clients = clients as Client[];
        this.software = software as Software[];
        this.jobs = jobs as JobPosition[];
        this.departments = departments as Department[];
      }
      if (!(this.enums.areaUnit.length && this.enums.type.length && this.enums.status.length && this.enums.scope.length)) {
        this.enums = await this.enumsService.loadEnums();
      }
    } catch (e) {
      console.error('Error cargando catálogos/enums:', e);
    }
  }

  applyFilters() {
    // Team filtering
    const q = (this.teamQuery || '').trim();
    const job = (this.teamJob || '').trim();
    const dept = (this.teamDept || '').trim();
    const teamBase = this.teamRoleMode
      ? this.filters.filterEmployees({ q, job, dept, roleList: this.TEAM_ROLE_LIST })
      : this.filters.filterEmployees({ q, job, dept });
    // Asegura que Team no incluya PMs solo si estamos en modo fallback.
    // Cuando filtramos Team por roles (teamRoleMode === true) debemos permitir solapamiento
    // con PMs para roles que pertenecen a ambos (ej. 'senior engineer', 'coordinator').
    if (this.teamRoleMode) {
      this.teamFiltered = teamBase.slice();
    } else {
      this.teamFiltered = teamBase.filter(e => !this.pmIdSet.has(Number(e.id)));
    }

    // PM filtering (by name only for ahora)
    const pmq = (this.pmQuery || '').trim();
    const pmBase = this.pmRoleMode
      ? this.filters.filterEmployees({ q: pmq, roleList: this.PM_ROLE_LIST })
      : this.filters.filterEmployees({ q: pmq });
    // Asegura que PM solo incluya PMs en cualquier modo
    this.pmFiltered = pmBase.filter(e => this.pmIdSet.has(Number(e.id)));
  }

  // Helpers to display selected employees as chips
  getEmployeeById(id: number) {
    return this.employeesAll.find(e => Number(e.id) === Number(id));
  }

  get teamSelectedEmployees() {
    return (this.teamSelection || []).map(id => this.getEmployeeById(Number(id))).filter(Boolean) as any[];
  }

  get pmSelectedEmployees() {
    return (this.pmSelection || []).map(id => this.getEmployeeById(Number(id))).filter(Boolean) as any[];
  }

  removeFromTeam(id: number) {
    this.teamSelection = (this.teamSelection || []).filter(x => Number(x) !== Number(id));
  }

  removeFromPM(id: number) {
    this.pmSelection = (this.pmSelection || []).filter(x => Number(x) !== Number(id));
  }

  // Toggle selection helpers for click-based selection
  toggleTeam(id: number) {
    const cur = Array.isArray(this.teamSelection) ? [...this.teamSelection.map(Number)] : [];
    const nid = Number(id);
    const idx = cur.findIndex(x => x === nid);
    if (idx >= 0) {
      cur.splice(idx, 1);
    } else {
      cur.push(nid);
    }
    this.teamSelection = cur;
  }

  togglePM(id: number) {
    const cur = Array.isArray(this.pmSelection) ? [...this.pmSelection.map(Number)] : [];
    const nid = Number(id);
    const idx = cur.findIndex(x => x === nid);
    if (idx >= 0) {
      cur.splice(idx, 1);
    } else {
      cur.push(nid);
    }
    this.pmSelection = cur;
  }

  getInitials(name?: string) {
    if (!name) return '';
    return name
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  
}
