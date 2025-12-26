import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthMeResponse } from '../models/auth.models';


@Injectable({ providedIn: 'root' })
export class AuthStateService {

  private state$ = new BehaviorSubject<AuthMeResponse | null>(null);
  readonly session$ = this.state$.asObservable();

  setSession(me: AuthMeResponse | null) {

    this.state$.next(me);
  }

  clear() {
    this.state$.next(null);
  }

  get isAuthenticated() {
    return !!this.state$.value?.authenticated;
  }

  get role() {
    return this.state$.value?.role ?? null;
  }

  get authorities() {
    return this.state$.value?.authorities ?? [];
  }

  get tokenExpiresAt() {
    return this.state$.value?.tokenExpiresAtMillis ?? null;
  }

  get serverTimeMillis() {
    return this.state$.value?.serverTimeMillis ?? null;
  }

  /** ✅ AQUÍ ESTÁ LA CLAVE */
  get employeeId(): number | null {
    return this.state$.value?.employeeId ?? null;
  }
}