import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // 👈 necesario para *ngIf, *ngFor
import { FormsModule } from '@angular/forms';
import { FormularioComponent } from '../../core/components/formulario/formulario';
import { CalendarioComponent } from '../../core/components/calendario/calendario';
import { HeaderComponent } from "../../core/components/header/header";

@Component({
  selector: 'app-parte-de-horas',
  standalone: true, 
  imports: [CommonModule, FormsModule],
  templateUrl: './parte-de-horas.html',
  styleUrls: ['./parte-de-horas.scss']
})
export class ParteDeHorasComponent {
  vistaActual: 'formulario' | 'calendario' = 'formulario';
  mostrarCalendarioMini = false;

  cambiarVista(vista: 'formulario' | 'calendario') {
    this.vistaActual = vista;
  }

  toggleCalendarioMini() {
    this.mostrarCalendarioMini = !this.mostrarCalendarioMini;
  }
}