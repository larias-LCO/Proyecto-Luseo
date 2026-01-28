import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { HttpInterceptorFn, provideHttpClient, withInterceptors, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';

// Add Authorization header and common headers to all HttpClient requests
// El navegador envía automáticamente las cookies con withCredentials: true
// El backend lee el token JWT de la cookie HttpOnly 'auth-token'
const authInterceptor: HttpInterceptorFn = (req, next) => {
  const headers: Record<string, string> = {
    'Accept': req.headers.get('Accept') || 'application/json'
  };
  
  const cloned = req.clone({ setHeaders: headers, withCredentials: true });
  return next(cloned);
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimations(),
    // Provide HttpClient at the root with our auth interceptor and DI-based interceptors
    provideHttpClient(
      withInterceptors([authInterceptor]),
      withInterceptorsFromDi()
    )
  ]
};
