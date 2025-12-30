import { Component, Input, OnChanges, SimpleChanges, TemplateRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import { TimeEntry } from '../../models/time-entry.model';
import { mapTimeEntriesToEvents } from '../../utils/calendar/calendar-adapter.util';
import { getWeekCalendarOptions } from '../../utils/calendar/calendar-view.util';
import { computeMetrics } from '../../utils/metrics/report-metrics.util';
import { NgModel } from '@angular/forms';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FullCalendarModule, NgIf],
  templateUrl: './calendar.html',
  styleUrls: ['./calendar.scss']
})
export class Calendar implements OnChanges {

  @Input() entries: TimeEntry[] = [];

  @Input() eventTemplate?: TemplateRef<any> | null;

  /** Calendar fixed height in pixels (default 600) */
  @Input() calendarHeight = 800;

  calendarOptions: CalendarOptions = this.applyDayCellMountCallback({ ...getWeekCalendarOptions(), height: this.calendarHeight });
  // metrics shown above calendar
  projectHours = 0;
  projectCount = 0;
  internalHours = 0;
  internalCount = 0;
  totalHours = 0;
  totalCount = 0;
  showStats = true;
  private lastViewStart?: Date;
  private lastViewEnd?: Date;
  constructor(private cd: ChangeDetectorRef) {}
  
  private applyDayContainersScrollStyle(rootEl?: HTMLElement | null, viewType?: string) {
    try {
      const vt = (viewType || '').toString();
      const vtLower = vt.toLowerCase();

      // Apply per-day internal scrolling ONLY for the FullCalendar `dayGridMonth` view.
      // For week/list views we must NOT set per-day scroll; let the calendar use its
      // general scrolling behavior instead.
      const isMonthView = vtLower.indexOf('daygridmonth') !== -1 || vtLower === 'daygridmonth';

      const root = rootEl || document;
      const containers = (root as Document | HTMLElement).querySelectorAll('.fc-daygrid-day-events');
      containers.forEach((c: Element) => {
        try {
          const eventsContainer = c as HTMLElement;
          if (!eventsContainer) return;
          if (isMonthView) {
            eventsContainer.style.maxHeight = '310px';
            eventsContainer.style.overflowY = 'auto';
            eventsContainer.style.setProperty('-webkit-overflow-scrolling', 'touch');
          } else {
            // clear any leftover per-day constraints for non-month views
            eventsContainer.style.maxHeight = '';
            eventsContainer.style.overflowY = '';
            try { eventsContainer.style.removeProperty('-webkit-overflow-scrolling'); } catch {}
          }
        } catch (e) {}
      });
    } catch (e) {
      // ignore
    }
  }
  
