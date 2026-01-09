import { Component, HostListener, Input, OnInit, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-mas-icon',
  standalone: true,
  template: `
    <div [class]="className" [class.animate]="animate">
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
        <path d="M5 12h14" />
        <path d="M12 5v14" />
      </svg>
    </div>
  `,
  styles: [
    `
    :host {
      display: inline-block;
      line-height: 0;
    }
    
    div {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    
    svg {
      transition: transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
      transform-origin: center;
    }
    
    div.animate svg {
      transform: rotate(180deg);
    }
    `
  ]
})
export class MasIconComponent implements OnInit {
  @Input() size = 28;
  @Input() className = '';
  @Input() controlled = false;  // Para uso imperativo (controlado externamente)
  
  animate = false;
  
  @Output() animationStarted = new EventEmitter<void>();
  @Output() animationStopped = new EventEmitter<void>();

  ngOnInit(): void {}

  /**
   * Inicia la animación del icono
   */
  startAnimation(): void {
    this.animate = true;
    this.animationStarted.emit();
  }

  /**
   * Detiene la animación del icono
   */
  stopAnimation(): void {
    this.animate = false;
    this.animationStopped.emit();
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    if (!this.controlled) {
      this.startAnimation();
    }
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    if (!this.controlled) {
      this.stopAnimation();
    }
  }
}
