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

  /** Calendar fixed height in pixels (default 600) */
  @Input() calendarHeight = 800;

  calendarOptions: CalendarOptions = { ...getWeekCalendarOptions(), height: this.calendarHeight };
  
  private applyDayCellMountCallback(options: CalendarOptions) {
    // when rendering month day cells, ensure the events container is scrollable
    return {
      ...options,
      // called once per day cell mounting
      dayCellDidMount: (arg: any) => {
        try {
          const el: HTMLElement = arg.el as HTMLElement;
          const eventsContainer = el.querySelector('.fc-daygrid-day-events') as HTMLElement | null;
          const viewType = arg?.view?.type || '';
          // only enforce per-day scroll when in month (dayGridMonth) view
          if (eventsContainer && viewType === 'dayGridMonth') {
            eventsContainer.style.maxHeight = '310px';
            eventsContainer.style.overflowY = 'auto';
            // use setProperty for vendor-prefixed property to satisfy TS
            eventsContainer.style.setProperty('-webkit-overflow-scrolling', 'touch');
          } else if (eventsContainer) {
            // ensure week/list views are not constrained by leftover styles
            eventsContainer.style.maxHeight = '';
            eventsContainer.style.overflowY = '';
            try { eventsContainer.style.removeProperty('-webkit-overflow-scrolling'); } catch {}
          }
        } catch (e) {
          // ignore
        }
      },
      // called when a view is rendered (switching views)
      viewDidMount: (arg: any) => {
        try {
          const viewType = arg?.view?.type || '';
          const rootEl = (arg?.el || (arg?.view && (arg.view as any).el)) as HTMLElement | null;
          const containers = rootEl ? rootEl.querySelectorAll('.fc-daygrid-day-events') : document.querySelectorAll('.fc-daygrid-day-events');
          containers.forEach((c: Element) => {
            const eventsContainer = c as HTMLElement;
            if (viewType === 'dayGridMonth') {
              eventsContainer.style.maxHeight = '310px';
              eventsContainer.style.overflowY = 'auto';
              eventsContainer.style.setProperty('-webkit-overflow-scrolling', 'touch');
            } else {
              eventsContainer.style.maxHeight = '';
              eventsContainer.style.overflowY = '';
              try { eventsContainer.style.removeProperty('-webkit-overflow-scrolling'); } catch {}
            }
          });
        } catch (e) {
          // ignore
        }
      },
      // cleanup when view is destroyed
      viewWillUnmount: (arg: any) => {
        try {
          const rootEl = (arg?.el || (arg?.view && (arg.view as any).el)) as HTMLElement | null;
          const containers = rootEl ? rootEl.querySelectorAll('.fc-daygrid-day-events') : document.querySelectorAll('.fc-daygrid-day-events');
          containers.forEach((c: Element) => {
            const eventsContainer = c as HTMLElement;
            eventsContainer.style.maxHeight = '';
            eventsContainer.style.overflowY = '';
            try { eventsContainer.style.removeProperty('-webkit-overflow-scrolling'); } catch {}
          });
        } catch (e) {
          // ignore
        }
      }
    } as CalendarOptions;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['entries']) {
      this.updateEvents();
    }
    if (changes['calendarHeight']) {
      this.calendarOptions = this.applyDayCellMountCallback({ ...this.calendarOptions, height: this.calendarHeight });
    }
  }

  private updateEvents(): void {
    const events = mapTimeEntriesToEvents(this.entries || []);
    this.calendarOptions = this.applyDayCellMountCallback({ ...this.calendarOptions, events, height: this.calendarHeight });
  }

}