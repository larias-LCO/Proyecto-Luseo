import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-sun-icon',
  standalone: true,
  template: `
    <div class="sun" [class.animate]="animate">
      <svg xmlns="http://www.w3.org/2000/svg" [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24" fill="none" [attr.stroke]="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <g class="rays">
          <path class="ray" d="M12 2v2"></path>
          <path class="ray" d="M12 20v2"></path>
          <path class="ray" d="M4.93 4.93l1.41 1.41"></path>
          <path class="ray" d="M17.66 17.66l1.41 1.41"></path>
          <path class="ray" d="M2 12h2"></path>
          <path class="ray" d="M20 12h2"></path>
          <path class="ray" d="M4.93 19.07l1.41-1.41"></path>
          <path class="ray" d="M17.66 6.34l1.41-1.41"></path>
        </g>

        <circle class="core" cx="12" cy="12" r="4"></circle>
      </svg>
    </div>
  `,
  styles: [
    `:host{display:inline-block;line-height:0}
    .sun{display:inline-flex;align-items:center;justify-content:center}
    .sun svg{overflow:visible}

    /* performance hint */
    .sun .ray, .sun .core { will-change: transform, opacity; transform-origin: 12px 12px; }

    /* rays rotate slowly */
    .sun.animate .rays { animation: rays-rotate 6000ms linear infinite; transform-origin: 12px 12px; }

    /* core subtle pulse */
    .sun.animate .core { animation: core-pulse 1800ms ease-in-out infinite; }

    @keyframes rays-rotate {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @keyframes core-pulse {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(0.92); opacity: 0.95; }
      100% { transform: scale(1); opacity: 1; }
    }
    `
  ]
})
export class SunIconComponent {
	@Input() size = 30;
    @Input() color = 'currentColor';
    

  animate = true; // animate continuously by default

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
