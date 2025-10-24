import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, inject } from '@angular/core';
import { HttpInterceptorFn, provideHttpClient, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { AuthService } from './core/services/auth.service';

// Add Authorization header and common headers to all HttpClient requests
const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth?.getState?.().token || null;
  const headers: Record<string, string> = {
    'Accept': req.headers.get('Accept') || 'application/json'
  };
  if (token && !req.headers.has('Authorization')) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // Keep existing headers and add ours
  const cloned = req.clone({ setHeaders: headers, withCredentials: true });
  return next(cloned);
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    // Provide HttpClient at the root with our auth interceptor and DI-based interceptors
    provideHttpClient(
      withInterceptors([authInterceptor]),
      withInterceptorsFromDi()
    )
  ]
};
