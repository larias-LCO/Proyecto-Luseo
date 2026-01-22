import { Component, Input, Output, EventEmitter } from '@angular/core';
@Component({
    selector: 'app-timer-icon',
    standalone: true,
    template: `
    <div class="timer-icon">
  <svg
    class="icon-svg"
    [attr.width]="size"
    [attr.height]="size"
    [style.width.px]="size"
    [style.height.px]="size"
    [style.flex]="'0 0 ' + size + 'px'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <!-- Botón superior -->
    <line
      x1="10"
      y1="2"
      x2="14"
      y2="2"
      class="animate-button"
    />

    <!-- Aguja -->
    <line
      x1="12"
      y1="14"
      x2="15"
      y2="11"
      class="animate-hand"
    />

    <circle cx="12" cy="14" r="8" />
  </svg>
</div>
  `,
  styles: [
    `.timer-icon {
  display: inline-flex;
  align-items: center;
  margin-left: -2px;
}

.icon-svg { display: inline-block; }

.animate-hand {
  transform-origin: 50% 50%;
  animation: handRotate 1.2s ease-in-out infinite;
}

.animate-button {
  transform-origin: 50% 50%;
  animation: buttonBounce 1.6s ease-in-out infinite alternate;
}

@keyframes handRotate {
  0% { transform: rotate(0deg); }
  25% { transform: rotate(18deg); }
  50% { transform: rotate(0deg); }
  75% { transform: rotate(-10deg); }
  100% { transform: rotate(0deg); }
}

@keyframes buttonBounce {
  0% { transform: scale(1); }
  50% { transform: scale(0.96) translateY(1px); }
  100% { transform: scale(1); }
}`
	]
})
export class TimerIconComponent {
    @Input() size: number = 33;

  // Permanent animation
  isAnimating = true;
}


    
