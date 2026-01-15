import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TeamIconComponent } from '../animated-icons/team-icon.component';
import { ClockIconComponent } from '../animated-icons/clock-icon.component';
import { CalendarIconComponent } from '../animated-icons/calendar-icon.component';
import { FileIconComponent } from '../animated-icons/file-icon.component';

@Component({
  selector: 'app-submenu',
  standalone: true,
  imports: [CommonModule, RouterLink, TeamIconComponent, ClockIconComponent, CalendarIconComponent, FileIconComponent],
  templateUrl: './submenu.html',
  styleUrls: ['./submenu.scss']
})
export class SubmenuComponent {
  collapsed = false;


isMenuOpen = false;

toggleMenu() {
  this.isMenuOpen = !this.isMenuOpen;
}


  toggle(): void {
    this.collapsed = !this.collapsed;
  }
}

