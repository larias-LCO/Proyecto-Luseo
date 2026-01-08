/**
 * Utilidades para conversión de tiempo entre horas/minutos y decimales
 * 
 * Uso:
 * - UI muestra tiempos como campos separados de horas y minutos (duración)
 * - Backend trabaja con horas en formato decimal
 * 
 * Estas funciones facilitan la conversión bidireccional manteniendo
 * la precisión necesaria para el tracking de tiempo trabajado.
 */

/**
 * Convierte horas y minutos separados a horas decimales
 * 
 * @param hours - Número de horas (ej: 2, 8)
 * @param minutes - Número de minutos (ej: 30, 15)
 * @returns Horas en formato decimal (ej: 2.5, 8.25)
 * 
 * @example
 * hoursMinutesToDecimal(0, 45); // 0.75
 * hoursMinutesToDecimal(2, 15); // 2.25
 * hoursMinutesToDecimal(8, 0);  // 8
 */
export function hoursMinutesToDecimal(
  hours: number | null | undefined,
  minutes: number | null | undefined
): number {
  const h = hours ?? 0;
  const m = minutes ?? 0;

  if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || m < 0 || m > 59) {
    throw new Error(`Valores inválidos: horas=${h}, minutos=${m}`);
  }

  return Number((h + m / 60).toFixed(2));
}

/**
 * Convierte horas decimales a horas y minutos separados
 * 
 * @param decimal - Horas en formato decimal (ej: 1.5, 2.25)
 * @returns Objeto con horas y minutos (ej: {hours: 1, minutes: 30})
 * 
 * @example
 * decimalToHoursMinutes(0.75); // {hours: 0, minutes: 45}
 * decimalToHoursMinutes(2.25); // {hours: 2, minutes: 15}
 * decimalToHoursMinutes(8);    // {hours: 8, minutes: 0}
 */
export function decimalToHoursMinutes(
  decimal: number | null | undefined
): { hours: number; minutes: number } {
  if (decimal == null || Number.isNaN(decimal)) {
    return { hours: 0, minutes: 0 };
  }

  if (decimal < 0) {
    throw new Error(`Valor decimal inválido: ${decimal}`);
  }

  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);

  return { hours, minutes };
}

/**
 * COMPATIBILIDAD: Convierte un tiempo en formato HH:mm a horas decimales
 * Esta función se mantiene para compatibilidad con código existente.
 * 
 * @deprecated Use hoursMinutesToDecimal() con campos separados
 */
export function timeToDecimal(time: string | null | undefined): number {
  if (!time) return 0;

  const [hoursStr, minutesStr] = time.split(':');
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new Error(`Formato de tiempo inválido: ${time}`);
  }

  return Number((hours + minutes / 60).toFixed(2));
}

/**
 * COMPATIBILIDAD: Convierte horas decimales a formato HH:mm
 * Esta función se mantiene para compatibilidad con código existente.
 * 
 * @deprecated Use decimalToHoursMinutes() para obtener valores separados
 */
export function decimalToTime(decimal: number | null | undefined): string {
  if (decimal == null || Number.isNaN(decimal)) {
    return '00:00';
  }

  if (decimal < 0) {
    throw new Error(`Valor decimal inválido: ${decimal}`);
  }

  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}`;
}
