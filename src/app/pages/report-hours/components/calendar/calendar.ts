import { Component, Input, OnChanges, SimpleChanges, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { TimeEntry } from '../../models/time-entry.model';
import { mapTimeEntriesToEvents } from '../../utils/calendar/calendar-adapter.util';
import { getWeekCalendarOptions } from '../../utils/calendar/calendar-view.util';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FullCalendarModule],
  templateUrl: './calendar.html',
  styleUrls: ['./calendar.scss']
})
export class Calendar implements OnChanges {

  @Input() entries: TimeEntry[] = [];

  @Input() eventTemplate?: TemplateRef<any> | null;

  calendarOptions: CalendarOptions = getWeekCalendarOptions();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['entries']) {
      this.updateEvents();
    }
  }

  private updateEvents(): void {
    const events = mapTimeEntriesToEvents(this.entries || []);
    this.calendarOptions = { ...this.calendarOptions, events };
  }

}