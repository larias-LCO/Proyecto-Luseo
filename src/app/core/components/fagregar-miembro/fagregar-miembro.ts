import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';


@Component({
  selector: 'app-fagregar-miembro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './fagregar-miembro.html',
  styleUrls: ['./fagregar-miembro.scss']
})
export class FagregarMiembroComponent {
      showPassword = false;
    showSuccessModal = false;
  @Input() catalogs: { departments: any[]; jobs: any[]; offices: any[] } | null = null;
  @Input() allowedRoles: string[] | null = null; // e.g., ['ADMIN','OWNER'] or ['ADMIN']
  @Output() created = new EventEmitter<void>();
  mostrarModal = false;
  paso = 1;
  form: FormGroup;
  private auth = inject(AuthService);

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      departamento: ['', Validators.required],
      oficina: ['', Validators.required],
      posicion: ['', Validators.required],
      rol: ['USER', Validators.required],
      tarifa: ['', [Validators.required, Validators.min(0)]],
      usuario: ['', Validators.required],
      correo: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  get filteredAllowedRoles(): string[] {
    return Array.isArray(this.allowedRoles) ? this.allowedRoles : [];
  }

  abrirModal() {
    // Solo ADMIN u OWNER pueden abrir
    if (!(this.auth.hasRole('ADMIN') || this.auth.hasRole('OWNER'))) {
      alert('No autorizado: tu rol no permite agregar miembros.');
      
      return;
    }
    // Limpiar el formulario antes de mostrar el modal y forzar paso 1
    this.form.reset({
      nombre: '',
      departamento: '',
      oficina: '',
      posicion: '',
      rol: 'USER',
      tarifa: '',
      usuario: '',
      correo: '',
      password: ''
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.paso = 1;
    this.mostrarModal = true;
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.paso = 1;


    this.form.reset({
    nombre: '',
    departamento: '',
    oficina: '',
    posicion: '',
    rol: 'USER',
    tarifa: '',
    usuario: '',
    correo: '',
    password: ''
  });
    
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  siguiente() {
    if (
      this.form.get('nombre')?.valid &&
      this.form.get('departamento')?.valid &&
      this.form.get('oficina')?.valid &&
      this.form.get('posicion')?.valid &&
      this.form.get('rol')?.valid &&
      this.form.get('tarifa')?.valid
    ) {
      this.paso = 2;
    } else {
      this.form.markAllAsTouched();
    }
  }

  atras() {
    this.paso = 1;
  }

  async agregar() {
    
    if (!this.form.valid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.value;
    // Map form values to DTOs
    const name = v.nombre?.trim();
    const email = v.correo?.trim();
    const billableRate = Number(v.tarifa);
    const departmentName = v.departamento;
    const officeName = v.oficina;
    const jobPositionName = v.posicion;
    const username = v.usuario?.trim();
    const password = v.password;
    const role = String(v.rol || '').toUpperCase();
    // ADMIN no puede crear OWNER
    if (this.auth.hasRole('ADMIN') && role === 'OWNER') {
      alert('No autorizado: un ADMIN no puede crear usuarios con rol OWNER.');
      return;
    }
    try {
      // 1) Crear cuenta: backend espera username/passwordHash/role (role opcional)
      const accApi = `${this.auth.getApiBase()}/accounts`;
      const accPayload = { username, passwordHash: password, role };
      console.debug('Creando cuenta con payload:', accPayload);
      const accRes = await this.auth.fetchWithAuth(accApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accPayload)
      });
      if (!accRes.ok) {
        const txt = await accRes.text().catch(() => '');
        // Sugerencia de duplicado
        if (/duplicat|unique|constraint/i.test(txt)) {
          throw new Error('El nombre de usuario ya existe. Usa otro.');
        }
        throw new Error(`Error creando cuenta (${accRes.status}): ${txt || accRes.statusText}`);
      }
      const acc = await accRes.json().catch(() => ({} as any));
      if (!acc || !acc.id) {
        throw new Error('La cuenta se creó pero no regresó un id válido.');
      }

      // 2) Crear empleado: backend espera IDs de relaciones.
      const api = `${this.auth.getApiBase()}/employees`;
      const getName = (x: any) => (typeof x === 'string' ? x : (x?.name || x?.label || x?.title || x?.descripcion || ''));
      const findIdByName = (arr: any[] | undefined | null, n: string | undefined | null) => {
        if (!arr || !n) return undefined;
        const found = (arr as any[]).find(x => String(getName(x)).toLowerCase() === String(n).toLowerCase());
        const id = found?.id ?? found?.departmentId ?? found?.jobPositionId ?? found?.officeId;
        return typeof id === 'number' || typeof id === 'string' ? Number(id) : undefined;
      };
      const departmentId = findIdByName(this.catalogs?.departments || [], departmentName);
      const jobPositionId = findIdByName(this.catalogs?.jobs || [], jobPositionName);
      const officeId = findIdByName(this.catalogs?.offices || [], officeName);

      if (!departmentId || !jobPositionId || !officeId) {
        console.error('IDs resueltos:', { departmentId, jobPositionId, officeId });
        throw new Error('No se pudieron resolver los IDs de Departamento/Puesto/Oficina. Verifica los catálogos cargados y la selección.');
      }
      const rate = isNaN(billableRate) ? undefined : billableRate;
      const empPayload: any = {
        name,
        email,
        accountId: Number(acc.id),
        departmentId,
        jobPositionId,
        officeId
      };
      if (rate !== undefined) empPayload.billableRate = rate;

      console.debug('Creando empleado con payload:', empPayload);
      const empRes = await this.auth.fetchWithAuth(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(empPayload)
      });
      if (!empRes.ok) {
        const txt = await empRes.text().catch(() => '');
        throw new Error(`Error creando empleado (${empRes.status}): ${txt || empRes.statusText}`);
      }

      // Notificar a otras pestañas que se creó un empleado
      localStorage.setItem('employee-created', JSON.stringify({ ts: Date.now() }));
      // Mostrar modal de éxito
      this.showSuccessModal = true;
      setTimeout(() => {
        this.showSuccessModal = false;
        this.created.emit();
        this.cerrarModal();
      }, 1500);
    } catch (err: any) {
      console.error('Error guardando empleado:', err);
      alert(err?.message ?? 'Error al guardar los cambios.');
    }
  }
}