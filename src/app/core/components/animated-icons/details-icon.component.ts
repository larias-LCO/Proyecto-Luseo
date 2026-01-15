import { Component, EventEmitter, Input, OnInit, Output, HostListener } from '@angular/core';

@Component({
  selector: 'app-details-icon',
  standalone: true,
  template: `
    <div class="details-icon" [class.animate]="animate">
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
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" class="file-body"></path>
        <path d="M14 2v4a2 2 0 0 0 2 2h4" class="file-corner"></path>
        <path d="M10 9H8" class="text-line line-1"></path>
        <path d="M16 13H8" class="text-line line-2"></path>
        <path d="M16 17H8" class="text-line line-3"></path>
      </svg>
    </div>
  `,
  styles: [
    `:host { 
      display: inline-block; 
      line-height: 0; 
    }
    
    .details-icon { 
      display: inline-flex; 
      align-items: center; 
      justify-content: center; 
      cursor: pointer; 
    }
    
    .details-icon svg {
      overflow: visible;
      animation: scaleFile 3s ease-in-out infinite;
    }
    
    .details-icon .file-body,
    .details-icon .file-corner {
      transform-origin: center;
    }
    
    .details-icon .text-line {
      stroke-dasharray: 10;
      stroke-dashoffset: 0;
    }
    
    .details-icon .line-1 {
      animation: writeLine 3s ease-in-out infinite;
    }
    
    .details-icon .line-2 {
      animation: writeLine 3s ease-in-out infinite 0.3s;
    }
    
    .details-icon .line-3 {
      animation: writeLine 3s ease-in-out infinite 0.6s;
    }
    
    @keyframes scaleFile {
      0%, 100% {
        transform: scale(1);
      }
      10%, 90% {
        transform: scale(1.05);
      }
    }
    
    @keyframes writeLine {
      0%, 20% {
        stroke-dashoffset: 0;
      }
      35% {
        stroke-dashoffset: 10;
      }
      50%, 100% {
        stroke-dashoffset: 0;
      }
    }
    `
  ]
})
export class DetailsIconComponent implements OnInit {
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
