import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { CatalogsService } from '../../services/catalogs.service';
import { getAuthFromCookies } from '../../utils/cookie.utils';
import { AuthService as ReportApiAuthService } from '../../../pages/report-hours/auth/services/auth-api.service';
import { AuthStateService as ReportAuthState } from '../../../pages/report-hours/auth/services/auth-state.service';
import { Subscription } from 'rxjs';
import { SubmenuService } from '../../services/submenu.service';
import { MenuIconComponent } from "../animated-icons/menu-icon.component";
 
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, MenuIconComponent],
  templateUrl: './header.html',
  styleUrls: ['./header.scss']
})
export class HeaderComponent {

  private auth = inject(AuthService);
  private submenu = inject(SubmenuService);
  private cookieState = signal(getAuthFromCookies());
  private reportSession = signal<any>(null);
  private reportSub?: Subscription;
  private reportAuthRef?: ReportAuthState;
 
  private cookiePollId?: number;
  private reportApi = inject(ReportApiAuthService);
  private catalogs = inject(CatalogsService);
  private resolvedFullName = signal<string | null>(null);
  private lastResolvedEmployeeId?: number | null = null;
 
  constructor() {
  // ... código existente ...
  this.applySavedTheme();
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
      // try to resolve full name if needed when cookies update
      this.resolveFullNameIfNeeded();
    }, 1000) as unknown as number;
    // attempt resolution once immediately
    void this.resolveFullNameIfNeeded();
    // apply saved theme (light/dark)
    this.applySavedTheme();
  }
 
  isAuthenticated = computed(() => {
    const cookies = this.cookieState();
    const authState = this.auth.state();
    const report = this.reportSession();
    // prefer cookie flag, then report-hours session, then internal auth state
    return !!(cookies?.authenticated || report?.authenticated || authState?.authenticated);
  });
 
  username = computed(() => {
    const resolved = this.resolvedFullName();
    if (resolved && resolved.toString().trim()) return resolved;
    const cookies = this.cookieState();
    const authState = this.auth.state();
    const report = this.reportSession();
    return (cookies?.username ?? report?.username ?? authState?.username) || '';
  });

  private async resolveFullNameIfNeeded() {
    try {
      const cookies = this.cookieState();
      const authState = this.auth.state();
      const report = this.reportSession();
      const employeeId = cookies?.employeeId ?? report?.employeeId ?? authState?.employeeId ?? null;
      const name = (cookies?.username ?? report?.username ?? authState?.username) || '';

      // If name already contains a space, assume it's full name — clear cached resolved name
      if (name && name.toString().trim().split(/\s+/).length > 1) {
        this.resolvedFullName.set(null);
        this.lastResolvedEmployeeId = employeeId ?? null;
        return;
      }

      // Only attempt to fetch employees when we have an employeeId and it's changed
      if (!employeeId) {
        this.resolvedFullName.set(null);
        this.lastResolvedEmployeeId = null;
        return;
      }
      if (this.lastResolvedEmployeeId !== employeeId) {
        this.lastResolvedEmployeeId = employeeId;
        try {
          const employees = await this.catalogs.getEmployees();
          const found = Array.isArray(employees) ? employees.find((e: any) => Number(e.id) === Number(employeeId)) : null;
          if (found && found.name) this.resolvedFullName.set(String(found.name));
          else this.resolvedFullName.set(null);
        } catch (e) {
          this.resolvedFullName.set(null);
        }
      }
    } catch (e) {
      this.resolvedFullName.set(null);
    }
  }
 
  ngOnDestroy(): void {
    if (this.cookiePollId) {
      clearInterval(this.cookiePollId);
    }
    if (this.reportSub) {
      this.reportSub.unsubscribe();
    }
  }
 
  initials = computed(() => {
    // prefer a resolved full name (from employee catalog) if available
    const resolved = this.resolvedFullName();
    const name = (resolved && resolved.trim()) ? resolved : (this.username() || 'U');
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

  notificationCount = 3;
  showNotifications = false;

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
  }

  toggleSubmenu() {
    try { this.submenu.toggle(); } catch (e) { /* ignore */ }
  }

  applySavedTheme() {
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark') document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    } catch (e) {
      // ignore
    }
  }

  toggleTheme() {
    const switchTheme = () => {
      document.documentElement.classList.toggle('dark');
      const isDark = document.documentElement.classList.contains('dark');
      try { localStorage.setItem('theme', isDark ? 'dark' : 'light'); } catch (e) {}
    };

    // TypeScript may not know about startViewTransition — cast to any
    const docAny = document as any;
    if (!docAny.startViewTransition) {
      switchTheme();
      return;
    }
    docAny.startViewTransition(switchTheme);
  }


}

