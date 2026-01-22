import { EventContentArg } from '@fullcalendar/core';
import { createComponent, ApplicationRef, ComponentRef, EnvironmentInjector } from '@angular/core';
import { GeneralTask } from '../models/general-task.model';
import { GeneralTaskCard } from '../components/general-task-card/general-task-card';
import { HolidayCard } from '../components/holiday-card/holiday-card';
import { darkenColor, getContrastColor } from './color.util';

/**
 * Renderiza el contenido personalizado de una tarjeta de general task usando componente Angular
 */
export function renderGeneralTaskCard(
  arg: EventContentArg, 
  appRef: ApplicationRef, 
  envInjector: EnvironmentInjector, 
  compact: boolean = true
): HTMLElement {
  const event = arg.event;
  const task = event.extendedProps?.['fullTask'] as GeneralTask;
  
  if (!task) {
    return createSimpleEventElement(event.title, event.backgroundColor || '#6c757d');
  }

  // Create wrapper for component
  const wrapper = document.createElement('div');
  wrapper.className = 'gt-card-wrapper';
  
  // Calculate colors
  const categoryColor = task.taskCategoryColorHex || '#6c757d';
  const darkerColor = darkenColor(categoryColor, 15);
  const textColor = getContrastColor(categoryColor);
  
  // Apply styles to wrapper with !important
  wrapper.style.cssText = `
    background-color: ${categoryColor} !important;
    border: 2px solid ${darkenColor(categoryColor, 30)} !important;
    border-left: 5px solid ${darkenColor(categoryColor, 40)} !important;
    color: ${textColor} !important;
    height: 100% !important;
    min-height: 28px !important;
    width: 100% !important;
    display: block !important;
    box-sizing: border-box !important;
    overflow: hidden !important;
  `;

  // Create Angular component instance
  const componentRef: ComponentRef<GeneralTaskCard> = createComponent(GeneralTaskCard, {
    environmentInjector: envInjector
  });

  // Setear inputs
  componentRef.instance.task = task;
  componentRef.instance.compact = compact;
  componentRef.instance.categoryColor = categoryColor;
  componentRef.instance.textColor = textColor;

  // Detectar cambios y attachar
  componentRef.changeDetectorRef.detectChanges();
  appRef.attachView(componentRef.hostView);

  // Agregar el componente al wrapper
  wrapper.appendChild(componentRef.location.nativeElement);

  return wrapper;
}

/**
 * Renderiza un festivo usando componente Angular
 */
export function renderHolidayCard(
  arg: EventContentArg, 
  appRef: ApplicationRef, 
  envInjector: EnvironmentInjector
): HTMLElement {
  const event = arg.event;
  const props = event.extendedProps;
  
  // Crear wrapper para el componente
  const wrapper = document.createElement('div');
  wrapper.className = 'holiday-card-wrapper';
  wrapper.style.height = '100%';
  wrapper.style.width = '100%';

  // Crear instancia del componente Angular
  const componentRef: ComponentRef<HolidayCard> = createComponent(HolidayCard, {
    environmentInjector: envInjector
  });

  // Setear inputs
  componentRef.instance.countryCode = props?.['countryCode'] || '';
  componentRef.instance.countryName = props?.['countryName'] || '';
  componentRef.instance.localName = props?.['localName'] || '';
  componentRef.instance.title = event.title;

  // Detectar cambios y attachar
  componentRef.changeDetectorRef.detectChanges();
  appRef.attachView(componentRef.hostView);

  // Agregar el componente al wrapper
  wrapper.appendChild(componentRef.location.nativeElement);

  return wrapper;
}

/**
 * Renderiza un evento simple (fallback)
 */
function createSimpleEventElement(title: string, bgColor: string): HTMLElement {
  const div = document.createElement('div');
  div.style.padding = '2px 4px';
  div.style.fontSize = '11px';
  div.style.fontWeight = '600';
  div.style.overflow = 'hidden';
  div.style.textOverflow = 'ellipsis';
  div.style.whiteSpace = 'nowrap';
  div.textContent = title;
  return div;
}
