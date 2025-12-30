import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import './core/services/auth-sync';
import './core/services/router-accesor';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FormsModule],
  template: `<router-outlet></router-outlet>`
})
export class AppComponent {
  
}
