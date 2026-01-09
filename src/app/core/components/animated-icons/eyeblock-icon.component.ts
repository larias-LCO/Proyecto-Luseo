import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-eyeblock-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="eyeblock-icon" [class.animate]="animate">
      <svg 
        xmlns="http://www.w3.org/2000/svg"
        [attr.width]="size" 
        [attr.height]="size" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        stroke-width="2" 
        stroke-linecap="round" 
        stroke-linejoin="round"
      >
        <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
        <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
        <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
        <path 
          class="slash-line" 
          d="m2 2 20 20"
          [style.stroke-dasharray]="slashDashArray"
          [style.stroke-dashoffset]="slashDashOffset"
          [style.opacity]="slashOpacity"
        />
      </svg>
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
      line-height: 0;
    }
    
    .eyeblock-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    
    .eyeblock-icon svg {
      overflow: visible;
    }
    
    .eyeblock-icon .slash-line {
      transition: stroke-dashoffset 0.6s ease, opacity 0.6s ease;
    }
    
    .eyeblock-icon.animate .slash-line {
      stroke-dashoffset: 0 !important;
      opacity: 1 !important;
    }
  `]
})
export class EyeblockIconComponent {
  @Input() size = 28;
  @Output() animationStarted = new EventEmitter<void>();
  @Output() animationStopped = new EventEmitter<void>();

  animate = false;

  // Valores para la animación del path
  private pathLength = 28.28; // Longitud aproximada de la línea diagonal (sqrt(20^2 + 20^2))

  get slashDashArray(): string {
    return `${this.pathLength * 2}`;
  }

  get slashDashOffset(): number {
    return this.animate ? 0 : this.pathLength * 2;
  }

  get slashOpacity(): number {
    return this.animate ? 1 : 0;
  }

  startAnimation(): void {
    this.animate = true;
    this.animationStarted.emit();
  }

  stopAnimation(): void {
    this.animate = false;
    this.animationStopped.emit();
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    this.startAnimation();
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.stopAnimation();
  }
}
