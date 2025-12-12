
import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, NgIf, NgForOf } from '@angular/common';
import { CatalogsService, Employee } from '../../services/catalogs.service';
import { Project } from './project.model'; // tu modelo de proyecto (si no existe, te muestro cómo crear uno)
import { ApiService } from '../../services/api.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { EditProjectComponent } from '../edit-project/edit-project';
import { ConfirmModalComponent } from '../confirm-modal/confirm-modal';


@Component({
  selector: 'app-project-details',
  standalone: true,
  imports: [CommonModule, MatDialogModule, ConfirmModalComponent],
  templateUrl: './project-details.html',
  styleUrls: ['./project-details.scss']
})
export class ProjectDetailsComponent implements OnInit, OnChanges {
  @Input() projectId?: number;
  @Input() project?: Project;
  @Output() close = new EventEmitter<void>();
  
teamSelected: Employee[] = [];
pmSelected: Employee[] = [];
pms: Employee[] = [];
team: Employee[] = [];   // ← ESTA será la lista final de TEAM

assignedDeps: string[] = [];
assignedRoles: string[] = [];
isLoading = false;
  showConfirmModal = false;
  confirmDeleteId: number | null = null;
  confirmDeleteName: string = '';
errorMessage = '';
  private _employeesCache?: Employee[];


private isLikelyPM(employee: Employee): boolean {
  return employee.roles?.toLowerCase().includes('pm') ?? false;
}

private isAllowedTeamEmployee(employee: Employee): boolean {
  const allowedRoles = ['developer', 'designer', 'qa', 'engineer'];
  const roles = (employee.roles ?? '') as any;
  // support array or comma-separated / freeform role strings
  if (Array.isArray(roles)) {
    return roles.map(r => String(r).toLowerCase()).some(r => allowedRoles.includes(r));
  }
  const rolesStr = String(roles).toLowerCase();
  return allowedRoles.some(r => rolesStr.includes(r));
}


  constructor(private catalogsService: CatalogsService, private api: ApiService, private dialog: MatDialog) {}

  /**
   * Mapear un estado a una clase CSS para el badge de estado.
   * Mantiene la misma heurística que en ProjectsComponent.statusToClass.
   */
  getStatusClass(status?: string): string {
    const v = (status || '').toLowerCase();
    if (v.includes('progress')) return 'in-progress';
    if (v.includes('complete')) return 'completed';
    if (v.includes('pause')) return 'paused';
    if (v.includes('cancel')) return 'cancelled';
    return 'in-progress';
  }

  /**
   * Formatea la etiqueta de un empleado para mostrar en chips/lists.
   */
  // (implementation moved lower to include job/department details)

