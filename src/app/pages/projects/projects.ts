import { Component, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogsService, Employee } from './../../core/services/catalogs.service';
import { AuthService } from '../../core/services/auth.service';
import { EnumsService, Enums } from '../../core/services/enums.service';
import { HttpClientModule } from '@angular/common/http';


@Component({
  selector: 'app-projects',
  standalone: true,
  imports : [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './projects.html',
  styleUrls: ['./projects.scss']
})
export class ProjectsComponent implements OnInit {
 // Catálogos cargados desde el backend
  offices: any[] = [];
  clients: any[] = [];
  software: any[] = [];
  departments: any[] = [];
  jobPositions: any[] = [];
  employees: Employee[] = [];
  statusList = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' }
  ];

  // Filtros seleccionados
  selectedOffice = '';
  selectedClient = '';
  selectedSoftware = '';
  selectedDepartment = '';
  selectedManager = '';
  selectedStatus: string = '';
  selectedType: string = '';
  selectedScope: string = '';
  pageSize: number = 10;


  constructor(private catalogsService: CatalogsService, private enumsService: EnumsService, private auth: AuthService) {}

enums: Enums = { areaUnit: [], type: [], status: [], scope: [] };

  async ngOnInit() {
  await this.loadCatalogs(); // ✅ Esto realmente carga y asigna los catálogos
  this.enums = await this.enumsService.loadEnums(); // enums dinámicos
  }

  // ---- Traer los roles para autenticar (UI gating) ----
  get isOwner(): boolean { try { return this.auth.hasRole('OWNER'); } catch { return false; } }
  get isAdmin(): boolean { try { return this.auth.hasRole('ADMIN'); } catch { return false; } }
  get isAdminOrOwner(): boolean { return this.isAdmin || this.isOwner; }

  /** Carga todos los catálogos desde el backend */
  async loadCatalogs() {
    try {
      const data = await this.catalogsService.loadAllCatalogs();

      // Ordenar por nombre (sin importar mayúsculas)
      const byName = (a: any, b: any) =>
        (a?.name || '').toString().localeCompare((b?.name || '').toString(), undefined, {
          sensitivity: 'base'
        });

      this.offices = (data.offices || []).slice().sort(byName);
      this.clients = (data.clients || []).slice().sort(byName);
      this.software = (data.software || []).slice().sort(byName);
      this.departments = (data.departments || []).slice().sort(byName);
      this.jobPositions = (data.jobPositions || []).slice().sort(byName);
      this.employees = (data.employees || []).slice().sort(byName);

      console.log('✅ Catálogos cargados correctamente:', data);
    } catch (e) {
      console.error('Error loading catalogs:', e);
    }
  }

  /** Detecta si un empleado probablemente es un Project Manager */
  isLikelyPM(employee: Employee): boolean {
    const pmKeywords = [
      'projectmanager',
      'gerentedelproyecto',
      'jefedeproyecto',
      'responsabledeproyecto',
      'gerenteproyecto',
      'projectlead'
    ];
    const normalize = (name: string) =>
      (name || '').toLowerCase().replace(/\s+/g, '').replace(/_/g, '').trim();

    const job = normalize(employee.jobPositionName || '');
    return pmKeywords.some(k => job.includes(k));
  }

  /** Devuelve los empleados que son Project Managers */
  get projectManagers() {
    return this.employees
      .filter(e => this.isLikelyPM(e))
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
  }

  /** Mostrar enums legibles (reemplaza '_' por espacio) sin alterar el valor enviado */
  displayEnum(v: string | null | undefined): string {
    return String(v ?? '').replace(/_/g, ' ');
  }
}

