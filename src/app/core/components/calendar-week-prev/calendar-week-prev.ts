import { Component, ChangeDetectorRef } from '@angular/core';
import { createTaskCard } from '../../../shared/task-card.helper';
import { Input, OnChanges, SimpleChanges } from '@angular/core';
import { ViewChild, TemplateRef, ElementRef } from '@angular/core';
import { FullCalendarComponent } from '@fullcalendar/angular';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { createTypeSection as createToggleSection } from '../section-toggle/section-toggle';

@Component({
  selector: 'app-calendar-week-prev',
   imports: [FullCalendarModule],
  templateUrl: './calendar-week-prev.html',
  styleUrl: './calendar-week-prev.scss'
})
export class CalendarWeekPrev {

   @ViewChild('calendar') calendarComponent!: FullCalendarComponent;
  @ViewChild('eventContent', { static: true }) eventContentTemplate!: TemplateRef<any>;
  @ViewChild('sectionContainer', { static: true }) sectionContainer!: ElementRef;
  @ViewChild('calendarWrapper', { static: true }) calendarWrapper!: ElementRef;

  // (Eliminada implementación duplicada de ngAfterViewInit)
  public calendarViewType: string | null = null;
  public calendarTitle: string = '';
  @Input() tasks: any[] = [];

  constructor(private cdr: ChangeDetectorRef,) {}

  ngAfterViewInit() {
    // Calcular el lunes de la semana anterior
    const today = new Date();
    const currentMonday = this.getMonday(today);
    const prevMonday = new Date(currentMonday);
    prevMonday.setDate(currentMonday.getDate() - 7);
    const prevMondayStr = this.formatDateLocal(prevMonday);

    // Establecer la fecha inicial del calendario a la semana anterior
    this.calendarOptions = {
      ...this.calendarOptions,
      initialDate: prevMondayStr
    };

    setTimeout(() => {
      if (this.calendarComponent && this.calendarComponent.getApi()) {
        this.calendarComponent.getApi().gotoDate(prevMondayStr);
        this.calendarViewType = this.calendarComponent.getApi().view?.type || null;
        this.cdr.detectChanges();
      }
    });

    // Renderizar el botón show/hide que controla el calendario
    if (this.sectionContainer && this.calendarWrapper) {
      const calendarEl = this.calendarWrapper.nativeElement;
      const section = this.createTypeSection('', true, 'my-section', calendarEl);
      this.sectionContainer.nativeElement.appendChild(section);
    }
    console.log("Calendar API:", this.calendarComponent?.getApi());
  }




  calendarOptions: CalendarOptions = {
    initialView: 'dayGridWeek',
    plugins: [dayGridPlugin, interactionPlugin],
    events: [],
    headerToolbar: false, // Usamos nuestro propio toolbar
    dayHeaderFormat: { weekday: 'short', day: 'numeric' },
    visibleRange: undefined, // Usamos la vista por defecto de la semana
    weekends: false, // Oculta sábados y domingos
    hiddenDays: [0, 6], // 0 = domingo, 6 = sábado
    height: 'auto',
    contentHeight: 'auto',
    datesSet: this.onDatesSet.bind(this),
    eventContent: (arg: any) => {
      const t = arg.event.extendedProps && arg.event.extendedProps.task ? arg.event.extendedProps.task : arg.event;
      if (!t) return { domNodes: [document.createTextNode(arg.event.title || '')] };
      // Calcular cuántas tareas hay en ese día
      let taskCount = 1;
      try {
        const dateStr = arg.event.startStr?.slice(0, 10);
        let allEvents = arg.view?.calendar?.getEvents?.() || [];
        if (dateStr && allEvents.length > 0) {
          taskCount = allEvents.filter((ev: any) => ev.startStr?.slice(0, 10) === dateStr).length;
        }
        const card = createTaskCard(t, { taskCount });
        return { domNodes: [card] };
      } catch {
        return { domNodes: [document.createTextNode(arg.event.title || '')] };
      }
    }
  };

  onDatesSet(arg: any) {
    this.calendarTitle = arg.view.title;
    this.calendarViewType = arg.view.type;
    // Soluciona ExpressionChangedAfterItHasBeenCheckedError
    Promise.resolve(() => this.cdr.detectChanges());
  }