  async ngOnInit() {
    // If the parent provided the project object directly, show it immediately
    // and also attempt to fetch fuller details from the API to enrich the view.
    if (this.project && (this.project as any).id) {
      const id = Number((this.project as any).id);
      // Try to populate pms/team immediately from the provided project using cached employees
      this.populateFromProvidedProject(this.project as any).catch(() => {});
      // Fire-and-forget: then enrich when the API returns
      this.loadProjectDetails(id).catch(err => console.error('Failed to enrich project details:', err));
      return;
    }

    if (this.projectId) {
      await this.loadProjectDetails(this.projectId);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // react when parent sets projectId or project after initialization
    if (changes['projectId'] && !changes['projectId'].isFirstChange()) {
      const id = changes['projectId'].currentValue as number | undefined;
      if (id) this.loadProjectDetails(Number(id)).catch(err => console.error('ngOnChanges loadProjectDetails:', err));
    }
    if (changes['project']) {
      const proj = changes['project'].currentValue as Project | undefined;
      if (proj && (proj as any).id) {
        // populate immediately from provided object, then fetch to enrich
        this.populateFromProvidedProject(proj as any).catch(() => {});
        this.loadProjectDetails(Number((proj as any).id)).catch(err => console.error('ngOnChanges loadProjectDetails:', err));
      }
    }
  }
  
  // ✅ Manejo del modal y errores
async openProjectDetails(id: number): Promise<void> {
  this.isLoading = true;
  this.errorMessage = '';

  try {
    await this.loadProjectDetails(id);

    // Si todo va bien, puedes mostrar feedback visual si lo deseas

    // Debug: log project and assigned/team data to help diagnose missing team members
    try {
      console.debug('[ProjectDetails] project loaded:', this.project);
      console.debug('[ProjectDetails] detected pms:', this.pms.map(p=>p?.id));
      console.debug('[ProjectDetails] detected team:', this.team.map(t=>t?.id));
      console.debug('[ProjectDetails] assignedDeps:', this.assignedDeps, 'assignedRoles:', this.assignedRoles);
    } catch (e) {}

  } catch (e: any) {
    console.error('❌ Error loading project details:', e);
    this.errorMessage = 'Error loading details: ' + (e?.message || e);
    // Puedes mostrar feedback visual de error si lo deseas
  } finally {
    this.isLoading = false;
  }
}

// ✅ Cerrar el modal
closeModal(): void {
  // No hay showModal, solo cerrar modal si aplica
  this.close.emit();
}

// ==========================
// 🧩 Helpers utilitarios
// ==========================

uniqueIds(arr: any[]): any[] {
  return Array.from(new Set(arr));
}

employeeOptionLabel(emp: any): string {
  if (!emp) return '';
  // Support multiple possible shapes from backend/catalogs
  const job = emp.jobPositionName || emp.jobTitle || emp.jobPosition || emp.position || emp.job || '';
  const dept = emp.departmentName || emp.department || emp.dept || '';
  return `${emp.name || ''}${job ? ' · ' + job : ''}${dept ? ' · ' + dept : ''}`;
}

async loadProjectDetails(id: number): Promise<void> {
  this.isLoading = true;

  try {
  // 1️⃣ Obtener empleados y mapear por ID (usa caché local si está disponible)
  const employees = await this.ensureEmployeesCache();
    const employeesById = new Map<number, Employee>(employees.map((e: Employee) => [e.id, e]));

    // 2️⃣ Obtener proyecto por ID
    const p = await this.api.get<Project>(`/projects/${id}`);
    // assign raw project and normalize a few fields that backend may return under different keys
    this.project = p as Project;
    // Normalize phase: backend might send phase as string, object or id
    const rawPhase: any = (p as any).phase ?? (p as any).phaseName ?? (p as any).phaseId ?? undefined;
    if (rawPhase !== undefined && rawPhase !== null) {
      if (typeof rawPhase === 'string') this.project.phase = rawPhase;
      else if (typeof rawPhase === 'number') this.project.phase = String(rawPhase);
      else if (typeof rawPhase === 'object') this.project.phase = rawPhase.name || rawPhase.label || JSON.stringify(rawPhase);
    }

    // Normalize metrics: support multiple possible backend field names
    const toNumber = (v: any): number | undefined => {
      if (v === undefined || v === null || v === '') return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };

    // cost estimations
    this.project.cost = toNumber((p as any).cost ?? (p as any).estimatedCost ?? (p as any).estCost ?? (p as any).costEstimate ?? (p as any).budget) ?? this.project.cost;
    this.project.realCost = toNumber((p as any).realCost ?? (p as any).actualCost ?? (p as any).costReal ?? (p as any).spent) ?? this.project.realCost;

    // time metrics
    this.project.trackedTime = toNumber((p as any).trackedTime ?? (p as any).uiTime ?? (p as any).tracked_hours ?? (p as any).timeTracked) ?? this.project.trackedTime;
    this.project.estimatedTime = toNumber((p as any).estimatedTime ?? (p as any).estTime ?? (p as any).estimated_hours ?? (p as any).timeEstimate) ?? this.project.estimatedTime;
    this.project.realTime = toNumber((p as any).realTime ?? (p as any).actualTime ?? (p as any).real_hours ?? (p as any).timeSpent) ?? this.project.realTime;

    // 3️⃣ Obtener empleados asignados (tolerante a varias formas que envía el backend)
    const assignedIds = this.extractAssignedIds(p);
    const assigned = assignedIds
      .map((i: number) => employeesById.get(Number(i)))
      .filter((e: Employee | undefined): e is Employee => Boolean(e));

    // 4️⃣ Obtener Project Managers
    const pmIds = Array.isArray(p.pmIds) ? p.pmIds.map(Number) : [];
    const pms = pmIds.length
      ? pmIds.map((i: number) => employeesById.get(i)).filter((e: Employee | undefined): e is Employee => Boolean(e))
      : assigned.filter((e: Employee) => this.isLikelyPM(e));

    // 5️⃣ Filtrar equipo (excluyendo PMs)
    const team = assigned.filter((e: Employee) =>
  !pms.some(pm => pm.id === e.id)
);


    // 6️⃣ Derivar departamentos y roles únicos de los empleados asignados
    const assignedDeps = Array.from(
      new Set<string>(
        assigned
          .map((a: Employee) => (a as any).departmentName || (a as any).department || (a as any).dept)
          .filter((v: any) => Boolean(v))
          .map((v: any) => String(v))
      )
    );

    const assignedRoles = Array.from(
      new Set<string>(
        assigned
          .map((a: Employee) => (a as any).jobPositionName || (a as any).jobTitle || (a as any).job || (a as any).position)
          .filter((v: any) => Boolean(v))
          .map((v: any) => String(v))
      )
    );

    // 7️⃣ Asignar a propiedades del componente
    this.pms = pms;
    this.team = team;
    this.assignedDeps = assignedDeps;
    this.assignedRoles = assignedRoles;
  } 
  catch (error) {
    console.error('Error loading project details:', error);
  } 
  finally {
    this.isLoading = false;
  }
}

  // --- Helpers para poblar desde el objeto `project` proporcionado por el padre ---
  private async ensureEmployeesCache(): Promise<Employee[]> {
    if (this._employeesCache && this._employeesCache.length) return this._employeesCache;
    try {
      const emps = await this.catalogsService.getEmployees();
      this._employeesCache = (emps || []) as Employee[];
    } catch (e) {
      this._employeesCache = [];
    }
    return this._employeesCache;
  }

  private extractAssignedIds(p: any): number[] {
    if (!p) return [];
    const candidates: any[] = [];
    if (Array.isArray(p.employeeIds)) candidates.push(...p.employeeIds);
    if (Array.isArray(p.assignedEmployeeIds)) candidates.push(...p.assignedEmployeeIds);
    if (Array.isArray(p.teamIds)) candidates.push(...p.teamIds);
    if (Array.isArray(p.pmIds)) candidates.push(...p.pmIds);
    if (Array.isArray(p.employees)) candidates.push(...p.employees.map((x: any) => x.id ?? x));
    if (Array.isArray(p.teamMembers)) candidates.push(...p.teamMembers.map((x: any) => x.id ?? x.employeeId ?? x));
    if (Array.isArray(p.assignments)) candidates.push(...p.assignments.map((a: any) => a.employeeId ?? a.employee?.id ?? a.id ?? a));
    if (Array.isArray(p.assigned)) candidates.push(...p.assigned.map((x: any) => x.id ?? x));

    const ids = Array.from(new Set(candidates.map((c: any) => Number(c)).filter(n => Number.isFinite(n))));
    return ids;
  }

  private async populateFromProvidedProject(proj: any): Promise<void> {
    if (!proj) return;
    try {
      const employees = await this.ensureEmployeesCache();
      const employeesById = new Map<number, Employee>(employees.map((e: Employee) => [e.id, e]));
      const assignedIds = this.extractAssignedIds(proj);
      const assigned = assignedIds.map((i: number) => employeesById.get(i)).filter((e): e is Employee => Boolean(e));

      const pmIds = Array.isArray(proj.pmIds) ? proj.pmIds.map(Number) : (Array.isArray(proj.pms) ? proj.pms.map((x: any) => x.id ?? x) : []);
      const pms = pmIds.length
        ? pmIds.map((i: number) => employeesById.get(i)).filter((e: Employee | undefined): e is Employee => Boolean(e))
        : assigned.filter((e: Employee) => this.isLikelyPM(e));

      this.pms = pms;
      this.team = assigned.filter((e: Employee) => !pms.some((pm: Employee) => pm && pm.id === e.id));
    } catch (e) {
      // ignore; loadProjectDetails will enrich later
    }
  }

// --- NOTES Y ACCIONES --- //

isAdminOrOwner(): boolean {
  // 🔹 Aquí va tu lógica real de permisos.
  // Por ahora simulamos que el usuario actual tiene rol admin
  const currentUserRole = 'admin'; // esto normalmente viene de tu authService
  return ['admin', 'owner'].includes(currentUserRole.toLowerCase());
}

// 🗑️ Eliminar proyecto
  deleteProject(): void {
    if (!this.project) return;
    this.confirmDeleteId = this.project.id;
    this.confirmDeleteName = this.project.name || this.project.projectCode || '';
    this.showConfirmModal = true;
  }

  async confirmDeleteProject(): Promise<void> {
    if (!this.confirmDeleteId) return;
    try {
      await this.api.delete(`/projects/${this.confirmDeleteId}`);
      this.showConfirmModal = false;
      this.close.emit();
    } catch (error: any) {
      this.errorMessage = 'Error deleting project: ' + (error.message || error);
      this.showConfirmModal = false;
    }
  }

  cancelDeleteProject(): void {
    this.showConfirmModal = false;
    this.confirmDeleteId = null;
    this.confirmDeleteName = '';
  }



// ✏️ Editar proyecto
openEditModal() {
  // Close the details modal completely before opening edit
  this.closeModal();

  const openDialog = () => {
    const ref = this.dialog.open(EditProjectComponent, {
      width: '720px',
      disableClose: false,
      panelClass: 'edit-modal-card',
      data: { project: this.project },
      hasBackdrop: true
    });

    // If the user cancels or saves, reopen the details modal for the same project.
    ref.afterClosed().subscribe((result: any) => {
      console.log('Edit dialog closed with result:', result);
      
      if (result === 'cancel') {
        // Reopen details modal
        const id = this.project?.id ?? this.projectId;
        if (id) {
          setTimeout(() => this.openProjectDetails(Number(id)), 60);
        }
      }
      if (result && typeof result === 'object' && result.action === 'saved') {
        // Si se guardó, recargar detalles
        const id = result.projectId ?? this.project?.id ?? this.projectId;
        if (id) {
          setTimeout(() => this.openProjectDetails(Number(id)), 100);
        }
      }
    });
  };
  openDialog();
}

// === MÉTRICAS AVANZADAS ===
get metricsList(): Array<{ dot: string, label: string, value: any }> {
  const p: any = this.project || {};
  const fmtCost = (val: any) => val != null ? `$${Number(val).toFixed(2)} USD` : '-';
  const role = this.resolveRole();
  if (role !== 'OWNER') return [];
  return [
    { dot: 'dot-cost', label: 'Est. cost', value: fmtCost(p.estimatedCost) },
    { dot: 'dot-cost', label: 'Real cost', value: fmtCost(p.realCost) },
    { dot: 'dot-time', label: 'Florida Estimated Time (h)', value: p.floridaTrackedTime },
    { dot: 'dot-time', label: 'Est. time', value: p.estimatedTime },
    { dot: 'dot-time', label: 'Real time', value: p.realTime },
  ];
}

resolveRole(): string {
  // Simulación: deberías obtener el rol real del usuario autenticado
  // return this.authService.getRole() o similar
  return 'OWNER'; // Cambia a 'ADMIN' o 'OWNER' según tu lógica real
}
}