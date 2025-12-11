export function saveFullCalendarState(): void {
	try {
		(window as any)._fcStateCache = (window as any)._fcStateCache || {};
		if (!(window as any).fcInstances) return;
		Object.keys((window as any).fcInstances).forEach(key => {
			try {
				const inst = (window as any).fcInstances[key];
				if (!inst || !inst.elId || !inst.calendar) return;
				const el = document.getElementById(inst.elId);
				if (!el) return;
				const wrapper = el.closest && el.closest('div');
				const wrapperId = wrapper && (wrapper as HTMLElement).id ? (wrapper as HTMLElement).id : null;
				if (!wrapperId) return;

				const viewType = (inst.calendar.view && inst.calendar.view.type) ? inst.calendar.view.type : (inst.calendar.getView ? inst.calendar.getView().type : null);
				const currentDate = inst.calendar.getDate ? inst.calendar.getDate().toISOString() : null;
				const scrollTop = wrapper && typeof (wrapper as HTMLElement).scrollTop === 'number' ? (wrapper as HTMLElement).scrollTop : 0;

				(window as any)._fcStateCache[wrapperId] = { viewType, currentDate, scrollTop };
			} catch (e) {
				console.warn('saveFullCalendarState: instance snapshot failed', e);
			}
		});
	} catch (e) {
		console.warn('saveFullCalendarState failed', e);
	}
}
import { createCalendarLegend, renderTasksView } from './task';

function groupTasksByWeekAndType(tasks: any[]): Record<string, { team: any; personal: any }> {
	const result: Record<string, { team: any; personal: any }> = {};
	tasks.forEach(task => {
		const week = formatDateLocal(getMonday(task.issuedDate || task.createdDate || new Date()));
		if (!result[week]) result[week] = { team: {}, personal: {} };
		if (!result[week].team['all']) result[week].team['all'] = [];
		result[week].team['all'].push(task);
	});
	return result;
}

function getMonday(date: Date | string): Date {
	const d = new Date(date);
	const day = d.getDay();
	const diff = d.getDate() - day + (day === 0 ? -6 : 1);
	d.setDate(diff);
	d.setHours(0, 0, 0, 0);
	return d;
}

