import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { deleteGeneralTask } from '../../../pages/task/task';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogsService } from '../../services/catalogs.service';
import { ProjectService } from '../../services/project.service';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { EditIconComponent } from "../animated-icons/edit-icon.component";
import { XIconComponent } from "../animated-icons/x-icon.component";
import { ConfirmModalComponent } from '../confirm-modal/confirm-modal';

@Component({
  selector: 'app-edit-task',
  imports: [CommonModule, FormsModule, EditIconComponent, XIconComponent, ConfirmModalComponent],
  templateUrl: './edit-task.html',
  styleUrl: './edit-task.scss'
})
export class EditTask implements OnInit, OnChanges {
  showSuccessModal: boolean = false;
    /**
     * canEditTask: true si el usuario puede editar la tarea (rol ADMIN/OWNER o USER que creó la tarea)
     * Se debe setear desde el padre (TasksPage) según la lógica de permisos.
     */
    @Input() canEditTask: boolean = false;
    @Input() canDeleteTask: boolean = false;

    // Modal de confirmación para eliminar
    showDeleteConfirmModal: boolean = false;

    // Refuerzo: asegúrate de que los botones se actualicen si los inputs cambian
    ngOnChanges(changes: SimpleChanges): void {
      if (changes['canEditTask'] || changes['canDeleteTask']) {
        // Forzar actualización de la vista si es necesario
        // (Angular lo hace automáticamente, pero esto es explícito)
        this.canEditTask = !!this.canEditTask;
        this.canDeleteTask = !!this.canDeleteTask;
      }
      // Mostrar End Date si la categoría es 'Out of office' (inmediato al recibir inputs)
      if (
        (this.task?.taskCategoryName && this.task.taskCategoryName.toLowerCase() === 'out of office') ||
        (this.categories && this.task?.taskCategoryId && this.categories.find(c => c.id === this.task.taskCategoryId && c.name && c.name.toLowerCase() === 'out of office'))
      ) {
        this.showEndDate = true;
      } else {
        this.showEndDate = false;
      }
    }


  

  async deleteTask() {
    if (!this.task?.id || !this.task?.name) return;
    // Mostrar modal de confirmación en lugar de confirm()
    this.showDeleteConfirmModal = true;
  }

  async confirmDelete() {
    this.showDeleteConfirmModal = false;
    if (!this.task?.id || !this.task?.name) return;
    this.loading = true;
    this.message = 'Deleting...';
    try {
      const apiBase = this.auth.getApiBase().replace(/\/$/, '');
      const url = `${apiBase}/general-tasks/${this.task.id}`;
      const res: any = await firstValueFrom(this.http.delete(url, { observe: 'response' }));
      if (res.status === 204 || res.status === 200) {
        this.message = 'Task deleted successfully!';
        this.close.emit();
        setTimeout(() => { window.location.reload(); }, 300);
      } else {
        this.message = 'Error deleting task: ' + res.statusText;
      }
    } catch (err: any) {
      if (err?.status === 403) {
        this.message = 'You do not have permission to delete this task.';
      } else if (err?.status === 404) {
        this.message = 'Task not found. It may have already been deleted.';
      } else {
        this.message = 'Error deleting task: ' + (err.message || 'Unknown error');
      }
    }
    this.loading = false;
  }

  cancelDelete() {
    this.showDeleteConfirmModal = false;
  }

    getEmployeeNameById(id: number): string {
      const emp = this.employees.find(e => e.id == id);
      return emp ? emp.name : '';
    }
  @Input() task: any;
  @Output() close = new EventEmitter<void>();

  @Input() allProjects: any[] = [];
  @Input() categories: any[] = [];
  @Input() employees: any[] = [];
  projectPhaseId: any[]= [];
  statuses: string[] = ['IN_PROGRESS', 'COMPLETED', 'PAUSED'];
  description: any []= [];
  message= '';
  createdByEmployeeName: string = '';
  loading = false;
  showEndDate = false;

