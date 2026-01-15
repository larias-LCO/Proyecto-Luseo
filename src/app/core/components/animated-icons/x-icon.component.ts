import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

@Component({
  selector: 'app-x-icon',
  standalone: true,
  template: `
    <div class="x-icon-wrapper">
      <div class="x-icon" [class.animate]="animate" [style.color]="color">
        <svg xmlns="http://www.w3.org/2000/svg" [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path class="p1" d="M18 6 L6 18"></path>
          <path class="p2" d="M6 6 L18 18"></path>
        </svg>
      </div>
      <div class="tooltip-content">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [
    `:host{display:inline-block;line-height:0;position:relative;z-index:2600}
    .x-icon-wrapper{position:relative;display:inline-flex;align-items:center;justify-content:center;z-index:2600}
    .x-icon{display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
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
    .tooltip-content{position:absolute;top:100%;left:50%;transform:translateX(-50%) translateY(8px);opacity:0;pointer-events:none;transition:opacity 0.2s ease 0.25s;white-space:nowrap;z-index:9999}
    .x-icon-wrapper:hover .tooltip-content{opacity:1}
    `
  ]
})
export class XIconComponent {
  @Input() size = 30;
  @Input() color = 'currentColor';
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
