import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule ],
  templateUrl: './header.html',
  styleUrls: ['./header.scss']
})
export class HeaderComponent {
  private auth = inject(AuthService);
  isAuthenticated = computed(() => this.auth.state().authenticated);
  username = computed(() => this.auth.state().username || '');

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
    this.auth.logout();
    // Optional: redirect to login
    window.location.href = '/login';
  }
}

  notificationCount = 3;
showNotifications = false;

toggleNotifications() {
  this.showNotifications = !this.showNotifications;
}

}