  constructor(
    private catalogs: CatalogsService,
    private projectService: ProjectService,
    private http: HttpClient,
    private auth: AuthService
  ) {}

  
  async ngOnInit() {
    // Cargar statuses (enums)
    if ((this as any).loadGeneralTaskEnums) {
      const enums = await (this as any).loadGeneralTaskEnums();
      this.statuses = enums.statuses || [];
    } else {
      this.statuses = ['IN_PROGRESS', 'COMPLETED', 'PAUSED'];
    }
    // Cargar fases si hay proyecto
    if (this.task?.projectId && this.task.projectId !== 'None' && this.task.projectId !== null && this.task.projectId !== undefined) {
      await this.loadPhases(this.task.projectId);
    }
    // Asegurar que el proyecto de la tarea esté en allProjects
    if (this.task?.projectId && this.task.projectId !== 'None' && this.task.projectId !== null && this.task.projectId !== undefined) {
      const exists = this.allProjects.some(p => String(p.id) === String(this.task.projectId));
      if (!exists) {
        try {
          const project = await this.projectService.getProjectById(Number(this.task.projectId));
          if (project && project.id) {
            this.allProjects = [...this.allProjects, project];
          }
        } catch (err) {
          // Si no se encuentra el proyecto, opcional: mostrar un fallback
          // this.message = 'El proyecto de esta tarea no está disponible.';
        }
      }
    }
    // Por default Phase = None si no hay valor
    if (!this.task?.projectPhaseId) {
      this.task.projectPhaseId = 'None';
    }
  }

  // ngOnChanges(changes: SimpleChanges): void {
  //   // Mostrar End Date si la categoría es 'Out of office' (inmediato al recibir inputs)
  //   if (
  //     (this.task?.taskCategoryName && this.task.taskCategoryName.toLowerCase() === 'out of office') ||
  //     (this.categories && this.task?.taskCategoryId && this.categories.find(c => c.id === this.task.taskCategoryId && c.name && c.name.toLowerCase() === 'out of office'))
  //   ) {
  //     this.showEndDate = true;
  //   } else {
  //     this.showEndDate = false;
  //   }
  // }

  async loadPhases(projectId: number) {
    if (projectId === null || projectId === undefined || projectId === 0) {
      this.projectPhaseId = [];
      return;
    }
    try {
      // Usar firstValueFrom en vez de .toPromise()
      // Importa: import { firstValueFrom } from 'rxjs';
      const base = this.auth.getApiBase().replace(/\/$/, '');
      const url = `${base}/projects/${projectId}/phases`;
      const result = await firstValueFrom(this.http.get<any[]>(url));
      this.projectPhaseId = result || [];
    } catch (err: any) {
      // Si es 404, simplemente deja la lista vacía y no muestres error
      if (err && err.status === 404) {
        this.projectPhaseId = [];
        // Opcional: puedes poner un mensaje amigable si quieres
        // this.message = 'Este proyecto no tiene fases.';
      } else {
        this.projectPhaseId = [];
        // this.message = 'Error al cargar fases: ' + (err.message || 'Error desconocido');
      }
    }
  }



  async onProjectChange(event: any) {
    const projectId = event.target.value;
    if (projectId && projectId !== 'None' && projectId !== null && projectId !== undefined) {
      await this.loadPhases(projectId);
    } else {
      this.projectPhaseId = [];
    }
  }


  async saveTask() {
    this.loading = true;
    this.message = 'Saving...';
    const payload = {
      ...this.task,
      projectId: this.task.projectId ? Number(this.task.projectId) : null,
      projectPhaseId: this.task.projectPhaseId ? Number(this.task.projectPhaseId) : null,
      taskCategoryId: this.task.taskCategoryId ? Number(this.task.taskCategoryId) : null,
    };
    try {
      const base = this.auth.getApiBase().replace(/\/$/, '');
      const url = `${base}/general-tasks/${this.task.id}`;
      await firstValueFrom(this.http.put(url, payload));
      this.message = 'Task updated successfully!';
      this.showSuccessModal = true;
      setTimeout(() => {
        this.showSuccessModal = false;
        this.close.emit(); // Cierra el modal principal y refresca la vista
      }, 1500); // Modal visible por 1.5 segundos
    } catch (err: any) {
      this.message = 'Error: ' + (err.message || 'Unknown error');
    }
    this.loading = false;

  }


  closeModal() {
    this.close.emit();
  }


    /**
   * Devuelve true si el usuario autenticado tiene rol USER (no puede editar/eliminar)
   */
  get isUserOnly(): boolean {
    try {
      return this.auth.isUser();
    } catch {
      return false;
    }
  }
  
}