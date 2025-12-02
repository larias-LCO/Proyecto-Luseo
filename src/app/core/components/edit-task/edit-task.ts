import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogsService } from '../../services/catalogs.service';
import { ProjectService } from '../../services/project.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-edit-task',
  imports: [ CommonModule, FormsModule ],
  templateUrl: './edit-task.html',
  styleUrl: './edit-task.scss'
})
export class EditTask implements OnInit {
      
    getEmployeeNameById(id: number): string {
      const emp = this.employees.find(e => e.id == id);
      return emp ? emp.name : '';
    }
  @Input() task: any;
  @Output() close = new EventEmitter<void>();

  allProjects: any[] = [];
  categories: any[] = [];
  projectPhaseId: any[]= [];
  statuses: string[] = ['IN_PROGRESS', 'COMPLETED', 'PAUSED'];
  employees: any[] = [];
  description: any []= [];
  message= '';
  createdByEmployeeName: string = '';
  loading = false;

  constructor(private catalogs: CatalogsService, private projectService: ProjectService, private http:HttpClient) {}

  async ngOnInit() {
    // Cargar proyectos desde el backend
    const projectsResult = await this.projectService.loadProjects({});
    this.allProjects = projectsResult.items || [];
    // Cargar categorías desde el backend (debería existir getCategories en CatalogsService)
    if ((this.catalogs as any).getCategories) {
      this.categories = await (this.catalogs as any).getCategories();
    }
    // Cargar empleados para el select de Created By
    if ((this.catalogs as any).getEmployees) {
      this.employees = await (this.catalogs as any).getEmployees();
    }
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
  }

  async loadPhases(projectId: number) {
    if (projectId === null || projectId === undefined || projectId === 0) {
      this.projectPhaseId = [];
      return;
    }
    try {
      const result = await this.http.get<any[]>(`/api/projects/${projectId}/phases`).toPromise();
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
      await this.http.put(`/api/general-tasks/${this.task.id}`, payload).toPromise();
      this.message = 'Task updated successfully!';
      this.close.emit();
      // Aquí puedes emitir un evento o refrescar la lista de tareas
    } catch (err: any) {
      this.message = 'Error: ' + (err.message || 'Unknown error');
    }
    this.loading = false;

  }


 

  

  closeModal() {
    this.close.emit();
  }
}