function formatDateLocal(d: Date | string): string {
	const date = new Date(d);
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

function createWeekSection(weekKey: string, weekData: any, tasks: any[]): HTMLElement {
	const section = document.createElement('div');
	section.className = 'week-section';
	section.innerHTML = `<div style='font-weight:700;color:#0f172a;margin-bottom:12px;'>Semana: ${weekKey}</div>`;
	const list = document.createElement('ul');
	(weekData.team['all'] || []).forEach((task: any) => {
		const item = document.createElement('li');
		item.textContent = task.name || 'Tarea';
		list.appendChild(item);
	});
	section.appendChild(list);
	return section;
}

export function renderCalendarView(
	container: HTMLElement,
	tasks: any[],
	weeksToShow: string[] | null = null
): void {
	if (!container) return;

	// Create and insert legend/guide at the top
	const legend = createCalendarLegend(tasks || []);

	// Group tasks by week and type
	const tasksByWeek = groupTasksByWeekAndType(tasks || []);

	// Compute default weeks (current week and previous)
	const now = new Date();
	const currentMonday = getMonday(now);
	const previousMonday = new Date(currentMonday);
	previousMonday.setDate(previousMonday.getDate() - 7);

	const currentWeekKey = formatDateLocal(currentMonday);
	const previousWeekKey = formatDateLocal(previousMonday);

	// Decide which weeks to render: use weeksToShow if provided, otherwise current then previous
	let weeksToRender;
	if (Array.isArray(weeksToShow) && weeksToShow.length > 0) {
		weeksToRender = weeksToShow;
	} else {
		weeksToRender = [currentWeekKey, previousWeekKey];
	}

	// Ensure keys exist in grouped map
	weeksToRender.forEach(k => {
		if (!tasksByWeek[k]) tasksByWeek[k] = { team: {}, personal: {} };
	});

	// Clear container and insert legend first, then weeks
	container.innerHTML = '';
	container.appendChild(legend);

	weeksToRender.forEach(weekKey => {
		const weekData = tasksByWeek[weekKey] || { team: {}, personal: {} };
		const section = createWeekSection(weekKey, weekData, tasks);
		container.appendChild(section);
	});

	// After DOM insertion, ensure FullCalendar instances render/update size if visible
	try {
		if ((window as any).fcInstances) {
			Object.keys((window as any).fcInstances).forEach(key => {
				const inst = (window as any).fcInstances[key];
				if (!inst) return;
				const el = document.getElementById(inst.elId);
				if (!el) return;
				const wrapper = el.closest && el.closest('div');
				const style = wrapper ? window.getComputedStyle(wrapper) : null;
				const visible = style ? (style.display !== 'none' && style.visibility !== 'hidden') : true;

				try {
					if (visible && !inst.rendered) {
						inst.calendar.render();
						inst.rendered = true;
					} else if (visible && inst.rendered) {
						if (typeof inst.calendar.updateSize === 'function') inst.calendar.updateSize();
					}

					try {
						if (!inst._holidayRefetched && typeof inst.calendar.refetchEvents === 'function') {
							setTimeout(() => {
								try { inst.calendar.refetchEvents(); } catch (__) {}
							}, 10);
							inst._holidayRefetched = true;
						}
					} catch (e) { /* ignore refetch errors */ }
				} catch (e) {
					try { if (!inst.rendered) inst.calendar.render(); } catch (_) {}
				}
			});
		}
	} catch (e) { console.warn('Post-render FullCalendar adjustments failed', e); }
}
// ====== Ayudantes para preservar el estado de la interfaz de usuario de FullCalendar en todas las renderizaciones completas ======
    // Estos ayudantes son intencionalmente pequeños y no invasivos: capturan instantáneas por calendario
    // el tipo de vista actual, la fecha actual y la posición de desplazamiento del contenedor, guárdelo en
// Restaura el estado completo de FullCalendar desde el cache global
// window._fcStateCache y luego restaurar después de que se complete una nueva renderización completa.


export async function restoreFullCalendarState() {
	try {
		const cache = (window as any)._fcStateCache || {};
		if (!(window as any).fcInstances) return;
		Object.keys((window as any).fcInstances).forEach(key => {
			try {
				const inst = (window as any).fcInstances[key];
				if (!inst || !inst.elId || !inst.calendar) return;
				const el = document.getElementById(inst.elId);
				if (!el) return;
				const wrapper = el.closest && el.closest('div');
				const wrapperId = wrapper && wrapper.id ? wrapper.id : null;
				if (!wrapperId) return;
				const state = cache[wrapperId];
				if (!state) return;

				// Restaurar vista y fecha si están presentes
				try {
					if (state.viewType && inst.calendar.getView && inst.calendar.getView().type !== state.viewType) {
						try { inst.calendar.changeView(state.viewType); } catch (e) { /* ignore */ }
					}
					if (state.currentDate) {
						try { inst.calendar.gotoDate(new Date(state.currentDate)); } catch (e) { /* ignore */ }
					}
				} catch (e) { /* ignore per-instance restore errors */ }

				// Restaurar posición de scroll del wrapper
				try {
					if (wrapper && typeof state.scrollTop === 'number') wrapper.scrollTop = state.scrollTop;
				} catch (e) { /* ignore */ }
			} catch (e) {
				console.warn('restoreFullCalendarState: instance restore failed', e);
			}
		});
	} catch (e) {
		console.warn('restoreFullCalendarState failed', e);
	} finally {
		// Limpiar cache después de restaurar para evitar restauraciones obsoletas
		try { (window as any)._fcStateCache = {}; } catch (_) {}
	}
}
// Prefiere la recuperación no invasiva de instancias de FullCalendar cuando sea posible para evitar re-renderizaciones completas de DOM
export function tryRefetchCalendars(): boolean {
		try {
			if (!(window as any).fcInstances) return false;
			const instances = Object.values((window as any).fcInstances).filter(Boolean) as Array<{ calendar?: any }>;
			if (!instances.length) return false;
			instances.forEach(inst => {
				try {
					if (inst && inst.calendar && typeof inst.calendar.refetchEvents === 'function') {
						inst.calendar.refetchEvents();
					}
				} catch (e) { /* ignore per-instance errors */ }
			});
			return true;
		} catch (e) { console.warn('tryRefetchCalendars failed', e); return false; }
	}

// Debounce para refetch o render completo de tareas
let _wsDebounceTimer: any = null;
export function debounceRefetchOrFullRender() {
		if (_wsDebounceTimer) clearTimeout(_wsDebounceTimer);
		_wsDebounceTimer = setTimeout(async () => {
			try {
				const didRefetch = tryRefetchCalendars();
				if (!didRefetch) {
					try { saveFullCalendarState(); } catch (err) {}
					await renderTasksView();
					try { await restoreFullCalendarState(); } catch (err) {}
				}
			} catch (e) {
				console.warn('debounceRefetchOrFullRender failed', e);
				// Depuración extra: verifica existencia de funciones
				console.log('tryRefetchCalendars:', typeof tryRefetchCalendars);
				console.log('saveFullCalendarState:', typeof saveFullCalendarState);
				console.log('renderTasksView:', typeof renderTasksView);
				console.log('restoreFullCalendarState:', typeof restoreFullCalendarState);
			}
		}, 50);
	}