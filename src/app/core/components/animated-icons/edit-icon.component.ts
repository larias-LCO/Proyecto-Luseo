import { Component, EventEmitter, Input, OnInit, Output, HostListener } from '@angular/core';

@Component({
  selector: 'app-edit-icon',
  standalone: true,
  template: `
    <div class="edit-icon" [class.animate]="animate">
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
        <path d="m18 5-2.414-2.414A2 2 0 0 0 14.172 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2" class="file-path"></path>
        <path 
          d="M21.378 12.626a1 1 0 0 0-3.004-3.004l-4.01 4.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z" 
          class="pen-path">
        </path>
        <path d="M8 18h1" class="line-path">
          <animate 
            attributeName="d" 
            values="M8 18h1; M8 18h5; M8 18h1" 
            dur="1.5s" 
            repeatCount="indefinite"
            begin="0.5s">
          </animate>
        </path>
      </svg>
    </div>
  `,
  styles: [
    `:host { 
      display: inline-block; 
      line-height: 0; 
    }
    
    .edit-icon { 
      display: inline-flex; 
      align-items: center; 
      justify-content: center; 
      cursor: pointer; 
    }
    
    .edit-icon svg {
      overflow: visible;
    }
    
    .edit-icon .pen-path {
      transform-origin: 18px 11px;
      animation: penMove 1.5s ease-in-out infinite;
    }
    
    .edit-icon .file-path {
      transition: transform 0.3s ease;
    }
    
    @keyframes penMove {
      0%, 100% {
        transform: rotate(0deg) translate(0, 0);
      }
      16.66% {
        transform: rotate(-0.3deg) translate(0px, 1px);
      }
      33.33% {
        transform: rotate(0.2deg) translate(-0.5px, 0px);
      }
      50% {
        transform: rotate(-0.4deg) translate(1px, -0.5px);
      }
      66.66% {
        transform: rotate(0deg) translate(0, 0);
      }
    }
    
    @keyframes lineExpand {
      0%, 33.33%, 100% {
        d: path("M8 18h1");
      }
      66.66% {
        d: path("M8 18h5");
      }
    }
    `
  ]
})
export class EditIconComponent implements OnInit {
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
