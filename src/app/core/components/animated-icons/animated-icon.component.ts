import { Component, Input, OnInit } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { AnimatedIconRegistry } from './animated-icon-registry.service';

@Component({
  selector: 'app-animated-icon',
  template: `
    <ng-container *ngIf="iconData; else fallback">
      <svg [attr.width]="size" [attr.height]="size" [attr.viewBox]="iconData.viewBox || '0 0 24 24'" xmlns="http://www.w3.org/2000/svg" [innerHTML]="iconSvg"></svg>
    </ng-container>
    <ng-template #fallback>
      <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"></circle>
      </svg>
    </ng-template>
  `,
  standalone: true,
  imports: [CommonModule, NgIf],
  providers: [AnimatedIconRegistry]
})
export class AnimatedIconComponent implements OnInit {
  @Input() name = '';
  @Input() size = 24;
  iconData: any = null;
  iconSvg = '';

  constructor(private registry: AnimatedIconRegistry) {}

  ngOnInit(): void {
    if (!this.name) return;
    this.iconData = this.registry.get(this.name);
    if (this.iconData) {
      // If registry provides raw svg content or paths, try to build a simple svg innerHTML
      if (this.iconData.svg) {
        this.iconSvg = this.iconData.svg;
      } else if (this.iconData.paths && Array.isArray(this.iconData.paths)) {
        this.iconSvg = this.iconData.paths.map((p: any) => `<path d="${p.d||''}" fill="${p.fill||'none'}" stroke="${p.stroke||'currentColor'}"></path>`).join('');
      }
    }
  }
}
