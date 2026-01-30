import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from "../../core/components/header/header";
import { SubmenuComponent } from "../../core/components/submenu/submenu";
import { SubmenuService } from '../../core/services/submenu.service';
import { ProjectService } from '../../core/services/project.service';
import { AuthService } from '../../core/services/auth.service';
import { HttpClient } from '@angular/common/http';
// FullCalendar removed — no imports here
// import { ModelEstimatedHours } from './services/model';
import { CapacityCalendar } from './components/capacity-calendar/capacity-calendar';

// ColDef and grid logic moved into CapacityCalendar


@Component({
  selector: 'app-estimated-hours',
  standalone: true,
  imports: [CommonModule, HeaderComponent, SubmenuComponent, CapacityCalendar],
  templateUrl: './estimated-hours.html',
  styleUrls: ['./estimated-hours.scss']
})
export class EstimatedHoursPage implements OnInit {
  

   allProjects: any[] = [];
  //  estimatedHours: ModelEstimatedHours[] = [
  //   {
  //   userId: '1',
  //   weekStart: '2024-09-15',
  //   weekEnd: '2024-09-21',
  //   plannedHours: 28,
  //   capacity: 40
  // },
  // {
  //   userId: '2',
  //   weekStart: '2024-09-15',
  //   weekEnd: '2024-09-21',
  //   plannedHours: 35,
  //   capacity: 40
  // }
  //  ];

    paso = 1;

     constructor(
    private http: HttpClient,
    private auth: AuthService,
    private projectService: ProjectService,
    private router: Router
  ) {}

    // header.component.ts (o donde esté el botón)
isMenuOpen = false;

toggleMenu() {
  this.isMenuOpen = !this.isMenuOpen;
}

siguiente() {
      // Recoger valores de la Tabla 1 y enviarlos como estado al paso 2
      try {
        const table = document.querySelector('.time-table tbody');
        const rows = table ? Array.from(table.querySelectorAll('tr')) : [];
        const tableRows: any[] = rows.map(r => {
          const cols = r.querySelectorAll('td');
          const name = cols[0] ? cols[0].textContent?.trim() || '' : '';
          const input = cols[1] ? cols[1].querySelector('input') as HTMLInputElement | null : null;
          const roleLimit = input ? Number(input.value || 0) : null;
          return { name, roleLimit };
        });
        console.log('Estimated Hours - navigating to step2 with tableRows:', tableRows);
        this.router.navigate(['estimated-hours', 'step2'], { state: { tableRows } });
      } catch (err) {
        // fallback: navegar sin estado
        this.router.navigate(['estimated-hours', 'step2']);
      }
    } 
    volver() {
      this.paso = 1;
      // Restaurar dropdown de proyectos al regresar
      this.updateProjectDropdown();
    }
    
  private submenuService = inject(SubmenuService);
  isMenuOpen$ = this.submenuService.open$;


    // ---- Traer los roles para autenticar (UI gating) ----
  get isOwner(): boolean { try { return this.auth.isOwner(); } catch { return false; } }
  get isAdmin(): boolean { try { return this.auth.isAdmin(); } catch { return false; } }
  get isAdminOrOwner(): boolean { return this.isAdmin || this.isOwner; }
  get isUser(): boolean { try { return this.auth.isUser(); } catch { return false; } }
  
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
    // Grid/Calendar logic is handled by `CapacityCalendar` component now.
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
      opt.textContent =  (p.projectCode ? ' ' + p.projectCode + '  -  ' : '') + (p.name || '');
      if (String(p.id) === String(current)) opt.selected = true;
      select.appendChild(opt);
    });
  }

  
  // Grid/Calendar logic moved to `CapacityCalendar` component

        }

