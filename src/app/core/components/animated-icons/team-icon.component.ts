import { Component, EventEmitter, Input, OnInit, Output, HostListener } from '@angular/core';

@Component({
  selector: 'app-team-icon',
  standalone: true,
  template: `
    <div class="team-icon" [class.animate]="animate">
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
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" class="main-user-path"></path>
        <circle cx="9" cy="7" r="4" class="main-user-circle"></circle>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" class="second-user-path"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75" class="second-user-circle"></path>
      </svg>
    </div>
  `,
  styles: [
    `:host { 
      display: inline-block; 
      line-height: 0; 
    }
    
    .team-icon { 
      display: inline-flex; 
      align-items: center; 
      justify-content: center; 
      cursor: pointer; 
    }
    
    .team-icon svg {
      overflow: visible;
    }
    
    .team-icon .second-user-path,
    .team-icon .second-user-circle {
      animation: slideInUsers 2s cubic-bezier(0.34, 1.56, 0.64, 1) infinite;
    }
    
    .team-icon .second-user-circle {
      animation-delay: 0.05s;
    }
    
    .team-icon .main-user-path,
    .team-icon .main-user-circle {
      transform-origin: center;
      animation: pulseUser 2s ease-in-out infinite;
    }
    
    @keyframes slideInUsers {
      0%, 10% {
        transform: translateX(-6px);
        opacity: 0.5;
      }
      25%, 90% {
        transform: translateX(0);
        opacity: 1;
      }
      100% {
        transform: translateX(-6px);
        opacity: 0.5;
      }
    }
    
    @keyframes pulseUser {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.02);
      }
    }
    `
  ]
})
export class TeamIconComponent implements OnInit {
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
