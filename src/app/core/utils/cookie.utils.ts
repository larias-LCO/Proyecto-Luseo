/**
 * Utilidades para manejo de cookies en el navegador.
 * Facilita la lectura de cookies establecidas por el backend.
 */

/**
 * Lee el valor de una cookie por su nombre.
 * @param name Nombre de la cookie
 * @returns El valor de la cookie o null si no existe
 */
export function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^|; )' + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[2]) : null;
}

/**
 * Obtiene el estado de autenticación desde las cookies establecidas por el backend.
 * Lee cookies no-HttpOnly que el backend establece para uso del frontend.
 */
export function getAuthFromCookies(): {
  authenticated: boolean;
  username: string | null;
  role: string | null;
  employeeId: number | null;
  tokenExpiresAt: number | null;
} {
  const authenticated = getCookie('authenticated') === 'true';
  const username = getCookie('username') || null;
  const role = getCookie('role') || null;
  const employeeIdStr = getCookie('employeeId');
  const employeeId = employeeIdStr ? parseInt(employeeIdStr, 10) : null;
  const expiresAtStr = getCookie('tokenExpiresAt');
  const tokenExpiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : null;

  return {
    authenticated,
    username,
    role,
    employeeId,
    tokenExpiresAt
  };
}
