import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AuthStateService as ReportAuthState } from '../../pages/report-hours/auth/services/auth-state.service';

export const authGuard: CanActivateFn = (route, state): boolean | UrlTree => {
  const router = inject(Router);
  const isReport = typeof state.url === 'string' && state.url.startsWith('/report-hours');
  let isAuth = false;
  if (isReport) {
    const reportAuth = inject(ReportAuthState);
    isAuth = !!reportAuth.isAuthenticated;
  } else {
    const auth = inject(AuthService);
    isAuth = !!auth.getState().authenticated;
  }

  if (isAuth) {
    localStorage.setItem('lastRoute', state.url);
    return true;
  }
  // Si no está autenticado, guarda la ruta y redirige a login
  localStorage.setItem('lastRoute', state.url);
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
