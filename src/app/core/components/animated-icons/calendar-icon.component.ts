import { Component, EventEmitter, Input, OnInit, Output, HostListener } from '@angular/core';

@Component({
  selector: 'app-calendar-icon',
  standalone: true,
  template: `
    <div class="calendar-icon" [class.animate]="animate">
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
        <path d="M8 2v4" class="calendar-line"></path>
        <path d="M16 2v4" class="calendar-line"></path>
        <rect width="18" height="18" x="3" y="4" rx="2" class="calendar-rect"></rect>
        <path d="M3 10h18" class="calendar-divider"></path>
        <path d="m9 16 2 2 4-4" class="check-mark"></path>
      </svg>
    </div>
  `,
  styles: [
    `:host { 
      display: inline-block; 
      line-height: 0; 
    }
    
    .calendar-icon { 
      display: inline-flex; 
      align-items: center; 
      justify-content: center; 
      cursor: pointer; 
    }
    
    .calendar-icon svg {
      overflow: visible;
    }
    
    .calendar-icon .check-mark {
      stroke-dasharray: 12;
      stroke-dashoffset: 12;
      opacity: 0;
      animation: drawCheck 2.5s ease-in-out infinite;
    }
    
    .calendar-icon .calendar-rect {
      transform-origin: center;
      animation: scaleCalendar 2.5s ease-in-out infinite;
    }
    
    .calendar-icon .calendar-line {
      transform-origin: center;
      animation: bounceLines 2.5s ease-in-out infinite;
    }
    
    .calendar-icon .calendar-line:first-child {
      animation-delay: 0.1s;
    }
    
    .calendar-icon .calendar-line:nth-child(2) {
      animation-delay: 0.2s;
    }
    
    .calendar-icon .calendar-divider {
      animation: slideDivider 2.5s ease-in-out infinite;
    }
    
    @keyframes drawCheck {
      0%, 40% {
        stroke-dashoffset: 12;
        opacity: 0;
      }
      50%, 90% {
        stroke-dashoffset: 0;
        opacity: 1;
      }
      100% {
        stroke-dashoffset: 12;
        opacity: 0;
      }
    }
    
    @keyframes scaleCalendar {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.03);
      }
    }
    
    @keyframes bounceLines {
      0%, 100% {
        transform: translateY(0);
      }
      20% {
        transform: translateY(-2px);
      }
      40% {
        transform: translateY(0);
      }
    }
    
    @keyframes slideDivider {
      0%, 100% {
        transform: scaleX(1);
        opacity: 1;
      }
      50% {
        transform: scaleX(1.05);
        opacity: 0.8;
      }
    }
    `
  ]
})
export class CalendarIconComponent implements OnInit {
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
