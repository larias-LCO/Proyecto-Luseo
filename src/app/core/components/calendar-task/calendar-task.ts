import { Component, ChangeDetectorRef } from '@angular/core';
import { createTaskCard } from '../../../shared/task-card.helper';
import { createTypeSection as createToggleSection } from '../section-toggle/section-toggle';
import { Input, OnChanges, SimpleChanges } from '@angular/core';
import { ViewChild, TemplateRef, ElementRef } from '@angular/core';
import { FullCalendarComponent } from '@fullcalendar/angular';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';


@Component({
  selector: 'app-calendar-task',
  imports: [FullCalendarModule],
  templateUrl: './calendar-task.html',
  styleUrl: './calendar-task.scss'
})
export class CalendarTask {
  public calendarTitle: string = '';
  @Input() tasks: any[] = [];

 @ViewChild('calendar') calendar!: FullCalendarComponent;
  @ViewChild('eventContent', { static: true }) eventContentTemplate!: TemplateRef<any>;
  @ViewChild('sectionContainer', { static: true }) sectionContainer!: ElementRef;
  @ViewChild('calendarWrapper', { static: true }) calendarWrapper!: ElementRef;

   // (Eliminada implementación duplicada de ngAfterViewInit)
  public calendarViewType: string | null = null;

  constructor(private cdr: ChangeDetectorRef,) {}

  ngAfterViewInit() {
    // Esperar a que el calendario esté listo y luego obtener el tipo de vista
    setTimeout(() => {
      if (this.calendar && this.calendar.getApi()) {
        this.calendarViewType = this.calendar.getApi().view?.type || null;
        this.cdr.detectChanges();
         this.addCompactClassToDays();
      }
    });
    // Renderizar el botón show/hide que controla el calendario
    if (this.sectionContainer && this.calendarWrapper) {
      const calendarEl = this.calendarWrapper.nativeElement;
      const section = this.createTypeSection('', true, 'my-section', calendarEl);
      this.sectionContainer.nativeElement.appendChild(section);
    }
    console.log("Calendar API:", this.calendar?.getApi());
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
    dayMaxEventRows: false,
    dayMaxEvents: false,
    eventOrderStrict: true,
    eventOverlap: false,
    eventDisplay: 'block',
    eventOrder: function(a: any, b: any) {
      let priorityA = 300;
      let priorityB = 300;
      const aIsHoliday = !!(a.extendedProps && (a.extendedProps.isHoliday || a.extendedProps.task?.isHoliday));
      if (aIsHoliday) priorityA = 100;
      const bIsHoliday = !!(b.extendedProps && (b.extendedProps.isHoliday || b.extendedProps.task?.isHoliday));
      if (bIsHoliday) priorityB = 100;
      if (!aIsHoliday) {
        let aIsOutOfOffice = a.extendedProps?.isOutOfOffice;
        if (!aIsOutOfOffice) {
          const taskA = a.extendedProps?.task || {};
          const categoryNameA = (taskA.taskCategoryName || '').toLowerCase();
          aIsOutOfOffice = categoryNameA.includes('out of office');
        }
        if (aIsOutOfOffice) priorityA = 200;
      }
      if (!bIsHoliday) {
        let bIsOutOfOffice = b.extendedProps?.isOutOfOffice;
        if (!bIsOutOfOffice) {
          const taskB = b.extendedProps?.task || {};
          const categoryNameB = (taskB.taskCategoryName || '').toLowerCase();
          bIsOutOfOffice = categoryNameB.includes('out of office');
        }
        if (bIsOutOfOffice) priorityB = 200;
      }
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      if (priorityA >= 100) {
        const taskA = a.extendedProps?.task || {};
        const taskB = b.extendedProps?.task || {};
        const typeA = taskA.projectType || 'ZZZ';
        const typeB = taskB.projectType || 'ZZZ';
        const subPriorityA = typeA === 'COMMERCIAL' ? 1 : typeA === 'RESIDENTIAL' ? 2 : 3;
        const subPriorityB = typeB === 'COMMERCIAL' ? 1 : typeB === 'RESIDENTIAL' ? 2 : 3;
        if (subPriorityA !== subPriorityB) return subPriorityA - subPriorityB;
        const codeA = (taskA.projectCode || '').toUpperCase();
        const codeB = (taskB.projectCode || '').toUpperCase();
        if (codeA !== codeB) return codeA.localeCompare(codeB);
        const nameA = (taskA.name || '').toUpperCase();
        const nameB = (taskB.name || '').toUpperCase();
        return nameA.localeCompare(nameB);
      }
      return 0;
    },
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
  this.addCompactClassToDays();
  }

