import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { TimeEntry } from '../../models/time-entry.model';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FullCalendarModule],
  templateUrl: './calendar.html',
  styleUrls: ['./calendar.scss']
})
export class Calendar implements OnChanges {

  @Input() entries: TimeEntry[] = [];

  calendarOptions: CalendarOptions = {
    initialView: 'dayGridWeek',
    plugins: [dayGridPlugin, interactionPlugin],
    headerToolbar: {
      left: 'prev,next today',
      center: 'Log Hours',
      right: 'dayGridWeek,dayGridMonth'
    },
    // hide Sunday (0) and Saturday (6) to show only Monday-Friday
    hiddenDays: [0, 6],
    weekends: false,
    events: [] as EventInput[],
    editable: false,
    selectable: true
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['entries']) {
      this.updateEvents();
    }
  }

  private updateEvents(): void {
    const events: EventInput[] = (this.entries || []).map(e => ({
      id: String(e.id),
      title: e.title || (e.projectName ? `${e.projectName}` : 'Task'),
      start: e.date,
      // leave all-day events; FullCalendar will place them on the date
      allDay: true,
      extendedProps: {
        hours: e.hours,
        type: e.type,
        userId: e.userId,
        userName: e.userName,
        projectId: e.projectId,
        projectName: e.projectName
      }
    }));

    // Reassign events to trigger change detection in FullCalendar
    this.calendarOptions = { ...this.calendarOptions, events };
  }

}
