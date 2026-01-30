import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Componente para renderizar tarjetas de festivos
 * Usado en el calendario de Schedule
 */
@Component({
  selector: 'app-holiday-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './holiday-card.html',
  styleUrl: './holiday-card.scss'
})
export class HolidayCard {
  @Input() countryCode: string = '';
  @Input() countryName: string = '';
  @Input() localName: string = '';
  @Input() title: string = '';

  get isColombia(): boolean {
    return this.countryCode === 'CO';
  }

  get isUSA(): boolean {
    return this.countryCode === 'US';
  }

  get flag(): string {
    if (this.isColombia) return '🇨🇴';
    if (this.isUSA) return '🇺🇸';
    return '🎉';
  }

  get displayName(): string {
    return this.localName || this.title;
  }

  get displayCountryName(): string {
    if (this.countryName) return this.countryName;
    if (this.isColombia) return 'Colombia';
    if (this.isUSA) return 'United States';
    return '';
  }
}
