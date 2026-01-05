import { Component, HostListener, Input, OnInit, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-plus-icon',
  standalone: true,
  template: `
    <div class="plus-icon" [class.animate]="animate">
      <svg xmlns="http://www.w3.org/2000/svg" [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path class="h" d="M5 12h14"></path>
        <path class="v" d="M12 5v14"></path>
      </svg>
      <span>Add another</span>
    </div>
  `,
  styles: [
    `:host{display:inline-block;line-height:0}
    .plus-icon { display:inline-flex; align-items:center; justify-content:center; }
    .plus-icon svg { transition: transform 220ms cubic-bezier(.2,1,.22,1); }
    .plus-icon.animate svg { transform: rotate(180deg); }
    `
  ]
})
export class PlusIconComponent implements OnInit {
  @Input() size = 20;
  animate = false;
  @Output() animationStarted = new EventEmitter<void>();
  @Output() animationStopped = new EventEmitter<void>();

  ngOnInit(): void {}

  startAnimation(): void { this.animate = true; this.animationStarted.emit(); }
  stopAnimation(): void { this.animate = false; this.animationStopped.emit(); }

  @HostListener('mouseenter') _onEnter(): void { this.startAnimation(); }
  @HostListener('mouseleave') _onLeave(): void { this.stopAnimation(); }
}
