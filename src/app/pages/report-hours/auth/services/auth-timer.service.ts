import { Injectable } from '@angular/core';
import { AuthService } from './auth-api.service';
import { AuthStateService } from './auth-state.service';

@Injectable({ providedIn: 'root' })
export class AuthTimerService {

  private lastActivity = Date.now();
  private intervalId?: number;

  private readonly CHECK_INTERVAL = 2 * 60 * 1000; // 2 min
  private readonly MIN_ACTIVITY_FOR_REFRESH = 15 * 60 * 1000; // 15 min
  private readonly REFRESH_BEFORE_EXPIRY = 5 * 60 * 1000; // 5 min

  constructor(
    private auth: AuthService,
    private authState: AuthStateService
  ) {}

  start() {
    this.registerActivityListeners();

    this.intervalId = window.setInterval(() => {
      this.checkSession();
    }, this.CHECK_INTERVAL);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
  private registerActivityListeners() {

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'focus'];
    events.forEach(e =>
        window.addEventListener(e, () => this.lastActivity = Date.now(), { passive: true })
      );
    }

    private checkSession() {
    const expiresAt = this.authState.tokenExpiresAt;
    const serverTime = this.authState.serverTimeMillis;

    if (!expiresAt || !serverTime) return;

    const now = Date.now();
    const timeUntilExpiry = expiresAt - (now + (serverTime - now));
    const inactivity = now - this.lastActivity;

    if (
      timeUntilExpiry < this.REFRESH_BEFORE_EXPIRY &&
      inactivity < this.MIN_ACTIVITY_FOR_REFRESH
    ) {
      this.auth.refresh().subscribe({
        next: () => this.auth.me().subscribe(), // me() ya actualiza estado
        error: () => this.auth.logout().subscribe()
      });
    }
  }
}