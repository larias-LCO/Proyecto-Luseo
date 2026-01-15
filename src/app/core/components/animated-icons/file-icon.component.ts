import { Component, EventEmitter, Input, OnInit, Output, HostListener } from '@angular/core';

@Component({
  selector: 'app-file-icon',
  standalone: true,
  template: `
    <div class="file-icon" [class.animate]="animate">
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
        <path 
          d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" 
          class="folder-path">
        </path>
      </svg>
    </div>
  `,
  styles: [
    `:host { 
      display: inline-block; 
      line-height: 0; 
    }
    
    .file-icon { 
      display: inline-flex; 
      align-items: center; 
      justify-content: center; 
      cursor: pointer; 
    }
    
    .file-icon svg {
      overflow: visible;
    }
    
    .file-icon .folder-path {
      transform-origin: 12px 12px;
      animation: wiggleFolder 2s ease-in-out infinite;
    }
    
    @keyframes wiggleFolder {
      0%, 100% {
        transform: rotate(0deg);
      }
      20% {
        transform: rotate(-8deg);
      }
      40% {
        transform: rotate(6deg);
      }
      60% {
        transform: rotate(-4deg);
      }
      80% {
        transform: rotate(0deg);
      }
    }
    `
  ]
})
export class FileIconComponent implements OnInit {
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
