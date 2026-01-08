import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

@Component({
  selector: 'app-x-icon',
  standalone: true,
  template: `
    <div class="x-icon" [class.animate]="animate">
      <svg xmlns="http://www.w3.org/2000/svg" [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path class="p1" d="M18 6 L6 18"></path>
        <path class="p2" d="M6 6 L18 18"></path>
      </svg>
    </div>
  `,
  styles: [
    `:host{display:inline-block;line-height:0}
    .x-icon{display:inline-flex;align-items:center;justify-content:center}
    .x-icon svg{overflow:visible}
    .x-icon .p1,.x-icon .p2{stroke-dasharray:24;stroke-dashoffset:24;opacity:0}
    @keyframes x-draw {
      0% { stroke-dashoffset:24; opacity:0 }
      30% { stroke-dashoffset:0; opacity:1 }
      70% { stroke-dashoffset:0; opacity:1 }
      100% { stroke-dashoffset:24; opacity:0 }
    }
    .x-icon.animate .p1{ animation: x-draw 2000ms linear infinite }
    .x-icon.animate .p2{ animation: x-draw 2000ms linear infinite 200ms }
    `
  ]
})
export class XIconComponent {
  @Input() size = 30;
  // visible and animating by default so users can locate the close control without hovering
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
