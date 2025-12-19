

  
import { Component, Inject, OnInit } from '@angular/core';
import { EnumsService } from '../../services/enums.service';
import { Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CatalogsService } from '../..//services/catalogs.service';
import { ProjectFiltersService } from '../../services/project-filters.service';
import { ProjectService } from '../../services/project.service';
import { Project } from '../../components/project-details/project.model';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';


@Component({
  selector: 'app-edit-project',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatSelectModule, MatChipsModule, MatFormFieldModule, MatCheckboxModule],
  templateUrl: './edit-project.html',
  styleUrls: ['./edit-project.scss']
})
export class EditProjectComponent implements OnInit {
@Output() projectUpdated = new EventEmitter<void>();
  
  form!: FormGroup;

  // The project being edited (normalized from MAT_DIALOG_DATA)
  project!: Project | any;

  // Controla la visibilidad de los campos de phase
  showPhaseStatus = false;
  showPhaseStart = false;
  showPhaseEnd = false;

  // Data from backend
  offices: any[] = [];
  clients: any[] = [];
  software: any[] = [];
  employees: any[] = [];
  message = '';

  // Team/PM selection helpers
  employeesAll: any[] = [];
  teamFiltered: any[] = [];
  pmFiltered: any[] = [];
  teamSelection: number[] = [];
  pmSelection: number[] = [];
  teamQuery = '';
  teamJob = '';
  teamDept = '';
  pmQuery = '';
  jobs: any[] = [];
  departments: any[] = [];
  teamJobs: any[] = [];
  teamDepartments: any[] = [];
  private readonly TEAM_ROLE_LIST = ['coordinator', 'designer', 'drafter', 'engineer', 'senior engineer'];
  private readonly PM_ROLE_LIST = ['project manager', 'manager', 'coordinator', 'senior engineer'];
  private pmIdSet: Set<number> = new Set();
  private teamRoleMode = true;
  private pmRoleMode = true;

  constructor(
    private fb: FormBuilder,
    private catalogs: CatalogsService,
    private projectService: ProjectService,
    private dialogRef: MatDialogRef<EditProjectComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private filtersService: ProjectFiltersService,
    @Inject(EnumsService) private enumsService: EnumsService
  ) {}

  // PHASES (copiado/adaptado de create-project)
  phaseGroups: { label: string, options: { value: string, label: string }[] }[] = [];
  phaseStatusOptions: any[] = [];
  phaseStartDate: string = '';
  phases: any[] = [];
  phaseEnums: { names: string[]; statuses: string[] } = { names: [], statuses: [] };
  private phasesByProject: Map<string, any[]> = new Map();

  async fetchProjectPhases(projectId: number): Promise<any[]> {
    try {
      const phases = await this.projectService.getPhasesByProjectId(projectId);
      this.phases = Array.isArray(phases) ? phases : [];
      this.updatePhaseGroups();
      console.log('Fases cargadas:', this.phases);
      console.log('Opciones de phaseGroups:', this.phaseGroups);
      console.log('Opciones de phaseStatusOptions:', this.phaseStatusOptions);
      return this.phases;
    } catch (e) {
      this.phases = [];
      this.updatePhaseGroups();
      console.warn(`Failed to fetch phases for project ${projectId}:`, e);
      return [];
    }
  }

