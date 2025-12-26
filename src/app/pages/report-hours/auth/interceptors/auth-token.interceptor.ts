import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Interceptor para agregar el token JWT a todas las peticiones HTTP.
 * El token se almacena en localStorage después del login.
 */
export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  // Obtener el token almacenado
  const token = localStorage.getItem('auth.token');
  
  // Si existe token y la petición es a la API, agregar header Authorization
  if (token && (req.url.includes('api-pruebas.luseoeng.com') || req.url.includes('/auth/'))) {
    const clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(clonedReq);
  }
  
  return next(req);
};