  // Cambia la fecha visible del calendario
setCalendarDate(date: string) {
  if (this.calendarComponent) {
    // Calcular el lunes de la semana anterior a la fecha recibida
    const selected = new Date(date);
    const monday = this.getMonday(selected);
    const prevMonday = new Date(monday);
    prevMonday.setDate(monday.getDate() - 7);
    const prevMondayStr = this.formatDateLocal(prevMonday);
    const api = this.calendarComponent.getApi();
    api.changeView('dayGridWeek', prevMondayStr); // Mostrar semana anterior
  }
}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['tasks']) {
      this.calendarOptions = {
        ...this.calendarOptions,
        events: (this.tasks || []).map((task: any) => {
          // Forzar fecha local para evitar desfase por zona horaria
          let dateStr = task.issuedDate || task.createdDate;
          if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            // YYYY-MM-DD => YYYY-MM-DDT00:00:00 (local)
            dateStr = dateStr + 'T00:00:00';
          }
          console.log('Evento calendario:', { nombre: task.name, fecha: dateStr, id: task.id });
          return {
            title: task.name,
            start: dateStr,
            allDay: true,
            extendedProps: { task }
          };
        })
      };
    }
  }

  someMethod() {
    let calendarApi = this.calendarComponent.getApi();
    calendarApi.next();
  }

  toggleWeekends() {
    this.calendarOptions.weekends = !this.calendarOptions.weekends; // toggle the boolean!
  }

  handleDateClick(arg: any) {
    alert('date click! ' + arg.dateStr);
  }

      // Devuelve blanco o negro según el color de fondo para contraste
      getContrastColor(hex: string): string {
        if (!hex) return '#000';
        // Eliminar el # si existe
        hex = hex.replace('#', '');
        // Convertir a RGB
        let r = 0, g = 0, b = 0;
        if (hex.length === 3) {
          r = parseInt(hex[0] + hex[0], 16);
          g = parseInt(hex[1] + hex[1], 16);
          b = parseInt(hex[2] + hex[2], 16);
        } else if (hex.length === 6) {
          r = parseInt(hex.substring(0, 2), 16);
          g = parseInt(hex.substring(2, 4), 16);
          b = parseInt(hex.substring(4, 6), 16);
        }
        // Calcular luminancia
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? '#000' : '#fff';
      }
    // Integración: Usar la función importada para la sección con botón show/hide
    createTypeSection(title: string, collapsible: boolean = false, sectionId: string | null = null, externalContent?: HTMLElement | null): HTMLElement {
      return createToggleSection(title, collapsible, sectionId ?? undefined, externalContent);
    }

    // Crea una sección de semana para el calendario
    createWeekSection(weekKey: string, weekData: any): HTMLElement {
      const section = document.createElement('div');
      section.className = 'week-section';
      section.style.cssText = 'margin-bottom: 32px; background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);';

      // Check if sections have tasks
      const hasTeamTasks = weekData.team && Object.keys(weekData.team).length > 0;

      // Team tasks (single calendar with all tasks, visually separated by project type)
      if (hasTeamTasks) {
        const teamId = `team-${weekKey}`;
        const teamSection = this.createTypeSection('📌Schedule', false, teamId);
        section.appendChild(teamSection);
      } else {
        // Show empty team section
        const emptySection = document.createElement('div');
        emptySection.style.cssText = 'margin-bottom: 20px;';
        const title = document.createElement('div');
        title.style.cssText = 'font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 12px; padding: 8px 0; border-bottom: 2px solid #e2e8f0;';
        title.textContent = '📌Schedule';
        emptySection.appendChild(title);

        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'muted';
        emptyMsg.textContent = 'No Schedule tasks for this week';
        emptyMsg.style.cssText = 'padding: 20px; text-align: center; background: #f8fafc; border-radius: 8px;';
        emptySection.appendChild(emptyMsg);
        section.appendChild(emptySection);
      }
      return section;
    }

    // Renderiza el calendario de tareas para las semanas indicadas
    renderMultiProjectCalendar(container: HTMLElement, allTasks: any[], currentFilters: any, renderCalendarView: (container: HTMLElement, tasks: any[], weeksToShow: string[] | null) => void): void {
      let weeksToShow: string[] | null = null;
      if (currentFilters.week) {
        const weekStart = this.getWeekStart(currentFilters.week);
        const prev = new Date(weekStart);
        prev.setDate(prev.getDate() - 7);
        weeksToShow = [this.formatDateLocal(weekStart), this.formatDateLocal(prev)];
      }
      renderCalendarView(container, allTasks, weeksToShow);
    }

  getWeekStart(weekString: string): Date {
    // weekString format: "2025-W02"
    const [year, week] = weekString.split('-W');
    const date = new Date(Number(year), 0, 1 + (Number(week) - 1) * 7);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  }
    getMonday(date: Date | string): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  formatDateLocal(d: Date | string): string {
    const date = new Date(d);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }



}
