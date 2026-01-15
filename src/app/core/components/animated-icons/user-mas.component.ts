import { Component, EventEmitter, Input, OnInit, Output, HostListener } from '@angular/core';

@Component({
  selector: 'app-user-mas-icon',
  standalone: true,
  template: `
    <div class="user-mas-icon" [class.animate]="animate">
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
        <path d="M2 21a8 8 0 0 1 13.292-6" class="user-path"></path>
        <circle cx="10" cy="8" r="5" class="user-circle"></circle>
        <path d="M19 16v6" class="vertical-bar"></path>
        <path d="M22 19h-6" class="horizontal-bar"></path>
      </svg>
    </div>
  `,
  styles: [
    `:host { 
      display: inline-block; 
      line-height: 0; 
    }
    
    .user-mas-icon { 
      display: inline-flex; 
      align-items: center; 
      justify-content: center; 
      cursor: pointer; 
    }
    
    .user-mas-icon .vertical-bar {
      stroke-dasharray: 6;
      animation: drawVerticalBar 2s ease-in-out infinite;
    }
    
    .user-mas-icon .horizontal-bar {
      stroke-dasharray: 6;
      animation: drawHorizontalBar 2s ease-in-out infinite;
    }
    
    .user-mas-icon .user-path,
    .user-mas-icon .user-circle {
      animation: pulse 2s ease-in-out infinite;
      transform-origin: center;
    }
    
    @keyframes drawVerticalBar {
      0%, 15% {
        stroke-dashoffset: 6;
        opacity: 0;
      }
      30%, 85% {
        stroke-dashoffset: 0;
        opacity: 1;
      }
      100% {
        stroke-dashoffset: 6;
        opacity: 0;
      }
    }
    
    @keyframes drawHorizontalBar {
      0%, 45% {
        stroke-dashoffset: 6;
        opacity: 0;
      }
      60%, 85% {
        stroke-dashoffset: 0;
        opacity: 1;
      }
      100% {
        stroke-dashoffset: 6;
        opacity: 0;
      }
    }
    
    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.05);
      }
    }
    `
  ]
})
export class UserMasIconComponent implements OnInit {
  @Input() size = 28;
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
    this.startAnimation(); 
  }

  @HostListener('mouseleave') _onLeave(): void { 
    this.stopAnimation(); 
  }
}
