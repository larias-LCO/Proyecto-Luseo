import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-prev-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="icon-wrapper" [style.color]="color">
      <svg
        fill="none"
        [attr.height]="size"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        [attr.strokeWidth]="strokeWidth"
        viewBox="0 0 24 24"
        [attr.width]="size"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g class="arrow-group">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </g>
        <line class="hour-hand" x1="12" x2="12" y1="12" y2="7" />
        <line class="minute-hand" x1="12" x2="16" y1="12" y2="14" />
      </svg>
    </div>
  `,
  styles: [`
    .icon-wrapper {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    svg {
      display: block;
    }

    .arrow-group {
      transform-origin: 12px 12px;
      animation: arrowRotation 2s ease-in-out infinite;
    }

    .hour-hand {
      transform-origin: 12px 12px;
      animation: hourHandRotation 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }

    .minute-hand {
      transform-origin: 12px 12px;
      animation: minuteHandRotation 2s ease-in-out infinite;
    }

    @keyframes arrowRotation {
      0%, 100% {
        transform: rotate(0deg);
      }
      50% {
        transform: rotate(-50deg);
      }
    }

    @keyframes hourHandRotation {
      0%, 100% {
        transform: rotate(0deg);
      }
      50% {
        transform: rotate(-360deg);
      }
    }

    @keyframes minuteHandRotation {
      0%, 100% {
        transform: rotate(0deg);
      }
      50% {
        transform: rotate(-45deg);
      }
    }
  `]
})
export class PrevIconComponent {
  @Input() size: number = 28;
  @Input() color: string = 'currentColor';
  @Input() strokeWidth: number = 2;
}
