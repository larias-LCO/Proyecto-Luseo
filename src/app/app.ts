import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SubmenuComponent } from './core/components/submenu/submenu'; // 👈 agrega RouterLink
import { ParteDeHorasComponent } from "./pages/parte-de-horas/parte-de-horas"; // 👈 importante
import { HeaderComponent } from './core/components/header/header';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FormsModule, SubmenuComponent, HeaderComponent], //agregar aquí
  templateUrl: './app.html', // ✅ coma antes de la siguiente propiedad
  styleUrls: ['./app.scss']
})
export class App {
  protected readonly title = signal('Proyecto-Luseo');
}