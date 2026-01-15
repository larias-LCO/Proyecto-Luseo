import { Component, EventEmitter, Input, OnInit, Output, HostListener } from '@angular/core';

@Component({
  selector: 'app-clock-icon',
  standalone: true,
  template: `
    <div class="clock-icon" [class.animate]="animate">
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        [attr.width]="size" 
        [attr.height]="size" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        stroke-width="2" 
        stroke-linecap="round" 
        stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" class="clock-circle"></circle>
        <polyline points="12 6 12 12 16 14" class="clock-hand"></polyline>
      </svg>
    </div>
  `,
  styles: [
    `:host { 
      display: inline-block; 
      line-height: 0; 
    }
    
    .clock-icon { 
      display: inline-flex; 
      align-items: center; 
      justify-content: center; 
      cursor: pointer; 
    }
    
    .clock-icon svg {
      overflow: visible;
    }
    
    .clock-icon .clock-circle {
      transform-origin: center;
      animation: pulseClock 3s ease-in-out infinite;
    }
    
    .clock-icon .clock-hand {
      transform-origin: 12px 12px;
      animation: rotateClock 4s cubic-bezier(0.34, 1.56, 0.64, 1) infinite;
    }
    
    @keyframes rotateClock {
      0% {
        transform: rotate(0deg);
      }
      25% {
        transform: rotate(90deg);
      }
      50% {
        transform: rotate(180deg);
      }
      75% {
        transform: rotate(270deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }
    
    @keyframes pulseClock {
      0%, 100% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.03);
        opacity: 0.9;
      }
    }
    `
  ]
})
export class ClockIconComponent implements OnInit {
  @Input() size = 28;
  animate = true;
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
    this.startAnimation(); 
  }

  @HostListener('mouseleave') _onLeave(): void { 
    this.stopAnimation(); 
  }
}
