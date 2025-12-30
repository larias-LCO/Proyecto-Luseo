import { HolidaysResponse } from '../../models/holidays-response.model';

/**
 * Map HolidaysResponse -> TimeEntry-like objects usable by the calendar adapter.
 * We return `any[]` because holidays have extra props not defined in TimeEntry.
 */
export function mapHolidaysToTimeEntries(resp: HolidaysResponse | null): any[] {
  if (!resp) return [];

  const out: any[] = [];
  let idCounter = -1;

  const pushHoliday = (h: any, countryCode: string, countryName: string) => {
    out.push({
      id: idCounter--,
      type: 'HOLIDAY',
      date: h.date,
      hours: 0,
      title: `${countryCode === 'CO' ? '🇨🇴' : '🇺🇸'} ${h.localName || h.name}`,
      userId: 0,
      userName: '',
      // extra props used by calendar rendering
      isHoliday: true,
      countryCode,
      countryName,
      originalName: h.name || h.localName
    });
  };

  (resp.colombia || []).forEach(h => pushHoliday(h, 'CO', 'Colombia'));
  (resp.usa || []).forEach(h => pushHoliday(h, 'US', 'United States'));

  return out;
}

export default mapHolidaysToTimeEntries;