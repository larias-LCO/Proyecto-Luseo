import { Component, computed, inject } from '@angular/core';
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
    const name = this.username() || 'U';
    return name
      .toString()
      .trim()
      .split(/\s+/)
      .map(p => p?.[0] || '')
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