  updatePhaseGroups() {
    // Grupo de fases existentes
    const existing = (this.phases || []).map(ph => ({
      value: `existing:${ph.id}`,
      label: `${String(ph.phase || '').replace(/_/g, ' ')} (${String(ph.status || '').replace(/_/g, ' ')}) - ${ph.startDate ? String(ph.startDate).slice(0,10) : 'N/A'}`
    }));
    // Grupo de nuevas fases
    const newPhases = Array.isArray(this.phaseEnums.names)
      ? this.phaseEnums.names.slice().sort((a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
        .map(n => ({ value: `new:${n}`, label: `+ New: ${String(n).replace(/_/g, ' ')}` }))
      : [];
    this.phaseGroups = [];
    this.phaseGroups.push({ label: 'Existing Phases (edit)', options: existing });
    this.phaseGroups.push({ label: 'Add New Phase', options: newPhases });
  }
  

  async loadPhaseStartDate(projectId: number) {
    let phases = [];
    try { phases = await this.fetchProjectPhases(projectId); } catch (e) { phases = []; }
    const defPhaseId = phases.length ? phases[0].id : null;
    const currentPhaseObj = (phases || []).find(ph => String(ph.id) === String(defPhaseId));
    this.phaseStartDate = currentPhaseObj && currentPhaseObj.startDate ? currentPhaseObj.startDate : '';
  }

  async loadPhaseEnums() {
    this.phaseEnums = await this.enumsService.loadPhaseEnums();
  }

  pickDefaultPhaseId(phases: any[]): string {
    return this.enumsService.pickDefaultPhaseId(phases);
  }

  onPhaseChange() {
    const val = this.form.get('phaseId')?.value;
    this.showPhaseStatus = false;
    this.showPhaseStart = false;
    this.showPhaseEnd = false;
    if (!val) {
      // Nada seleccionado
      this.form.patchValue({ phaseStatus: '', phaseStartDate: '', phaseEndDate: '' });
      return;
    }
    if (val.startsWith('existing:')) {
      // Editar fase existente
      const phaseId = val.split(':')[1];
      const phase = (this.phases || []).find(p => String(p.id) === phaseId);
      if (phase) {
        this.showPhaseStatus = true;
        this.showPhaseStart = true;
        this.showPhaseEnd = true;
        this.form.patchValue({
          phaseStatus: phase.status || 'ACTIVE',
          phaseStartDate: phase.startDate ? String(phase.startDate).slice(0,10) : '',
          phaseEndDate: phase.endDate ? String(phase.endDate).slice(0,10) : ''
        });
      }
    } else if (val.startsWith('new:')) {
      // Crear nueva fase
      this.showPhaseStatus = true;
      this.showPhaseStart = true;
      this.showPhaseEnd = false;
      this.form.patchValue({
        phaseStatus: 'ACTIVE',
        phaseStartDate: '',
        phaseEndDate: ''
      });
    }
  }

  ngOnInit(): void {
    // PHASES INIT
    (async () => {
      await this.loadPhaseEnums();
      // Siempre poblar las opciones desde enums
      this.updatePhaseGroups();
      this.phaseStatusOptions = Array.isArray(this.phaseEnums.statuses)
        ? this.phaseEnums.statuses.slice().sort((a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' })).map((s: any) => ({ value: s, label: s }))
        : [];
      if (this.project && this.project.id) {
        await this.fetchProjectPhases(this.project.id);
        await this.loadPhaseStartDate(this.project.id);
      }
      // Inicializar los valores del form si existen en el proyecto
      if (this.project && this.form) {
        this.form.patchValue({
          phaseId: this.project.phaseId || '',
          phaseStatus: this.project.phaseStatus || '',
          phaseStartDate: this.project.phaseStartDate || '',
          phaseEndDate: this.project.phaseEndDate || ''
        });
      }
      // Suscribirse a cambios del select de fase
      this.form.get('phaseId')?.valueChanges.subscribe(() => this.onPhaseChange());
    })();


  // Normalize incoming dialog data: some callers pass { project: {...} }
  this.project = (this.data && this.data.project) ? this.data.project : this.data;

    // 1️⃣ Build the form
    this.form = this.fb.group({
      projectCode: [''],
      name: [''],
      projectArea: [''],
      areaUnit: [''],
      projectType: [''],
      status: [''],
      scope: [''],
      estimatedCost: [''],
      trackedTime: [''],
      officeId: [''],
      clientId: [''],
      softwareId: [''],
      // legacy/template-friendly controls (the template binds to names)
      officeName: [''],
      clientName: [''],
      softwareName: [''],
      notes: [''],
      pmIds: [[]],
      employeeIds: [[]],
      phaseId: [''],
      phaseStatus: [''],
    });

    // 2️⃣ Patch form immediately with any provided project fields (so textarea shows notes
    //    even if catalogs fail to load). We'll also reload catalogs and patch again to fill IDs.
    this.patchForm();
    this.loadBackendCatalogs();
    // Ensure people/options are loaded and selections reflect current project
    void this.loadPeopleOptions();
  }

  // ------------------ Team / PM helpers (adapted from create-project) ------------------
  private async loadPeopleOptions() {
    try {
      const employeesRaw = await this.catalogs.getEmployees();

      this.employeesAll = (employeesRaw as any[])
        .map((e: any) => {
          const id = Number(e.id ?? e.employeeId ?? e.personId ?? e.userId);
          const name = (e.name ?? e.fullName ?? e.displayName ?? [e.firstName, e.lastName].filter(Boolean).join(' ') ?? '').toString();
          const jobTitle = (e.jobTitle ?? e.position ?? e.positionName ?? e.job ?? e.jobName ?? e.jobPosition ?? e.jobPositionName ?? e.role ?? e.roles ?? '-').toString();
          const department = (e.department ?? e.departmentName ?? e.dept ?? e.area ?? e.areaName ?? (e.department && e.department.name) ?? '-').toString();
          const roles = (e.roles ?? e.role ?? '').toString();
          return { id, name, jobTitle, department, roles } as any;
        })
        .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));

      this.filtersService.setEmployees(this.employeesAll);

      const pmByRoles = this.filtersService.filterEmployees({ roleList: this.PM_ROLE_LIST });
      this.pmRoleMode = pmByRoles.length > 0;
      const pmOptions = this.pmRoleMode ? pmByRoles : this.filtersService.filterEmployees({ onlyPM: true });
      this.pmIdSet = new Set(pmOptions.map((p: any) => Number(p.id)));

      const teamByRoles = this.filtersService.filterEmployees({ roleList: this.TEAM_ROLE_LIST });
      this.teamRoleMode = teamByRoles.length > 0;
      const teamOptions = this.teamRoleMode ? teamByRoles : this.employeesAll.filter(e => !this.pmIdSet.has(Number(e.id)));

      const jobSet = new Set(this.employeesAll.map(e => (e.jobTitle || '').toString()).filter(Boolean));
      this.jobs = Array.from(jobSet).map(j => ({ name: j }));
      const deptSet = new Set(this.employeesAll.map(e => (e.department || '').toString()).filter(Boolean));
      this.departments = Array.from(deptSet).map(d => ({ name: d }));

      this.teamJobs = this.jobs.slice();
      this.teamDepartments = this.departments.slice();

      this.applyFilters();

      const v = this.form.value || {};
      this.teamSelection = Array.isArray(v.employeeIds) ? v.employeeIds.map(Number) : [];
      this.pmSelection = Array.isArray(v.pmIds) ? v.pmIds.map(Number) : [];
    } catch (e) {
      console.error('Error cargando empleados/PMs en edit modal:', e);
    }
  }

  applyFilters() {
    const q = (this.teamQuery || '').trim();
    const job = (this.teamJob || '').trim();
    const dept = (this.teamDept || '').trim();
    const teamBase = this.teamRoleMode
      ? this.filtersService.filterEmployees({ q, job, dept, roleList: this.TEAM_ROLE_LIST })
      : this.filtersService.filterEmployees({ q, job, dept });
    if (this.teamRoleMode) {
      this.teamFiltered = teamBase.slice();
    } else {
      this.teamFiltered = teamBase.filter((e: any) => !this.pmIdSet.has(Number(e.id)));
    }

    const pmq = (this.pmQuery || '').trim();
    const pmBase = this.pmRoleMode
      ? this.filtersService.filterEmployees({ q: pmq, roleList: this.PM_ROLE_LIST })
      : this.filtersService.filterEmployees({ q: pmq });
    this.pmFiltered = pmBase.filter((e: any) => this.pmIdSet.has(Number(e.id)));
  }

  getEmployeeById(id: number) {
    return this.employeesAll.find(e => Number(e.id) === Number(id));
  }

  get teamSelectedEmployees() {
    return (this.teamSelection || []).map((id: any) => this.getEmployeeById(Number(id))).filter(Boolean) as any[];
  }

  get pmSelectedEmployees() {
    return (this.pmSelection || []).map((id: any) => this.getEmployeeById(Number(id))).filter(Boolean) as any[];
  }

  removeFromTeam(id: number) {
    this.teamSelection = (this.teamSelection || []).filter(x => Number(x) !== Number(id));
    this.form.patchValue({ employeeIds: this.teamSelection });
  }

  removeFromPM(id: number) {
    this.pmSelection = (this.pmSelection || []).filter(x => Number(x) !== Number(id));
    this.form.patchValue({ pmIds: this.pmSelection });
  }

  toggleTeam(id: number) {
    const cur = Array.isArray(this.teamSelection) ? [...this.teamSelection.map(Number)] : [];
    const nid = Number(id);
    const idx = cur.findIndex(x => x === nid);
    if (idx >= 0) cur.splice(idx, 1); else cur.push(nid);
    this.teamSelection = cur;
    this.form.patchValue({ employeeIds: this.teamSelection });
  }

  togglePM(id: number) {
    const cur = Array.isArray(this.pmSelection) ? [...this.pmSelection.map(Number)] : [];
    const nid = Number(id);
    const idx = cur.findIndex(x => x === nid);
    if (idx >= 0) cur.splice(idx, 1); else cur.push(nid);
    this.pmSelection = cur;
    this.form.patchValue({ pmIds: this.pmSelection });
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

  async loadBackendCatalogs() {
    try {
      const [off, cli, soft, emp] = await Promise.all([
        this.catalogs.getOffices(),
        this.catalogs.getClients(),
        this.catalogs.getSoftware(),
        this.catalogs.getEmployees(),
      ]);

      this.offices = off;
      this.clients = cli;
      this.software = soft;
      this.employees = emp;

      // 3️⃣ Preload form with original project values
      this.patchForm();
      
    } catch (err) {
      console.error('Error loading catalogs', err);
    }
  }

  patchForm() {
    // tolerant extraction of notes and other optional fields
    const notes = (this.project && (this.project.notes ?? this.project.note ?? this.project.description ?? this.project.comment)) || '';

    this.form.patchValue({
      projectCode: this.project.projectCode,
      name: this.project.name,
      projectArea: this.project.projectArea,
      areaUnit: this.project.areaUnit,
      projectType: this.project.projectType,
      status: this.project.status,
      scope: this.project.scope,
      estimatedCost: this.project.cost,
      trackedTime: this.project.trackedTime,
      officeId: this.getOfficeId(this.project.officeName),
      officeName: this.project.officeName,
      clientId: this.getClientId(this.project.clientName),
      clientName: this.project.clientName,
      softwareId: this.getSoftwareId(this.project.softwareName),
      softwareName: this.project.softwareName,
      notes: notes,
      pmIds: this.project.pmIds || [],
      employeeIds: this.project.employeeIds || [],
    });
  }

  // Helpers to convert names → IDs
  getOfficeId(name: string | undefined) {
    return this.offices.find(o => o.name === name)?.id ?? '';
  }

  getClientId(name: string | undefined) {
    return this.clients.find(c => c.name === name)?.id ?? '';
  }

  getSoftwareId(name: string | undefined) {
    return this.software.find(s => s.name === name)?.id ?? '';
  }

  // Cancel button
  onCancel() {
    // signal the caller that the edit was cancelled so project-details can reopen if it wants
    this.dialogRef.close('cancel');
  }

  // Save button
  async onSave() {
    if (this.form.invalid) return;

    // Asegura que pmIds y employeeIds estén actualizados y sean arrays de números
    const pmIds = Array.isArray(this.pmSelection) ? this.pmSelection.map(Number) : [];
    const employeeIds = Array.isArray(this.teamSelection) ? this.teamSelection.map(Number) : [];

    const payload = {
      ...this.form.value,
      pmIds,
      employeeIds,
      // also include legacy `teamIds` in case backend expects that key
      teamIds: employeeIds
    };

    // Log para depuración
    console.log('[EditProject] Payload enviado al guardar:', payload);

    try {
      await this.projectService.updateProject(this.project.id, payload);
      // After saving, fetch the project to verify what the backend persisted
      try {
        const refreshed = await this.projectService.getProjectById(this.project.id);
        console.log('[EditProject] Project after save (backend):', refreshed);
        console.log('[EditProject] Backend member fields lengths:', {
          employeeIds: (refreshed?.employeeIds || []).length,
          teamIds: (refreshed?.teamIds || []).length,
          employees: (refreshed?.employees || []).length,
          assigned: (refreshed?.assigned || []).length,
        });
      } catch (e) {
        console.warn('Could not fetch project after save for diagnostics:', e);
      }
      this.projectUpdated.emit(); // <-- EMITE EVENTO
      // Close with 'saved' signal so project-details puede reabrir con datos frescos
      this.dialogRef.close({ action: 'saved', projectId: this.project.id });
    } catch (err) {
      console.error('Error saving project:', err);
      this.message = 'Error saving project: ' + ((err as any)?.message || String(err));
    }
  }

  
}
