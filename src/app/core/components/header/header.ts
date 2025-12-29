import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { getAuthFromCookies } from '../../utils/cookie.utils';
import { AuthService as ReportApiAuthService } from '../../../pages/report-hours/auth/services/auth-api.service';
import { AuthStateService as ReportAuthState } from '../../../pages/report-hours/auth/services/auth-state.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule ],
  templateUrl: './header.html',
  styleUrls: ['./header.scss']
})
export class HeaderComponent {
  private auth = inject(AuthService);
  private cookieState = signal(getAuthFromCookies());
  private reportSession = signal<any>(null);
  private reportSub?: Subscription;
  private reportAuthRef?: ReportAuthState;

  private cookiePollId?: number;
  private reportApi = inject(ReportApiAuthService);

  constructor() {
    // subscribe to report-hours auth state (used by the login page)
    try {
      const reportAuth = inject(ReportAuthState);
      this.reportAuthRef = reportAuth;
      this.reportSub = reportAuth.session$.subscribe((s: any) => this.reportSession.set(s));
    } catch (e) {
      // ignore when report-hours auth state isn't available in this build context
    }

    // poll cookies periodically so header updates after login/logout performed by other flows
    this.cookiePollId = window.setInterval(() => {
      this.cookieState.set(getAuthFromCookies());
    }, 1000) as unknown as number;
  }

  isAuthenticated = computed(() => {
    const cookies = this.cookieState();
    const authState = this.auth.state();
    const report = this.reportSession();
    // prefer cookie flag, then report-hours session, then internal auth state
    return !!(cookies?.authenticated || report?.authenticated || authState?.authenticated);
  });

  username = computed(() => {
    const cookies = this.cookieState();
    const authState = this.auth.state();
    const report = this.reportSession();
    return (cookies?.username ?? report?.username ?? authState?.username) || '';
  });

  ngOnDestroy(): void {
    if (this.cookiePollId) {
      clearInterval(this.cookiePollId);
    }
    if (this.reportSub) {
      this.reportSub.unsubscribe();
    }
  }

  initials = computed(() => {
    const name = this.username() || 'U';
    return name
      .toString()
      .trim()
      .split(/\s+/)
      .map((p: string) => (p && p[0]) ? p[0] : '')
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  });

  logout() {
    // Call report-hours API logout if available to clear server session/cookies
    // call report-hours API logout (if configured) to clear server-side cookies/session
    try {
      this.reportApi.logout().subscribe({
        next: () => {
          try { this.reportAuthRef?.clear(); } catch {}
          this.auth.logout();
          window.location.href = '/login';
        },
        error: () => {
          try { this.reportAuthRef?.clear(); } catch {}
          this.auth.logout();
          window.location.href = '/login';
        }
      });
    } catch (e) {
      try { this.reportAuthRef?.clear(); } catch {}
      this.auth.logout();
      window.location.href = '/login';
    }
  }
}
