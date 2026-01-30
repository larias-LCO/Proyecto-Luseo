/**
 * Utilidades para manipulación de colores
 */

/**
 * Oscurece un color hexadecimal en un porcentaje dado
 */
export function darkenColor(hex: string, percent: number): string {
  // Remover el # si existe
  hex = hex.replace('#', '');
  
  // Convertir a RGB
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);
  
  // Oscurecer
  r = Math.max(0, Math.floor(r * (1 - percent / 100)));
  g = Math.max(0, Math.floor(g * (1 - percent / 100)));
  b = Math.max(0, Math.floor(b * (1 - percent / 100)));
  
  // Convertir de vuelta a hex
  const toHex = (n: number) => {
    const hex = n.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Determina si debe usar texto blanco o negro basado en el brillo del fondo
 * Usa el algoritmo YIQ para calcular la luminancia percibida
 */
export function getContrastColor(hex: string): string {
  // Remover el # si existe
  hex = hex.replace('#', '');
  
  // Convertir a RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Calcular luminancia YIQ
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  
  // Si el fondo es oscuro, usar texto blanco; si es claro, usar texto negro
  return yiq >= 128 ? '#000000' : '#ffffff';
}

/**
 * Escapa caracteres HTML para prevenir XSS
 */
export function escapeHtml(text: string): string {
  if (!text) return '';
  
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  
  return text.replace(/[&<>"']/g, m => map[m]);
}