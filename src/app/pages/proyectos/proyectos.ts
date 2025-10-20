import { Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CrearProyectoComponent  } from '../../core/components/crear-proyecto/crear-proyecto';
import { SubmenuComponent } from '../../core/components/submenu/submenu';
import { HeaderComponent } from '../../core/components/header/header';


@Component({
  selector: 'app-proyectos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CrearProyectoComponent, SubmenuComponent, HeaderComponent],
  templateUrl: './proyectos.html',
  styleUrls: ['./proyectos.scss']
})
export class Proyectos {

}
