import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParteDeHorasComponent } from '../../../pages/parte-de-horas/parte-de-horas';

@Component({
  selector: 'app-formulario',
  standalone: true, 
  imports: [CommonModule, FormsModule],
  templateUrl: './formulario.html',
  styleUrls: ['./formulario.scss']
})
export class FormularioComponent {
  proyectos: string[] = ['Proyecto A', 'Proyecto B', 'Proyecto C'];
  dias: string[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

  registros = [
    { proyecto: '', horas: [0, 0, 0, 0, 0], total: 0 }
  ];

  calcularTotal(index: number) {
    const registro = this.registros[index];
    registro.total = registro.horas.reduce((a, b) => a + Number(b || 0), 0);
  }

  agregarRegistro() {
    this.registros.push({ proyecto: '', horas: [0, 0, 0, 0, 0], total: 0 });
  }

}
