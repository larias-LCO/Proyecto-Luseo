import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { SubmenuComponent } from "../../../../core/components/submenu/submenu";

@Component({
  selector: 'app-menu-filters-projects',
  standalone: true,
  imports: [CommonModule, FormsModule, SubmenuComponent],
  templateUrl: './menu-filters-projects.html',
  styleUrls: ['./menu-filters-projects.scss']
})
export class MenuFiltersProjects {
  private auth = inject(AuthService);
  @Input() offices: any[] = [];
  @Input() clients: any[] = [];
  @Input() software: any[] = [];
  @Input() departments: any[] = [];
  @Input() managerOptions: any[] = [];
  @Input() enums: any = { status: [], type: [], scope: [] };
  @Input() pageSize = 10;

  @Output() filtersChange = new EventEmitter<any>();
  @Output() clear = new EventEmitter<void>();
  @Output() toggleSubmenu = new EventEmitter<void>();

  // ---- Traer los roles para autenticar (UI gating) ----
  get isOwner(): boolean { try { return this.auth.hasRole('OWNER'); } catch { return false; } }
  get isAdmin(): boolean { try { return this.auth.hasRole('ADMIN'); } catch { return false; } }
  get isAdminOrOwner(): boolean { return this.isAdmin || this.isOwner; }
  get isUser(): boolean { try { return this.auth.hasRole('USER'); } catch { return false; } }



  selectedOffices: any[] = [];
  selectedClients: any[] = [];
  selectedSoftware: any[] = [];
  selectedDepartments: any[] = [];
  selectedManagers: any[] = [];
  selectedStatus: any[] = [];
  selectedTypes: any[] = [];
  selectedScopes: any[] = [];

  searchText = '';
  private _searchTimer: any;

  // Control de colapso por sección (false = abierto)
  collapsed: Record<string, boolean> = {
    offices: false,
    clients: false,
    software: false,
    departments: false,
    managers: false,
    status: false,
    type: false,
    scope: false
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
    this.selectedClients = [];
    this.selectedSoftware = [];
    this.selectedDepartments = [];
    this.selectedManagers = [];
    this.selectedStatus = [];
    this.selectedTypes = [];
    this.selectedScopes = [];
    this.searchText = '';
    this.clear.emit();
    this.emitFilters();
  }


  emitFilters() {
    this.filtersChange.emit({
      officeId: this.selectedOffices,
      clientId: this.selectedClients,
      softwareId: this.selectedSoftware,
      status: this.selectedStatus,
      type: this.selectedTypes,
      scope: this.selectedScopes,
      managerId: this.selectedManagers,
      departmentId: this.selectedDepartments,
      q: this.searchText?.trim() || ''
    });
  }

  display(v: any) { return String(v ?? '').replace(/_/g, ' '); }

  
}
