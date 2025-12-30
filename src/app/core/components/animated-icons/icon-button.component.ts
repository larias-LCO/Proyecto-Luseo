import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-icon-button',
  template: `
    <button type="button" class="icon-btn" [title]="title" (click)="onClick($event)">
      <ng-content></ng-content>
    </button>
  `,
  styles: [
    `.icon-btn { display:inline-flex; align-items:center; justify-content:center; border:none; background:transparent; padding:6px; border-radius:6px; cursor:pointer; }
     .icon-btn:active { transform: translateY(1px); }
     .icon-btn:focus { outline: 2px solid rgba(0,0,0,0.08); }
    `
  ],
  standalone: true
})
export class IconButtonComponent {
  @Input() title = '';
  @Output() clicked = new EventEmitter<MouseEvent>();

  onClick(evt: MouseEvent): void { evt.stopPropagation(); this.clicked.emit(evt); }
}
