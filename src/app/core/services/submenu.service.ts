import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SubmenuService {
  private openSubject = new BehaviorSubject<boolean>(false);
  open$ = this.openSubject.asObservable();

  toggle() {
    this.openSubject.next(!this.openSubject.value);
  }

  open() { this.openSubject.next(true); }
  close() { this.openSubject.next(false); }
  set(value: boolean) { this.openSubject.next(!!value); }
}
