import { 
  Component, 
  Input, 
  OnChanges, 
  SimpleChanges, 
  ChangeDetectorRef, 
  Output, 
  EventEmitter,
  OnInit,
  ApplicationRef,
  EnvironmentInjector,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventInput, EventClickArg, EventContentArg } from '@fullcalendar/core';
import { GeneralTask } from '../../models/general-task.model';
import { Holiday } from '../../services/holiday.service';
import { 
  mapScheduleDataToEvents, 
  mapGeneralTasksToEvents, 
  mapHolidaysToEvents 
} from '../../utils/calendar/calendar-adapter.util';
import { getScheduleCalendarOptions } from '../../utils/calendar/calendar-view.util';
import { renderGeneralTaskCard, renderHolidayCard } from '../../utils/event-render.util';

@Component({
  selector: 'app-schedule-calendar',
  standalone: true,
  imports: [CommonModule, FullCalendarModule],
  templateUrl: './schedule-calendar.html',
  styleUrls: ['./schedule-calendar.scss']
})
export class ScheduleCalendar implements OnInit, OnChanges {

  @Input() tasks: GeneralTask[] = [];
  @Input() holidays: Holiday[] = [];
  @Input() showHolidays: boolean = true;
  @Input() calendarHeight: number = 800;

  @Output() taskClick = new EventEmitter<GeneralTask>();
  @Output() dateSelect = new EventEmitter<{ start: Date; end: Date }>();
  @Output() dateRangeChange = new EventEmitter<{ start: Date; end: Date }>();

  calendarOptions: CalendarOptions = getScheduleCalendarOptions();
  calendarEvents: EventInput[] = [];

  private appRef = inject(ApplicationRef);
  private envInjector = inject(EnvironmentInjector);

