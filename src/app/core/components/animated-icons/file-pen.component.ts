import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-file-pen-icon',
  standalone: true,
  template: `
    <div class="file-pen" [class.animate]="animate">
      <svg xmlns="http://www.w3.org/2000/svg" [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m18 5-2.414-2.414A2 2 0 0 0 14.172 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2" />

        <g class="pen">
          <path class="pen-main" d="M21.378 12.626a1 1 0 0 0-3.004-3.004l-4.01 4.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"></path>
        </g>

        <path class="small-line" [attr.d]="animate ? penAnimateD : penNormalD"></path>
      </svg>
    </div>
  `,
  styles: [
    `:host { display:inline-block; line-height:0; }
    .file-pen { display:inline-flex; align-items:center; justify-content:center; }
    .file-pen .pen { transform-origin: center; }
    .file-pen .pen-main { will-change: transform; }
    /* smoother, longer loop and return to initial state to avoid visible jump */
    .file-pen.animate .pen-main { animation: pen-move 1800ms cubic-bezier(.2,1,.22,1) infinite; }
    .file-pen .small-line { transition: d 500ms linear; stroke: currentColor; }

    @keyframes pen-move {
      0% { transform: translate(0px, 0px) rotate(0deg); }
      20% { transform: translate(-0.6px, 1px) rotate(-12deg); }
      50% { transform: translate(1px, -0.5px) rotate(10deg); }
      80% { transform: translate(-0.3px, 0.7px) rotate(-6deg); }
      100% { transform: translate(0px, 0px) rotate(0deg); }
    }
    `
  ]
})
export class FilePenIconComponent {
  @Input() size = 30;

  // visible and animating by default so it's constantly animated like x-icon
  animate = true;

  @Output() animationStarted = new EventEmitter<void>();
  @Output() animationStopped = new EventEmitter<void>();

  // small-line morph variants
  penNormalD = 'M8 18h1';
  penAnimateD = 'M8 18h5';

  startAnimation(): void {
    this.animate = true;
    this.animationStarted.emit();
  }

  stopAnimation(): void {
    this.animate = false;
    this.animationStopped.emit();
  }
}
