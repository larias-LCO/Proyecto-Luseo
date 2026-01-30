import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environment';
import { Observable } from 'rxjs';

// Reutilizamos los modelos de report-hours
export interface Holiday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  counties: string[] | null;
  launchYear: number | null;
  types: string[];
}

export interface HolidaysResponse {
  usa: Holiday[];
  colombia: Holiday[];
  total: number;
  year: number;
}

@Injectable({ providedIn: 'root' })
export class HolidayService {

  constructor(private http: HttpClient) {}

  /**
   * Obtiene los festivos por año desde el backend
   * Compatible con el servicio de report-hours
   */
  getByYear(year: number): Observable<HolidaysResponse> {
    return this.http.get<HolidaysResponse>(
      `${environment.apiUrl}/holidays/all/${year}`
    );
  }

  /**
   * Obtiene festivos del año actual y siguiente
   */
  getCurrent(): Observable<HolidaysResponse> {
    return this.http.get<HolidaysResponse>(
      `${environment.apiUrl}/holidays/current`
    );
  }

  /**
   * Combinar festivos de USA y Colombia en un solo array
   */
  combineHolidays(response: HolidaysResponse): Holiday[] {
    return [...(response.usa || []), ...(response.colombia || [])];
  }

  /**
   * Filtrar festivos por rango de fechas
   */
  filterByDateRange(holidays: Holiday[], startDate: Date, endDate: Date): Holiday[] {
    return holidays.filter(h => {
      const holidayDate = new Date(h.date);
      return holidayDate >= startDate && holidayDate <= endDate;
    });
  }
}
