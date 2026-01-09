import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { Subscription } from 'rxjs';

import { HelpPanelService } from '../../services/help-panel.service';
import { HelpContent } from '../../models/help-content.model';
import { XIconComponent } from '../../../../core/components/animated-icons/x-icon.component';
import { CircleHelpIconComponent } from '../../../../core/components/animated-icons/circle-help.component';

@Component({
  selector: 'app-help-panel',
  standalone: true,
  imports: [CommonModule, XIconComponent, CircleHelpIconComponent, NgIf],
  templateUrl: './help-panel.html',
  styleUrls: ['./help-panel.scss']
})
export class HelpPanelComponent implements OnInit, OnDestroy, AfterViewInit {
  isOpen = false;
  content: HelpContent | null = null;

  @ViewChild('xIcon') xIcon?: XIconComponent;

  private subscriptions = new Subscription();

  constructor(private helpPanelService: HelpPanelService) {}

  ngOnInit(): void {
    // Suscribirse al estado del panel
    this.subscriptions.add(
      this.helpPanelService.isOpen$.subscribe(isOpen => {
        this.isOpen = isOpen;
      })
    );

    // Suscribirse al contenido del panel
    this.subscriptions.add(
      this.helpPanelService.content$.subscribe(content => {
        this.content = content;
      })
    );
  }

  ngAfterViewInit(): void {
    // Desactivar la animación del icono X para que sea visible estático
    if (this.xIcon) {
      this.xIcon.stopAnimation();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  close(): void {
    this.helpPanelService.close();
  }
}
