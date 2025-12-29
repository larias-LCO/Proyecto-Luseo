import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environment';
import { HolidaysResponse } from '../models/holidays-response.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class HolidayService {

  constructor(private http: HttpClient) {}

  /**
   * Obtiene los festivos por año desde el backend
   * No crea, no edita, no elimina
   */
  getByYear(year: number): Observable<HolidaysResponse> {
    // backend exposes combined endpoint at /holidays/all/{year}
    return this.http.get<HolidaysResponse>(
      `${environment.apiUrl}/holidays/all/${year}`
    );
  }
}