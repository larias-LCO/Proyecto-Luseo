
import { Component, ChangeDetectorRef } from '@angular/core';
import { Input, OnChanges, SimpleChanges } from '@angular/core';
import { ViewChild, TemplateRef } from '@angular/core';
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

  @ViewChild('calendar') calendarComponent!: FullCalendarComponent;
  @ViewChild('eventContent', { static: true }) eventContentTemplate!: TemplateRef<any>;

   // (Eliminada implementación duplicada de ngAfterViewInit)
  public calendarViewType: string | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit() {
    // Esperar a que el calendario esté listo y luego obtener el tipo de vista
    setTimeout(() => {
      if (this.calendarComponent && this.calendarComponent.getApi()) {
        this.calendarViewType = this.calendarComponent.getApi().view?.type || null;
        this.cdr.detectChanges();
      }
    });
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
    datesSet: this.onDatesSet.bind(this)
  };

  onDatesSet(arg: any) {
    this.calendarTitle = arg.view.title;
  }

  // Cambia la fecha visible del calendario
setCalendarDate(date: string) {
  if (this.calendarComponent) {
    const api = this.calendarComponent.getApi();
    api.changeView('dayGridWeek', date); // date en formato 'YYYY-MM-DD'
  }
}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['tasks']) {
      this.calendarOptions = {
        ...this.calendarOptions,
        events: (this.tasks || []).map(task => {
          // Forzar fecha local para evitar desfase por zona horaria
          let dateStr = task.issuedDate || task.createdDate;
          if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            // YYYY-MM-DD => YYYY-MM-DDT00:00:00 (local)
            dateStr = dateStr + 'T00:00:00';
          }
          return {
            title: task.name,
            date: dateStr,
            allDay: true
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
    // Renderiza una sección de tipo (team/personal) para una semana
    createTypeSection(
      title: string,
      tasksByDay: any,
      weekKey: string,
      collapsible: boolean = false,
      sectionId: string | null = null,
      allTasks: any[] = [],
      isCurrentWeek: boolean = true
    ): HTMLElement {
      const section = document.createElement('div');
      section.style.cssText = 'margin-bottom: 20px;';

      // Title container with toggle button
      const titleContainer = document.createElement('div');
      titleContainer.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 8px 0; border-bottom: 2px solid #e2e8f0;';

      const titleEl = document.createElement('div');
      titleEl.style.cssText = 'font-size: 16px; font-weight: 700; color: #0f172a;';
      titleEl.textContent = title;

      titleContainer.appendChild(titleEl);

      // Create a consistent id for content (used by toggle and FC container)
      const contentId = sectionId || `section-${Math.random().toString(36).slice(2)}`;

      // ALL sections now have toggle button (collapsible), but with different default states
      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'section-toggle-btn';
      // Set initial button text based on collapsible flag (open by default if not collapsible)
      toggleBtn.innerHTML = collapsible ? '👁️ Show' : '👁️‍🗨️ Hide';
      toggleBtn.style.cssText = 'padding: 6px 12px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;';

      toggleBtn.addEventListener('mouseenter', () => { toggleBtn.style.background = '#e2e8f0'; });
      toggleBtn.addEventListener('mouseleave', () => { toggleBtn.style.background = '#f1f5f9'; });

      toggleBtn.addEventListener('click', () => {
        const content = document.getElementById(contentId);
        if (!content) return;
        const isHidden = content.style.display === 'none' || content.style.display === '';
        content.style.display = isHidden ? 'block' : 'none';
        toggleBtn.innerHTML = isHidden ? '👁️‍🗨️ Hide' : '👁️ Show';

        // If FC instance exists, render/update it
        try {
          const calEl = content.querySelector('[data-fc-id]');
          if (calEl) {
            const calId = calEl.getAttribute('data-fc-id');
            if (calId && (window as any).fcInstances && (window as any).fcInstances[calId]) {
              const inst = (window as any).fcInstances[calId];
              if (!inst.rendered) {
                try { inst.calendar.render(); } catch(e) { try { inst.calendar.render(); } catch(_) {} }
                inst.rendered = true;
              } else {
                try { inst.calendar.updateSize(); } catch(e) { console.warn('FC updateSize failed', e); }
              }
            }
          }
        } catch (e) { console.warn('Toggle fullcalendar failed', e); }
      });

      titleContainer.appendChild(toggleBtn);
      section.appendChild(titleContainer);

      // Compute Monday date for weekKey (local timezone)
      const [yearStr, monthStr, dayStr] = weekKey.split('-');
      const monday = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr));

      // If FullCalendar is available, render week view and use createTaskCard for each event
      const fcAvailable = (window as any).FullCalendar && typeof (window as any).FullCalendar.Calendar === 'function';

      if (fcAvailable) {
        const calWrapper = document.createElement('div');
        calWrapper.id = contentId;
        calWrapper.style.cssText = 'background: #fff; border-radius: 8px; padding: 8px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-top:12px; max-height: 650px; overflow-y: auto;';
        if (collapsible) calWrapper.style.display = 'none';

        const calEl = document.createElement('div');
        const calId = `fc-${contentId}-${Math.random().toString(36).slice(2)}`;
        calEl.id = `${calId}-el`;
        calEl.setAttribute('data-fc-id', calId);
        calEl.style.cssText = 'width:100%; min-height: 120px;';
        calWrapper.appendChild(calEl);
        section.appendChild(calWrapper);

        // window.fcInstances = window.fcInstances || {};
        (window as any).fcInstances = (window as any).fcInstances || {};

        try {
          const Calendar = (window as any).FullCalendar.Calendar;

          // Determine headerToolbar based on whether this is current week or not
          const headerToolbar = isCurrentWeek
            ? { left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridWeek,dayGridDay,listWeek' }
            : { left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridWeek,listWeek' };

          const calendar = new Calendar(calEl, {
            initialView: 'dayGridWeek',
            height: 'auto',
            contentHeight: 'auto',
            dayMaxEventRows: false,
            dayMaxEvents: false,
            eventOrder: function(a: any, b: any) {
              const taskA = a.extendedProps?.task || {};
              const taskB = b.extendedProps?.task || {};
              const aIsOutOfOffice = (taskA.taskCategoryName || '').toLowerCase().includes('out of office');
              const bIsOutOfOffice = (taskB.taskCategoryName || '').toLowerCase().includes('out of office');
              if (aIsOutOfOffice && !bIsOutOfOffice) return -1;
              if (!aIsOutOfOffice && bIsOutOfOffice) return 1;
              const typeA = taskA.projectType || 'ZZZ';
              const typeB = taskB.projectType || 'ZZZ';
              const priorityA = typeA === 'COMMERCIAL' ? 1 : typeA === 'RESIDENTIAL' ? 2 : 3;
              const priorityB = typeB === 'COMMERCIAL' ? 1 : typeB === 'RESIDENTIAL' ? 2 : 3;
              if (priorityA !== priorityB) {
                return priorityA - priorityB;
              }
              const codeA = (taskA.projectCode || '').toUpperCase();
              const codeB = (taskB.projectCode || '').toUpperCase();
              if (codeA < codeB) return -1;
              if (codeA > codeB) return 1;
              const nameA = (taskA.name || '').toUpperCase();
              const nameB = (taskB.name || '').toUpperCase();
              return nameA.localeCompare(nameB);
            },
            headerToolbar: headerToolbar,
            navLinks: true,
            navLinkDayClick: function(date: any, jsEvent: any) {
              jsEvent.preventDefault();
              calendar.changeView('dayGridDay', date);
            },
            initialDate: this.formatDateLocal(monday),
            firstDay: 1,
            weekends: false,
            views: {
              dayGridMonth: {
                dayMaxEventRows: false,
                dayMaxEvents: false,
                fixedWeekCount: false
              }
            },
            events: (fetchInfo: any, successCallback: any, failureCallback: any) => {
              try {
                const startDate = new Date(fetchInfo.start);
                startDate.setHours(0, 0, 0, 0);
                const endDate = new Date(fetchInfo.end);
                endDate.setHours(0, 0, 0, 0);
                const sectionType = (() => { const t = String(title || '').toLowerCase(); if (t.includes('personal')) return 'personal'; return 'team'; })();
                const matched = (allTasks || []).filter(task => {
                  const dateStr = (task.issuedDate || task.createdDate || '').split('T')[0];
                  if (!dateStr) return false;
                  const [year, month, day] = dateStr.split('-');
                  const taskDate = new Date(Number(year), Number(month) - 1, Number(day));
                  taskDate.setHours(0, 0, 0, 0);
                  let taskEndDate = taskDate;
                  if (task.endDate) {
                    const endDateStr = task.endDate.split('T')[0];
                    const [endYear, endMonth, endDay] = endDateStr.split('-');
                    taskEndDate = new Date(Number(endYear), Number(endMonth) - 1, Number(endDay));
                    taskEndDate.setHours(0, 0, 0, 0);
                  }
                  if (taskDate >= endDate || taskEndDate < startDate) return false;
                  let ttype = 'team';
                  if (task.personalTask || task.personal_task) ttype = 'personal';
                  return ttype === sectionType;
                });
                const evs = matched.map(task => {
                  const titlePrefix = task.projectCode ? `[${task.projectCode}] ` : '';
                  const title = `${titlePrefix}${task.name || 'Unnamed task'}`;
                  const start = (task.issuedDate || task.createdDate || '').split('T')[0] || this.formatDateLocal(new Date());
                  const ev: any = {
                    id: String(task.id),
                    title,
                    start,
                    allDay: true,
                    extendedProps: { task }
                  };
                  if (task.endDate) {
                    const endDateObj = new Date(task.endDate);
                    endDateObj.setDate(endDateObj.getDate() + 1);
                    ev.end = endDateObj.toISOString().split('T')[0];
                  }
                  if (task.taskCategoryColorHex) {
                    ev.backgroundColor = task.taskCategoryColorHex;
                    ev.borderColor = task.taskCategoryColorHex;
                    ev.textColor = this.getContrastColor(task.taskCategoryColorHex);
                  }
                  return ev;
                });
                evs.sort((a, b) => {
                  const taskA = a.extendedProps?.task || {};
                  const taskB = b.extendedProps?.task || {};
                  const typeA = taskA.projectType || 'ZZZ';
                  const typeB = taskB.projectType || 'ZZZ';
                  const priorityA = typeA === 'COMMERCIAL' ? 1 : typeA === 'RESIDENTIAL' ? 2 : 3;
                  const priorityB = typeB === 'COMMERCIAL' ? 1 : typeB === 'RESIDENTIAL' ? 2 : 3;
                  if (priorityA !== priorityB) {
                    return priorityA - priorityB;
                  }
                  const codeA = (taskA.projectCode || '').toUpperCase();
                  const codeB = (taskB.projectCode || '').toUpperCase();
                  if (codeA < codeB) return -1;
                  if (codeA > codeB) return 1;
                  const nameA = (taskA.name || '').toUpperCase();
                  const nameB = (taskB.name || '').toUpperCase();
                  return nameA.localeCompare(nameB);
                });
                try { console.debug('FullCalendar events for section:', sectionType, ' -> events:', evs.length); } catch (_) {}
                successCallback(evs);
              } catch (err) {
                failureCallback(err);
              }
            },
            eventContent: function(arg: any) {},
            eventClick: function(info: any) {},
            datesSet: function(dateInfo: any) {}
          });
          (window as any).fcInstances[calId] = { calendar, rendered: false, elId: calEl.id };
          if (!collapsible) {
            calendar.render();
            (window as any).fcInstances[calId].rendered = true;
          }
          return section;
        } catch (e) {
          console.error('FullCalendar init failed, falling back to grid view', e);
        }
      }

      // Fallback: original grid rendering (if FullCalendar unavailable or failed)
      const grid = document.createElement('div');
      grid.id = contentId;
      grid.style.cssText = 'display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-top: 12px;';
      if (collapsible) grid.style.display = 'none';

      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const dayNumbers = [1,2,3,4,5];

      dayNumbers.forEach((dayNum, idx) => {
        const dayColumn = document.createElement('div');
        dayColumn.style.cssText = 'min-height: 100px;';
        const dayDate = new Date(monday);
        dayDate.setDate(monday.getDate() + idx);
        const dayOfMonth = dayDate.getDate();
        const dayHeader = document.createElement('div');
        dayHeader.style.cssText = 'font-size: 14px; font-weight: 700; color: #64748b; margin-bottom: 8px; text-align: center; padding: 6px; background: #f8fafc; border-radius: 6px;';
        dayHeader.innerHTML = `${dayNames[idx]}<br><span style="font-size: 16px; color: #0f172a;">${dayOfMonth}</span>`;
        dayColumn.appendChild(dayHeader);
        const dayTasks = tasksByDay[dayNum] || [];
        dayTasks.forEach((task: any) => {
          if (typeof (this as any).createTaskCard === 'function') {
            const taskCard = (this as any).createTaskCard(task);
            dayColumn.appendChild(taskCard);
          } else {
            const fallback = document.createElement('div');
            fallback.textContent = 'Falta createTaskCard';
            fallback.style.color = 'red';
            dayColumn.appendChild(fallback);
          }
        });
        grid.appendChild(dayColumn);
      });
      section.appendChild(grid);
      return section;
    }
  // Crea una sección de semana para el calendario
  createWeekSection(weekKey: string, weekData: any, allTasks: any[] = []): HTMLElement {
    const section = document.createElement('div');
    section.className = 'week-section';
    section.style.cssText = 'margin-bottom: 32px; background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);';

    // Week header removed - FullCalendar already shows this in its toolbar

    // Determine if this is the current week
    const [yearStr, monthStr, dayStr] = weekKey.split('-');
    const weekMonday = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr));
    const today = new Date();
    const currentMonday = this.getMonday(today);
    const isCurrentWeek = this.formatDateLocal(weekMonday) === this.formatDateLocal(currentMonday);

    // Check if sections have tasks
    const hasTeamTasks = weekData.team && Object.keys(weekData.team).length > 0;

    // Team tasks (single calendar with all tasks, visually separated by project type)
    if (hasTeamTasks) {
      const teamId = `team-${weekKey}`;
      // createTypeSection debe estar implementado en este componente o inyectado
      if (typeof (this as any).createTypeSection === 'function') {
        const teamSection = (this as any).createTypeSection('📌Schedule', weekData.team, weekKey, false, teamId, allTasks, isCurrentWeek);
        section.appendChild(teamSection);
      } else {
        // Si no existe, mostrar advertencia
        const warn = document.createElement('div');
        warn.textContent = 'Falta createTypeSection';
        warn.style.color = 'red';
        section.appendChild(warn);
      }
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
    // Tasks are ya filtradas por applyAllFilters antes de llamar a esta función
    // Solo renderiza el calendario directamente
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
