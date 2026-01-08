import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { HelpPanelService } from '../../services/help-panel.service';
import { CircleHelpIconComponent } from '../../../../core/components/animated-icons/circle-help.component';

@Component({
  selector: 'app-floating-help-button',
  standalone: true,
  imports: [CommonModule, CircleHelpIconComponent],
  templateUrl: './floating-help-button.html',
  styleUrls: ['./floating-help-button.scss']
})
export class FloatingHelpButtonComponent implements OnInit, OnDestroy {
  isOpen = false;
  private subscription?: Subscription;

  constructor(private helpPanelService: HelpPanelService) {}

  ngOnInit(): void {
    // Suscribirse al estado para actualizar el estilo del botón
    this.subscription = this.helpPanelService.isOpen$.subscribe(isOpen => {
      this.isOpen = isOpen;
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  toggleHelp(): void {
    this.helpPanelService.toggle();
  }
}
