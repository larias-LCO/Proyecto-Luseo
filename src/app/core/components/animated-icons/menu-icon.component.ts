import { Component, HostListener, Input, OnInit, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-menu-icon',
  standalone: true,
  template: `
    <div class="menu-icon" [class.animate]="animate">
      <svg
        fill="none"
        [attr.height]="size"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        [attr.stroke-width]="2.5"
        viewBox="0 0 24 24"
        [attr.width]="size"
        xmlns="http://www.w3.org/2000/svg"
      >
        <line class="line-1" x1="3" x2="21" y1="6" y2="6"></line>
        <line class="line-2" x1="3" x2="21" y1="12" y2="12"></line>
        <line class="line-3" x1="3" x2="21" y1="18" y2="18"></line>
      </svg>
    </div>
  `,
  styles: [
    `
    :host {
      display: inline-block;
      line-height: 0;
      cursor: pointer;
    }
    
    .menu-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #001dbe;
    }

    .menu-icon:focus{
        outline: none;
        box-shadow: 0 0 0 2px #001dbe;
        border: 2px solid #001dbe;
    }
    
    .menu-icon svg line {
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                  opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      transform-origin: center;
    }
    
    /* Estado animado - transforma las líneas en X */
    .menu-icon.animate .line-1 {
      transform: translateY(5px) rotate(40deg);
    }
    
    .menu-icon.animate .line-2 {
      opacity: 0;
    }
    
    .menu-icon.animate .line-3 {
      transform: translateY(-5px) rotate(-45deg);
    }
    `
  ]
})
export class MenuIconComponent implements OnInit {
  @Input() size = 35;
  @Input() controlled = false; // Si es true, no responde a hover automáticamente
  animate = false;
  
  @Output() animationStarted = new EventEmitter<void>();
  @Output() animationStopped = new EventEmitter<void>();

  ngOnInit(): void {}

  startAnimation(): void { 
    this.animate = true; 
    this.animationStarted.emit(); 
  }
  
  stopAnimation(): void { 
    this.animate = false; 
    this.animationStopped.emit(); 
  }

  @HostListener('mouseenter') _onEnter(): void { 
    if (!this.controlled) {
      this.startAnimation(); 
    }
  }
  
  @HostListener('mouseleave') _onLeave(): void { 
    if (!this.controlled) {
      this.stopAnimation(); 
    }
  }
}
