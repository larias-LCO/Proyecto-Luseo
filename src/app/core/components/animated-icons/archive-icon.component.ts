import { Component, Input, OnInit, Output, EventEmitter, HostListener } from '@angular/core';

@Component({
  selector: 'app-archive-icon',
  standalone: true,
  template: `
    <div class="archive-icon" [class.animate]="animate" (mouseenter)="onMouseEnter()" (mouseleave)="onMouseLeave()">
      <svg xmlns="http://www.w3.org/2000/svg" [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <g class="lid" [attr.transform]="lidTransform">
          <path d="M3 6h18"></path>
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
        </g>

        <path class="main" [attr.d]="mainPathD"></path>

        <line x1="10" x2="10" [attr.y1]="line1Y1" [attr.y2]="line1Y2"></line>
        <line x1="14" x2="14" [attr.y1]="line2Y1" [attr.y2]="line2Y2"></line>
      </svg>
    </div>
  `,
  styles: [
    `:host { display:inline-block; line-height:0; }
    .archive-icon { display:inline-flex; align-items:center; justify-content:center; cursor:pointer; }
    .archive-icon .lid { transition: transform 220ms cubic-bezier(.2,1,.22,1); transform-origin:center; }
    .archive-icon.animate .lid { transform: translateY(-1.1px); }
    .archive-icon .main { transition: d 200ms linear; }
    .archive-icon line { transition: all 200ms linear; stroke: currentColor; }
    `
  ]
})
export class ArchiveIconComponent implements OnInit {
  @Input() size = 28;
  // public flag so template can read it
  animate = false;
  @Output() animationStarted = new EventEmitter<void>();
  @Output() animationStopped = new EventEmitter<void>();

  // variants
  lidNormal = 0; // translateY px
  lidAnimate = -1.1;

  mainNormal = 'M19 8v12c0 1-1 2-2 2H7c-1 0-2-1-2-2V8';
  mainAnimate = 'M19 9v12c0 1-1 2-2 2H7c-1 0-2-1-2-2V9';

  lineNormal = { y1: 11, y2: 17 };
  lineAnimate = { y1: 11.5, y2: 17.5 };

  get lidTransform(): string {
    return `translate(0 ${this.animate ? this.lidAnimate : this.lidNormal})`;
  }

  get mainPathD(): string { return this.animate ? this.mainAnimate : this.mainNormal; }
  get line1Y1(): number { return this.animate ? this.lineAnimate.y1 : this.lineNormal.y1; }
  get line1Y2(): number { return this.animate ? this.lineAnimate.y2 : this.lineNormal.y2; }
  get line2Y1(): number { return this.animate ? this.lineAnimate.y1 : this.lineNormal.y1; }
  get line2Y2(): number { return this.animate ? this.lineAnimate.y2 : this.lineNormal.y2; }

  ngOnInit(): void {}

  startAnimation(): void { this.animate = true; this.animationStarted.emit(); }
  stopAnimation(): void { this.animate = false; this.animationStopped.emit(); }

  @HostListener('mouseenter') onMouseEnter(): void { this.startAnimation(); }
  @HostListener('mouseleave') onMouseLeave(): void { this.stopAnimation(); }
}
