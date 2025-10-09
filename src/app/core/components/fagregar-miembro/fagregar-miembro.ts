import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-fagregar-miembro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './fagregar-miembro.html',
  styleUrls: ['./fagregar-miembro.scss']
})
export class FagregarMiembroComponent {
  mostrarModal = false;
  paso = 1;
  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      departamento: ['', Validators.required],
      oficina: ['', Validators.required],
      posicion: ['', Validators.required],
      rol: ['', Validators.required],
      tarifa: ['', [Validators.required, Validators.min(0)]],
      usuario: ['', Validators.required],
      correo: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  abrirModal() {
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
    rol: '',
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

  agregar() {
    if (this.form.valid) {
      console.log('✅ Datos listos para enviar:', this.form.value);
      this.cerrarModal();
    } else {
      this.form
   }
  }
}