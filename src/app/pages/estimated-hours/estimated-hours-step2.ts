import { Component, AfterViewInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HeaderComponent } from "../../core/components/header/header";
import { SubmenuComponent } from "../../core/components/submenu/submenu";
import { SubmenuService } from '../../core/services/submenu.service';
import { CapacityCalendar } from './components/capacity-calendar/capacity-calendar';

@Component({
  selector: 'app-estimated-hours-step2',
  standalone: true,
  imports: [CommonModule, HeaderComponent, SubmenuComponent, CapacityCalendar],
  template: `
    <app-header></app-header>
    <app-submenu class="menu" [class.open]="submenu.open$ | async"></app-submenu>

    <div class="estimated-layout blank-page">
      <div class="estimated-container">
        <app-capacity-calendar #capacity></app-capacity-calendar>

        <div class="back-button-container">
          <button class="atras"  (click)="back()">
 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-arrow-left"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l14 0" /><path d="M5 12l6 6" /><path d="M5 12l6 -6" /></svg>
  <div class="text2">
    Back
  </div>
</button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./estimated-hours-step2.scss']
})
export class EstimatedHoursStep2Page {
  constructor(private router: Router) {}

  public submenu = inject(SubmenuService);

  @ViewChild('capacity') capacity!: CapacityCalendar;

  isMenuOpen = false;

toggleMenu() {
  this.isMenuOpen = !this.isMenuOpen;
}


  back() {
    this.router.navigate(['estimated-hours']);
  }
  
  ngAfterViewInit(): void {
    // Leer estado pasado desde paso 1 (Tabla 1)
    try {
      const nav = (this.router as any).getCurrentNavigation && (this.router as any).getCurrentNavigation();
      const state = nav && nav.extras && nav.extras.state ? nav.extras.state : (history && (history.state as any)) || null;
      const tableRows = state ? state.tableRows : null;
     
      if (tableRows && this.capacity && typeof this.capacity.syncWithTable1 === 'function') {
        // Normalizar payload: convertir name -> roleName y roleLimit
        const payload = (tableRows || []).map((r: any) => ({ roleName: r.name || r.roleName || r.userName || '', roleLimit: r.roleLimit }));
       
        this.capacity.syncWithTable1(payload);
      }
    } catch (e) { /* ignore */ }
  }
}
