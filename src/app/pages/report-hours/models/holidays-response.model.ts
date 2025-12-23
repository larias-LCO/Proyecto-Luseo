import { Holiday } from './holiday.model';

export interface HolidaysResponse {
  usa: Holiday[];
  colombia: Holiday[];

  total: number;
  year: number;
}