import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-circle-help-icon',
  standalone: true,
  template: `
    <div class="circle-help" [class.animate]="animate">
      <svg xmlns="http://www.w3.org/2000/svg" [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />

        <g class="help">
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
          <path d="M12 17h.01"></path>
        </g>
      </svg>
    </div>
  `,
  styles: [
    `:host{display:inline-block;line-height:0}
    .circle-help{display:inline-flex;align-items:center;justify-content:center}
    .circle-help svg{overflow:visible}

    /* smoother, continuous tilt like the React version */
    .circle-help .help { will-change: transform; transform-origin: 12px 12px; }
    .circle-help.animate .help { animation: help-tilt 1600ms cubic-bezier(.2,1,.22,1) infinite; }

    @keyframes help-tilt {
      0% { transform: rotate(0deg); }
      20% { transform: rotate(-10deg); }
      50% { transform: rotate(10deg); }
      80% { transform: rotate(-10deg); }
      100% { transform: rotate(0deg); }
    }
    `
  ]
})
export class CircleHelpIconComponent {
  @Input() size = 30;

  // animate continuously by default (consistent with other icons)
  animate = true;

  @Output() animationStarted = new EventEmitter<void>();
  @Output() animationStopped = new EventEmitter<void>();

  startAnimation(): void {
    this.animate = true;
    this.animationStarted.emit();
  }

  stopAnimation(): void {
    this.animate = false;
    this.animationStopped.emit();
  }
}
