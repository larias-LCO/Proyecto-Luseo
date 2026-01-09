  
import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  inject
} from '@angular/core';
import { CommonModule, NgIf, NgForOf } from '@angular/common';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { EmployeeApi } from '../../../pages/team/team-api'; // Ajusta la ruta si tu estructura es distinta

/**
 * EditarMiembroComponent
 * - Recibe por @Input() el miembro a editar y los catálogos/roles.
 * - Emite (guardar) con el objeto actualizado cuando termina el PUT exitoso (o al menos con el payload local).
 * - Emite (cerrar) para indicar que se cerró el modal.
 *
 * Nota: el <app-editar-miembro> en tu team.html controla su visibilidad con *ngIf="mostrarModal",
 * por lo que aquí no manejamos mostrarModal desde el padre.
 */
@Component({
  selector: 'app-editar-miembro',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf, ReactiveFormsModule, FormsModule],
  templateUrl: './editar-miembro.html',
  styleUrls: ['./editar-miembro.scss']
})
export class EditarMiembroComponent implements OnInit, OnChanges {
    showSuccessModal = false;
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private api!: EmployeeApi;

  // Inputs (el padre pasa el miembro seleccionado y catálogos)
  @Input() miembro: any | null = null;
  @Input() catalogs: { departments?: any[]; jobs?: any[]; offices?: any[] } = { departments: [], jobs: [], offices: [] };
  @Input() allowedRoles: string[] = [];

  // Outputs
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<any>(); // emitiremos el payload actualizado

  // Reactive form
  form!: FormGroup;

  // lista que usa el template para mostrar roles (fácil de filtrar si hace falta)
  filteredAllowedRoles: string[] = [];




  // Control local por seguridad (no rompe el *ngIf del padre)
  mostrarModal = true;


  ngOnInit(): void {
    const base = this.auth.getApiBase?.() ?? '';
    this.api = new EmployeeApi(base, this.auth);

    this.buildForm();
    this.filteredAllowedRoles = Array.isArray(this.allowedRoles) ? [...this.allowedRoles] : [];

    // Si ya vino el miembro, parchear valores
    if (this.miembro) {
      this.patchForm(this.miembro);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['allowedRoles'] && Array.isArray(this.allowedRoles)) {
      this.filteredAllowedRoles = [...this.allowedRoles];
    }
    if (changes['miembro'] && this.miembro && this.form) {
      this.patchForm(this.miembro);
    }
    if (changes['catalogs']) {
      // no hacemos nada extra, el template leerá catalogs directamente
    }
  }

  private buildForm() {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      departamento: ['', Validators.required],
      oficina: ['', Validators.required],
      posicion: ['', Validators.required],
      rol: ['', Validators.required],
      tarifa: [null, [Validators.required, Validators.min(0)]],
      estado: ['', Validators.required]
    });
  }

  private patchForm(miembro: any) {
    // Rellenar el formulario con los valores recibidos (si existen)
    this.form.patchValue({
      nombre: miembro.name ?? miembro.fullName ?? '',
      departamento: miembro.departmentName ?? miembro.department ?? '',
      oficina: miembro.officeName ?? miembro.office ?? '',
      posicion: miembro.jobPositionName ?? miembro.jobPosition ?? '',
      rol: miembro.accountRole ?? miembro.role ?? (miembro.roles?.[0]) ?? '',
      tarifa: miembro.billableRate ?? miembro.tarifa ?? null,
      estado: miembro.state ?? miembro.status ?? 'ACTIVE'
    });
  }

  private getEmployeeRoles(e: any): string[] {
    const arr = (Array.isArray(e?.roles)
      ? e.roles
      : (Array.isArray(e?.account?.roles) ? e.account.roles
        : (Array.isArray(e?.accountRoles) ? e.accountRoles
          : (Array.isArray(e?.account?.authorities) ? e.account.authorities : []))));
    const mapped = (arr as any[]).map((r: any) => typeof r === 'string' ? r : (r?.name || r?.role || r?.authority || r?.rol || r?.roleName || r?.label)).filter(Boolean) as string[];
    const single = (e?.accountRole || e?.account?.role);
    const singles = single ? [String(single)] : [];
    return [...new Set([...mapped, ...singles].map(x => String(x).toUpperCase()))];
  }

  // Expose admin check for template
  isAdmin(): boolean { return this.auth.hasRole('ADMIN'); }

  // Llamado desde el botón "Cancelar" del template
  cerrarModal() {
    this.cerrar.emit();
  }

  // Llamado desde el botón "Guardar" del template
  async guardarCambios(): Promise<void> {
    if (!this.form || this.form.invalid || !this.miembro) {
      // marcar touched para mostrar errores si hay
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value;
    // Si ADMIN intenta editar OWNER o asignar OWNER, bloquear
    const targetRoles = this.getEmployeeRoles(this.miembro);
    if (this.auth.hasRole('ADMIN') && targetRoles.includes('OWNER')) {
      alert('No autorizado: un ADMIN no puede editar a un OWNER.');
      return;
    }
    const newRole = String(v.rol || '').toUpperCase();
    if (this.auth.hasRole('ADMIN') && newRole === 'OWNER') {
      alert('No autorizado: un ADMIN no puede asignar rol OWNER.');
      return;
    }

    // Construir payload consistente con lo que el backend espera
    const payload = {
      ...this.miembro, // conserva el resto de propiedades
      name: v.nombre,
      departmentName: v.departamento,
      officeName: v.oficina,
      jobPositionName: v.posicion,
  accountRole: newRole,
      billableRate: Number(v.tarifa),
      state: v.estado
    };

    try {
      // Si EmployeeApi provee updateEmployee lo usamos
      if (this.api && typeof (this.api as any).updateEmployee === 'function') {
        await (this.api as any).updateEmployee(payload.id ?? payload.employeeId ?? this.miembro.id, payload);
      } else {
        // fallback usando fetchWithAuth para enviar las credenciales
        const base = this.auth.getApiBase?.() ?? '';
        const id = payload.id ?? this.miembro.id;
        const response = await this.auth.fetchWithAuth(`${base.replace(/\/$/, '')}/employees/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
        }
      }

      // Mostrar modal de éxito
      this.showSuccessModal = true;
      setTimeout(() => {
        this.showSuccessModal = false;
        // Emitir al padre para que actualice su lista inmediata y cerrar modal
        this.guardar.emit(payload);
        this.cerrarModal();
      }, 1500);
    } catch (err: any) {
      console.error('Error guardando empleado:', err);
      alert(err?.message ?? 'Error al guardar los cambios.');
    }
  }
}
