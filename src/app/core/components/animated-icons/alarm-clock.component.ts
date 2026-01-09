import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-alarm-clock-icon',
  standalone: true,
  template: `
    <div class="alarm" [class.animate]="animate">
      <svg xmlns="http://www.w3.org/2000/svg" [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <g class="bells">
          <path class="bell bell-left" d="M6 2L2.253 5.311"></path>
          <path class="bell bell-right" d="M18 2L21.747 5.311"></path>
        </g>

        <path class="clock-body" d="M21 13C21 17.968 16.968 22 12 22C7.032 22 3 17.968 3 13C3 8.032 7.032 4 12 4C16.968 4 21 8.032 21 13Z"></path>

        <path class="hand" d="M12 8v5"></path>
        <circle class="center" cx="12" cy="13" r="0.5" />
      </svg>
    </div>
  `,
  styles: [
    `:host{display:inline-block;line-height:0}
    .alarm{display:inline-flex;align-items:center;justify-content:center}
    .alarm svg{overflow:visible}

    /* performance hint */
    .alarm .clock-body, .alarm .bell, .alarm .hand { will-change: transform, opacity; }

    /* default: constantly animated (like x-icon/file-pen) */
    .alarm.animate .clock-body { animation: alarm-bob 1800ms cubic-bezier(.2,1,.22,1) infinite; }

    .alarm .bell { transform-origin: center; }
    .alarm.animate .bell-left { transform-origin: 5px 4px; animation: bell-shake 1200ms ease-in-out infinite; }
    .alarm.animate .bell-right { transform-origin: 19px 4px; animation: bell-shake 1200ms ease-in-out infinite 120ms; }

    .alarm .hand { transform-origin: 12px 13px; animation: hand-tick 2000ms linear infinite; }

    @keyframes bell-shake {
      0% { transform: rotate(0deg); }
      20% { transform: rotate(-18deg); }
      50% { transform: rotate(12deg); }
      80% { transform: rotate(-6deg); }
      100% { transform: rotate(0deg); }
    }

    @keyframes alarm-bob {
      0% { transform: translateY(0px); }
      25% { transform: translateY(-1.2px); }
      50% { transform: translateY(1px); }
      75% { transform: translateY(-0.6px); }
      100% { transform: translateY(0px); }
    }

    @keyframes hand-tick {
      0% { transform: rotate(0deg); }
      25% { transform: rotate(90deg); }
      50% { transform: rotate(180deg); }
      75% { transform: rotate(270deg); }
      100% { transform: rotate(360deg); }
    }

    `
  ]
})
export class AlarmClockIconComponent {
  @Input() size = 30;

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
