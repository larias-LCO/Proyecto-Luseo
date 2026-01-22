import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from "../../core/components/header/header";
import { SubmenuComponent } from "../../core/components/submenu/submenu";
import { SubmenuService } from '../../core/services/submenu.service';
import { ProjectService } from '../../core/services/project.service';
import { AuthService } from '../../core/services/auth.service';
import { HttpClient } from '@angular/common/http';


@Component({
  selector: 'app-estimated-hours',
  standalone: true,
  imports: [CommonModule, HeaderComponent, SubmenuComponent],
  templateUrl: './estimated-hours.html',
  styleUrls: ['./estimated-hours.scss']
})
export class EstimatedHoursPage implements OnInit {

   allProjects: any[] = [];

     constructor(
    private http: HttpClient,
    private auth: AuthService,
    private projectService: ProjectService
  ) {}

    // header.component.ts (o donde esté el botón)
isMenuOpen = false;

toggleMenu() {
  this.isMenuOpen = !this.isMenuOpen;
}

  private submenuService = inject(SubmenuService);
  isMenuOpen$ = this.submenuService.open$;

 // ========== PROYECTOS ========== 
  async loadProjectsFromService(query: any = {}): Promise<void> {
    try {
      const { items } = await this.projectService.loadProjects(query);
      this.allProjects = items;
    } catch (err) {
      console.error('Error loading projects:', err);
      this.allProjects = [];
    }
  }

  ngOnInit(): void {
    // Cargar proyectos y poblar el select al iniciar
    this.loadProjectsFromService().then(() => this.updateProjectDropdown()).catch(() => this.updateProjectDropdown());
  }

  updateProjectDropdown(): void {
    const select = document.getElementById('project-filter') as HTMLSelectElement | null;
    if (!select) return;
    const current = select.value;
    // limpiar opciones excepto la primera (All)
    select.innerHTML = '<option value="">All</option>';
    (this.allProjects || []).forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = (p.name || '') + (p.projectCode ? ' (' + p.projectCode + ')' : '');
      if (String(p.id) === String(current)) opt.selected = true;
      select.appendChild(opt);
    });
  }
      
        }

