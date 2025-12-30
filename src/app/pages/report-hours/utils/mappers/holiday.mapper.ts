import { HolidaysResponse } from '../../models/holidays-response.model';

/**
 * Map HolidaysResponse -> TimeEntry-like objects usable by the calendar adapter.
 * Accepts several backend shapes:
 * - { colombia: Holiday[], usa: Holiday[] }
 * - { 2025: { colombia: [], usa: [] }, 2026: { ... } }
 * - { 2025: Holiday[], 2026: Holiday[] }
 */
export function mapHolidaysToTimeEntries(resp: any | null): any[] {
  if (!resp) return [];

  const out: any[] = [];
  let idCounter = -1;

  const normalizeCountryCode = (c: any) => {
    if (!c) return '';
    const s = String(c).toUpperCase();
    if (s.includes('CO')) return 'CO';
    if (s.includes('US') || s.includes('USA')) return 'US';
    return s;
  };

  const pushHoliday = (h: any, explicitCountry?: string) => {
    const cc = normalizeCountryCode(explicitCountry || h.countryCode || h.countryCodeISO || h.country);
    const countryName = cc === 'CO' ? 'Colombia' : cc === 'US' ? 'United States' : (h.countryName || h.country || '');
    out.push({
      id: idCounter--,
      type: 'HOLIDAY',
      date: h.date || h.datetime || h.iso || h.day || '',
      hours: 0,
      title: `${cc === 'CO' ? '🇨🇴' : cc === 'US' ? '🇺🇸' : ''} ${h.localName || h.name || h.local_name || ''}`.trim(),
      userId: 0,
      userName: '',
      isHoliday: true,
      countryCode: cc,
      countryName,
      originalName: h.name || h.localName || h.local_name || ''
    });
  };

  // Case A: top-level has 'colombia'/'usa'
  if (resp.colombia || resp.usa) {
    (resp.colombia || []).forEach((h: any) => pushHoliday(h, 'CO'));
    (resp.usa || []).forEach((h: any) => pushHoliday(h, 'US'));
    // also accept 'next' wrapper used by some endpoints: { next: { usa: [], colombia: [] }, usa: [], colombia: [] }
    if (resp.next && (resp.next.colombia || resp.next.usa)) {
      (resp.next.colombia || []).forEach((h: any) => pushHoliday(h, 'CO'));
      (resp.next.usa || []).forEach((h: any) => pushHoliday(h, 'US'));
    }

    return out;
  }

  // Case B: grouped by year (e.g., { '2025': { colombia: [], usa: [] }, '2026': {...} })
  for (const key of Object.keys(resp)) {
    const val = resp[key];
    if (!val) continue;

    if (Array.isArray(val)) {
      // array of Holiday objects (country may be present inside each item)
      val.forEach((h: any) => pushHoliday(h));
      continue;
    }

    // val is object: check for country keys inside
    if (val.colombia || val.usa) {
      (val.colombia || []).forEach((h: any) => pushHoliday(h, 'CO'));
      (val.usa || []).forEach((h: any) => pushHoliday(h, 'US'));
      continue;
    }

    // if val has numeric indices or other shapes, try to iterate its values
    if (typeof val === 'object') {
      for (const sub of Object.values(val as any)) {
        if (Array.isArray(sub)) {
          sub.forEach((h: any) => pushHoliday(h));
        }
      }
    }
  }

  return out;
}

export default mapHolidaysToTimeEntries;