  private applyDayCellMountCallback(options: CalendarOptions) {
    const self = this;
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
          // Delegate per-day scroll styling to the centralized helper which applies
          // the internal per-day scroll only for `dayGridMonth` and clears styles
          // otherwise. Also schedule a post-render pass to be safe.
          try { this.applyDayContainersScrollStyle(rootEl, viewType); } catch(e) {}
          // compute visible date range and update metrics
          try {
            const activeStart = arg?.view?.activeStart ? new Date(arg.view.activeStart) : new Date();
            const activeEnd = arg?.view?.activeEnd ? new Date(arg.view.activeEnd) : new Date();
            self.lastViewStart = activeStart;
            self.lastViewEnd = activeEnd;
            self.updateMetrics(activeStart, activeEnd);
            // also render daily badges
            try { self.renderDailyBadges(activeStart, activeEnd); } catch (e) {}
            // ensure scroll styles are applied after render pass (only for month view)
            try { requestAnimationFrame(() => { try { self.applyDayContainersScrollStyle(rootEl, viewType); } catch (e) {} }); } catch (e) {}
          } catch (e) {}
        } catch (e) {
          // ignore
        }
      },
      // called whenever the active date-range changes (navigation, today, initial)
      datesSet: (arg: any) => {
        try {
          const start = arg?.start ? new Date(arg.start) : (arg?.view?.activeStart ? new Date(arg.view.activeStart) : new Date());
          const end = arg?.end ? new Date(arg.end) : (arg?.view?.activeEnd ? new Date(arg.view.activeEnd) : new Date());
          self.lastViewStart = start;
          self.lastViewEnd = end;
          self.updateMetrics(start, end);
          try { self.renderDailyBadges(start, end); } catch (e) {}
          // schedule one-pass application of scroll styles in case FullCalendar inserts containers asynchronously (only for month view)
          try { const vt = arg && arg.view && (arg.view as any).type ? String((arg.view as any).type) : ''; requestAnimationFrame(() => { try { self.applyDayContainersScrollStyle(arg && arg.view && (arg.view as any).el ? (arg.view as any).el : null, vt); } catch (e) {} }); } catch (e) {}
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
          // clear stored view range
          try { self.lastViewStart = undefined; self.lastViewEnd = undefined; } catch {}
          // nothing extra to cleanup
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
    // update metrics for current view range if available
    if (this.lastViewStart && this.lastViewEnd) {
      this.updateMetrics(this.lastViewStart, this.lastViewEnd);
    }
  }

  private updateMetrics(start: Date, end: Date): void {
    try {
      const m = computeMetrics(this.entries || [], start, end);
      this.projectHours = m.projectHours;
      this.projectCount = m.projectCount;
      this.internalHours = m.internalHours;
      this.internalCount = m.internalCount;
      this.totalHours = m.totalHours;
      this.totalCount = m.totalCount;
      try { this.cd.detectChanges(); } catch {}
    } catch (err) {
      // fallback to zeros
      this.projectHours = 0; this.projectCount = 0; this.internalHours = 0; this.internalCount = 0; this.totalHours = 0; this.totalCount = 0;
      try { this.cd.detectChanges(); } catch {}
    }
  }

  // Compute per-day aggregates and render small badges inside day cells
  private renderDailyBadges(start: Date, end: Date): void {
    try {
      const entries = this.entries || [];
      const startMs = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
      const endMs = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();

      const map = new Map<string, { projectHours: number; internalHours: number }>();

      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        if (!e || !e.date) continue;

        let d: Date;
        if (typeof e.date === 'string') {
          const datePart = String(e.date).split('T')[0];
          const parts = datePart.split('-');
          if (parts.length >= 3) {
            const y = parseInt(parts[0], 10) || 0;
            const m = (parseInt(parts[1], 10) - 1) || 0;
            const day = parseInt(parts[2], 10) || 1;
            d = new Date(y, m, day);
          } else {
            d = new Date(e.date);
          }
        } else if (typeof e.date === 'number') {
          d = new Date(e.date);
        } else if ((e.date as any) instanceof Date) {
          d = e.date as Date;
        } else {
          d = new Date(String(e.date));
        }

        const ms = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        if (ms < startMs || ms >= endMs) continue;

        const key = d.toISOString().slice(0,10); // YYYY-MM-DD in UTC is fine for matching data-date
        const rec = map.get(key) || { projectHours: 0, internalHours: 0 };
        const hours = Number(e.hours) || 0;
        if (e.type === 'SUB_TASK') rec.projectHours += hours; else if (e.type === 'INTERNAL_TASK') rec.internalHours += hours;
        map.set(key, rec);
      }

      // remove existing badges
      document.querySelectorAll('.fc-day-badge-wrapper').forEach(n => n.remove());

      // render badges into elements that have data-date attr (works for month and week headers)
      const cells = document.querySelectorAll('[data-date]');
      cells.forEach((cell: Element) => {
        try {
          const date = String(cell.getAttribute('data-date') || '');
          if (!date) return;
          const stats = map.get(date);
          if (!stats) return;

          const wrapper = document.createElement('div');
          wrapper.className = 'fc-day-badge-wrapper';
          wrapper.innerHTML = `
            <div class="fc-day-badges">
              <span class="fc-day-badge project"><span class="badge-icon">💼</span><span class="badge-value">${(stats.projectHours||0).toFixed(1)}h</span></span>
              <span class="fc-day-badge internal"><span class="badge-icon">📝</span><span class="badge-value">${(stats.internalHours||0).toFixed(1)}h</span></span>
            </div>`;

          // append to cell; prefer top-right inside
          (cell as HTMLElement).appendChild(wrapper);
        } catch (e) {}
      });
    } catch (err) {
      // ignore
    }
  }
}