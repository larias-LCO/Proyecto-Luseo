import { Component, EventEmitter, Input, OnInit, Output, HostListener } from '@angular/core';

@Component({
  selector: 'app-file-check-icon',
  standalone: true,
  template: `
    <div class="file-check" [class.animate]="animate">
      <svg xmlns="http://www.w3.org/2000/svg" [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2v4a2 2 0 0 0 2 2h4" class="file-top"></path>
        <path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4" class="file-body"></path>
        <path class="check" d="m3 15 2 2 4-4"></path>
      </svg>
    </div>
  `,
  styles: [
    `:host { display:inline-block; line-height:0; }
    .file-check { display:inline-flex; align-items:center; justify-content:center; cursor:pointer; }
    .file-check .check { stroke-dasharray: 24; stroke-dashoffset: 24; opacity: 0; transition: stroke-dashoffset 360ms ease, opacity 360ms ease; }
    .file-check.animate .check { stroke-dashoffset: 0; opacity: 1; }
    .file-check .file-top, .file-check .file-body { transition: transform 220ms cubic-bezier(.2,1,.22,1); transform-origin:center; }
    .file-check.animate .file-top { transform: translateY(-4px); }
    `
  ]
})
export class FileCheckIconComponent implements OnInit {
  @Input() size = 28;
  animate = false;
  @Output() animationStarted = new EventEmitter<void>();
  @Output() animationStopped = new EventEmitter<void>();

  ngOnInit(): void {}

  startAnimation(): void { this.animate = true; this.animationStarted.emit(); }
  stopAnimation(): void { this.animate = false; this.animationStopped.emit(); }

  @HostListener('mouseenter') _onEnter(): void { this.startAnimation(); }
  @HostListener('mouseleave') _onLeave(): void { this.stopAnimation(); }
}
