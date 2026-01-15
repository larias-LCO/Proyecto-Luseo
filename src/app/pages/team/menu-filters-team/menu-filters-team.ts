import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { SubmenuComponent } from '../../../core/components/submenu/submenu';
import { CatalogsService } from '../../../core/services/catalogs.service';

@Component({
  selector: 'app-menu-filters-team',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './menu-filters-team.html',
  styleUrls: ['./menu-filters-team.scss']
})
export class MenuFiltersTeam {
private auth = inject(AuthService);
 @Input() departments!: any[];
 @Input() positions!: any[];
@Input() offices!: any[];
   @Input() roles!: any[];
   @Input() jobs!: any[];
   @Input() states!: any[];



    @Output() filtersChange = new EventEmitter<any>();
  @Output() clear = new EventEmitter<void>();
  @Output() toggleSubmenu = new EventEmitter<void>();


  catalogs = {
    jobs: [] as any[], 
  }


  // ---- Traer los roles para autenticar (UI gating) ----
 get isOwner(): boolean {
  return this.auth.isOwner();
}

  get isAdmin(): boolean {
  return this.auth.isAdmin();
}

get isAdminOrOwner(): boolean {
  return this.isAdmin || this.isOwner;
}

get isUser(): boolean {
  return this.auth.isUser();
}



  selectedDepartments: any[] = [];
   selectedOffices: any[] = [];
    selectedPositions: any[] = [];
    selectedRoles: any[] = [];
    selectedJobs: any[] = [];
    selectedStates: any[] = [];

  searchText = '';
  private _searchTimer: any;

   // Control de colapso por sección (false = abierto)
  collapsed: Record<string, boolean> = {
    departments: false,
    offices: false,
    positions: false,
    roles: false,
    jobs: false,
    states: false
  };

   toggleCollapse(key: string) {
    this.collapsed[key] = !this.collapsed[key];
  }

  isCollapsed(key: string) {
    return !!this.collapsed[key];
  }

  toggleSelection(list: any[], value: any) {
    const v = typeof value === 'string' && value !== '' && !isNaN(Number(value)) ? Number(value) : value;
    const idx = list.indexOf(v);
    if (idx === -1) list.push(v); else list.splice(idx, 1);
    this.emitFilters();
  }

  onSearchChange(v: string) {
    if (this._searchTimer) clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => {
      this.emitFilters();
    }, 300);
  }


   clearAll() {
    this.selectedOffices = [];
    this.selectedDepartments = [];
    this.selectedPositions = [];
    this.selectedRoles = [];
    this.selectedJobs = [];
    this.selectedStates = [];
    this.searchText = '';
    this.clear.emit();
    this.emitFilters();
  }

   emitFilters() {
    this.filtersChange.emit({
      officeId: this.selectedOffices,
      departmentId: this.selectedDepartments,
      positionId: this.selectedPositions,
      rolesId: this.selectedRoles,
      jobId: this.selectedJobs,
      stateId: this.selectedStates,
      searchText: this.searchText?.trim() || ''
    });
  }

   display(v: any) { return String(v ?? '').replace(/_/g, ' '); }
}