  constructor(private cd: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.initializeCalendar();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tasks'] || changes['holidays'] || changes['showHolidays']) {
      this.updateEvents();
    }
    if (changes['calendarHeight']) {
      this.calendarOptions = {
        ...this.calendarOptions,
        height: this.calendarHeight
      };
    }
  }

  private initializeCalendar(): void {
    this.calendarOptions = {
      ...getScheduleCalendarOptions(),
      height: this.calendarHeight,
      events: this.calendarEvents, // Usar referencia a array de eventos
      eventClick: this.handleEventClick.bind(this),
      select: this.handleDateSelect.bind(this),
      datesSet: this.handleDatesSet.bind(this),
      eventDidMount: this.handleEventDidMount.bind(this),
      eventContent: this.handleEventContent.bind(this), // Renderizado personalizado
      dayCellDidMount: this.handleDayCellDidMount.bind(this),
      viewDidMount: this.handleViewDidMount.bind(this)
    };
    this.updateEvents();
  }

  private updateEvents(): void {
    const tasksToShow = this.tasks || [];
    const holidaysToShow = this.showHolidays ? (this.holidays || []) : [];
    
    const events = mapScheduleDataToEvents(tasksToShow, holidaysToShow);
    
    // Actualizar array de eventos
    this.calendarEvents.length = 0;
    this.calendarEvents.push(...events);
    
    // También actualizar en calendarOptions
    this.calendarOptions = {
      ...this.calendarOptions,
      events: events
    };
    
    // Forzar actualización del calendario
    try {
      this.cd.markForCheck();
      this.cd.detectChanges();
    } catch (e) {
      // Ignorar errores de detección de cambios
    }
  }

  private handleEventClick(arg: EventClickArg): void {
    const eventProps = arg.event.extendedProps;
    
    if (eventProps?.['type'] === 'GENERAL_TASK' && eventProps?.['fullTask']) {
      this.taskClick.emit(eventProps['fullTask']);
    }
  }

  private handleEventContent(arg: EventContentArg): { domNodes: HTMLElement[] } | void {
    try {
      const eventType = arg.event.extendedProps?.['type'];
      
      // Check if this is a multi-day event
      const isMultiDay = arg.event.start && arg.event.end && 
        Math.ceil((arg.event.end.getTime() - arg.event.start.getTime()) / (1000 * 60 * 60 * 24)) > 1;
      
      // For multi-day events, let FullCalendar handle native rendering
      if (isMultiDay && arg.event.start && arg.event.end) {
        return undefined;
      }
      
      if (eventType === 'GENERAL_TASK') {
        const cardElement = renderGeneralTaskCard(arg, this.appRef, this.envInjector, true);
        if (!cardElement) {
          return undefined;
        }
        return { domNodes: [cardElement] };
      }
      
      if (eventType === 'HOLIDAY') {
        const cardElement = renderHolidayCard(arg, this.appRef, this.envInjector);
        if (!cardElement) {
          return undefined;
        }
        return { domNodes: [cardElement] };
      }
      
      return undefined;
    } catch (e) {
      console.error('Error rendering event content:', e, arg);
      return undefined;
    }
  }

  private handleDateSelect(selectInfo: any): void {
    this.dateSelect.emit({
      start: selectInfo.start,
      end: selectInfo.end
    });
  }

  private handleDatesSet(dateInfo: any): void {
    try {
      const start = dateInfo?.start ? new Date(dateInfo.start) : new Date();
      const end = dateInfo?.end ? new Date(dateInfo.end) : new Date();
      
      this.dateRangeChange.emit({ start, end });
    } catch (e) {
      // Ignorar errores
    }
  }

  private handleEventDidMount(arg: any): void {
    try {
      const eventProps = arg.event.extendedProps;
      
      // Agregar tooltip con información adicional
      if (eventProps?.type === 'GENERAL_TASK') {
        const task = eventProps.fullTask as GeneralTask;
        arg.el.title = `${task.name}\nProyecto: ${task.projectName}\nCategoría: ${task.taskCategoryName}`;
      } else if (eventProps?.type === 'HOLIDAY') {
        arg.el.title = `Festivo: ${eventProps.localName || eventProps.holidayName}`;
      }
    } catch (e) {
      // Ignorar errores
    }
  }
  private handleDayCellDidMount(arg: any): void {
    try {
      const el: HTMLElement = arg.el as HTMLElement;
      const eventsContainer = el.querySelector('.fc-daygrid-day-events') as HTMLElement | null;
      const viewType = arg?.view?.type || '';
      
      // Solo enforcer scroll en vista mensual
      if (eventsContainer && viewType === 'dayGridMonth') {
        eventsContainer.style.maxHeight = '300px';
        eventsContainer.style.overflowY = 'auto';
        eventsContainer.style.setProperty('-webkit-overflow-scrolling', 'touch');
      } else if (eventsContainer) {
        eventsContainer.style.maxHeight = '';
        eventsContainer.style.overflowY = '';
        try { eventsContainer.style.removeProperty('-webkit-overflow-scrolling'); } catch {}
      }
    } catch (e) {
      // Ignorar errores
    }
  }

  private handleViewDidMount(arg: any): void {
    try {
      const viewType = arg?.view?.type || '';
      const rootEl = (arg?.el || (arg?.view && (arg.view as any).el)) as HTMLElement | null;
      
      // Aplicar estilos de scroll a todas las celdas de día
      this.applyDayContainersScrollStyle(rootEl, viewType);
      
      // Re-aplicar después de render
      requestAnimationFrame(() => {
        try { this.applyDayContainersScrollStyle(rootEl, viewType); } catch (e) {}
      });
    } catch (e) {
      // Ignorar errores
    }
  }

  private applyDayContainersScrollStyle(rootEl?: HTMLElement | null, viewType?: string): void {
    try {
      const vt = (viewType || '').toString();
      const vtLower = vt.toLowerCase();
      const isMonthView = vtLower.indexOf('daygridmonth') !== -1 || vtLower === 'daygridmonth';

      const root = rootEl || document;
      const containers = (root as Document | HTMLElement).querySelectorAll('.fc-daygrid-day-events');
      
      containers.forEach((c: Element) => {
        try {
          const eventsContainer = c as HTMLElement;
          if (!eventsContainer) return;
          
          if (isMonthView) {
            eventsContainer.style.maxHeight = '300px';
            eventsContainer.style.overflowY = 'auto';
            eventsContainer.style.setProperty('-webkit-overflow-scrolling', 'touch');
          } else {
            eventsContainer.style.maxHeight = '';
            eventsContainer.style.overflowY = '';
            try { eventsContainer.style.removeProperty('-webkit-overflow-scrolling'); } catch {}
          }
        } catch (e) {}
      });
    } catch (e) {
      // Ignorar errores
    }
  }

  /**
   * Método público para navegar a una fecha específica
   */
  public goToDate(date: Date): void {
    const calendarApi = (this.calendarOptions as any).calendarApi;
    if (calendarApi) {
      calendarApi.gotoDate(date);
    }
  }

  /**
   * Método público para cambiar la vista
   */
  public changeView(viewName: string): void {
    const calendarApi = (this.calendarOptions as any).calendarApi;
    if (calendarApi) {
      calendarApi.changeView(viewName);
    }
  }

  /**
   * Método público para refrescar eventos
   */
  public refreshEvents(): void {
    this.updateEvents();
  }
}