  // Esta función agrega la clase .more-than-3 a los días con más de 3 tareas
addCompactClassToDays() {
  setTimeout(() => {
    // Selecciona todos los días del calendario
    const dayCells = document.querySelectorAll('.fc-daygrid-day');
    dayCells.forEach(cell => {
      // Busca las tarjetas dentro de cada celda
      const cards = cell.querySelectorAll('.gt-card');
      if (cards.length > 3) {
        cell.classList.add('more-than-3');
      } else {
        cell.classList.remove('more-than-3');
      }
    });
  }, 0);
}

  // Cambia la fecha visible del calendario
setCalendarDate(date: string) {
  if (this.calendar) {
    const api = this.calendar.getApi();
    api.changeView('dayGridWeek', date); // date en formato 'YYYY-MM-DD'
  }
}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['tasks']) {
      console.log('[DEBUG][CalendarTask] Tareas recibidas en @Input tasks:', this.tasks);
      this.calendarOptions = {
        ...this.calendarOptions,
        events: (this.tasks || []).map(task => {
          // Forzar fecha local para evitar desfase por zona horaria
          let dateStr = task.issuedDate || task.createdDate;
          if (!dateStr) {
            // Fallback: usar fecha de hoy si no hay ninguna
            dateStr = new Date().toISOString().slice(0, 10);
            console.warn('[CalendarTask] Tarea sin fecha, usando hoy:', task);
          }
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
    let calendarApi = this.calendar.getApi();
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

groupTasksByWeekAndType(tasks: any[]): Record<string, { team: Record<number, any[]> }> {
  const grouped: Record<string, { team: Record<number, any[]> }> = {};

  tasks.forEach((task: any) => {
    const dateStr = task.issuedDate || task.createdDate || this.formatDateLocal(new Date());
    // Parse date in local timezone to avoid dayOfWeek shifting
    const [year, month, day] = dateStr.split('T')[0].split('-');
    const date = new Date(Number(year), Number(month) - 1, Number(day));

    // Get Monday of that week
    const monday = this.getMonday(date);
    const weekKey = this.formatDateLocal(monday);

    if (!grouped[weekKey]) {
      grouped[weekKey] = { team: {} };
    }

    const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat

    if (!grouped[weekKey].team[dayOfWeek]) {
      grouped[weekKey].team[dayOfWeek] = [];
    }

    grouped[weekKey].team[dayOfWeek].push(task);
  });

  // PRIORITIZE "Out of Office" tasks within each day - they should appear first
  Object.keys(grouped).forEach((weekKey) => {
    Object.keys(grouped[weekKey].team).forEach((dayOfWeek) => {
      grouped[weekKey].team[Number(dayOfWeek)].sort((a: any, b: any) => {
        const aIsOutOfOffice = (a.taskCategoryName || '').toLowerCase().includes('out of office');
        const bIsOutOfOffice = (b.taskCategoryName || '').toLowerCase().includes('out of office');

        // Out of Office tasks come first
        if (aIsOutOfOffice && !bIsOutOfOffice) return -1;
        if (!aIsOutOfOffice && bIsOutOfOffice) return 1;

        // For same type, maintain original order
        return 0;
      });
    });
  });

  return grouped;
}

  }
