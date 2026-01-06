import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';


@Component({
  selector: 'app-submenu',
  standalone: true,
  imports: [CommonModule, RouterLink,],
  templateUrl: './submenu.html',
  styleUrls: ['./submenu.scss']
})
export class SubmenuComponent {

isMenuOpen = false;

toggleMenu() {
  this.isMenuOpen = !this.isMenuOpen;
}

}

