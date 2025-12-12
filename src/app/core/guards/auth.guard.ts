import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const isAuth = auth.getState().authenticated;
  if (isAuth) {
    // Guarda la última ruta visitada en localStorage
    localStorage.setItem('lastRoute', state.url);
    return true;
  }
  // Si no está autenticado, guarda la ruta y redirige a login
  localStorage.setItem('lastRoute', state.url);
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
