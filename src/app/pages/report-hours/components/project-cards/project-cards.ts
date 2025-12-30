import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { Project } from '../../models/project.model';
import { mapProjectToCard, ProjectCardVM } from '../../utils/mappers/project.mapper';

@Component({
  selector: 'app-project-cards',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor],
  templateUrl: './project-cards.html',
  styleUrls: ['./project-cards.scss']
})
export class ProjectCards {
  @Input() projects: Project[] = [];
  @Output() cardClick = new EventEmitter<number>();
  @Output() cardRightClick = new EventEmitter<number>();

  get cards(): ProjectCardVM[] {
    return this.projects.map(mapProjectToCard);
  }

  private _lastEmitAt = 0;
  private _lastEmitId?: number;

  private _shouldEmit(id: number): boolean {
    const now = Date.now();
    if (this._lastEmitId === id && (now - this._lastEmitAt) < 300) return false;
    this._lastEmitAt = now; this._lastEmitId = id; return true;
  }

  onCardClick(id: number) {
    if (!this._shouldEmit(id)) return;
    try { console.debug('[ProjectCards] onCardClick', id); } catch (e) {}
    this.cardClick.emit(id);
  }

  onCardPointerDown(ev: PointerEvent | MouseEvent | any, id: number) {
    try {
      const button = (ev && typeof ev.button === 'number') ? ev.button : 0;
      // diagnostic: log topmost element at pointer location to detect overlays
      try {
        const x = (ev && typeof ev.clientX === 'number') ? ev.clientX : null;
        const y = (ev && typeof ev.clientY === 'number') ? ev.clientY : null;
        if (x !== null && y !== null) {
          try {
            const top = document.elementFromPoint(x, y) as HTMLElement | null;
            console.debug('[ProjectCards] elementFromPoint', { x, y, top: top ? (top.tagName + (top.className ? ' .' + top.className : '')) : null });
          } catch (e) {}
        }
      } catch (e) {}

      if (button === 0) {
        if (this._shouldEmit(id)) {
          try { console.debug('[ProjectCards] onCardPointerDown (left)', id); } catch (e) {}
          this.cardClick.emit(id);
        }
      }
    } catch (e) {}
  }

  onCardRightClick(ev: MouseEvent, id: number) {
    try { ev.preventDefault(); } catch (e) {}
    if (!this._shouldEmit(id)) return;
    try { console.debug('[ProjectCards] onCardRightClick', id); } catch (e) {}
    this.cardRightClick.emit(id);
  }
}