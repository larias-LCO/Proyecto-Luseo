import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-editar-miembro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './editar-miembro.html',
  styleUrls: ['./editar-miembro.scss'],
})
export class EditarMiembroComponent implements OnInit {
  @Input() miembro: any;           // 👈 Datos del miembro seleccionado
  @Input() catalogs: any;          // 👈 Catálogos desde la base de datos
  @Input() allowedRoles: string[] = []; // 👈 Roles permitidos (opcional)
  @Output() guardar = new EventEmitter<any>();
  @Output() cerrar = new EventEmitter<void>();

  form!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    // Esperar que el input llegue y construir el formulario
    this.form = this.fb.group({
      nombre: [this.miembro?.nombre || '', Validators.required],
      departamento: [this.miembro?.departamento || '', Validators.required],
      oficina: [this.miembro?.oficina || '', Validators.required],
      posicion: [this.miembro?.posicion || '', Validators.required],
      rol: [this.miembro?.rol || '', Validators.required],
      tarifa: [this.miembro?.tarifa || '', Validators.required],
      estado: [this.miembro?.estado || 'Activo', Validators.required],
    });
  }

  onSubmit() {
    if (this.form.valid) {
      const datosEditados = { ...this.miembro, ...this.form.value };
      this.guardar.emit(datosEditados); // 🔥 Devuelve datos al padre
    }
  }

  onCerrar() {
    this.cerrar.emit();
  }
}
