import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HelpContent } from '../models/help-content.model';

@Injectable({
  providedIn: 'root'
})
export class HelpPanelService {
  private isOpenSubject = new BehaviorSubject<boolean>(false);
  private contentSubject = new BehaviorSubject<HelpContent | null>(null);

  public isOpen$: Observable<boolean> = this.isOpenSubject.asObservable();
  public content$: Observable<HelpContent | null> = this.contentSubject.asObservable();

  /**
   * Alterna el estado del panel de ayuda (abierto/cerrado)
   */
  toggle(): void {
    this.isOpenSubject.next(!this.isOpenSubject.value);
  }

  /**
   * Abre el panel de ayuda
   */
  open(): void {
    this.isOpenSubject.next(true);
  }

  /**
   * Cierra el panel de ayuda
   */
  close(): void {
    this.isOpenSubject.next(false);
  }

  /**
   * Configura el contenido de ayuda a mostrar
   * @param content Contenido de ayuda específico o null para limpiar
   */
  setContent(content: HelpContent | null): void {
    this.contentSubject.next(content);
  }

  /**
   * Limpia el contenido de ayuda
   */
  clearContent(): void {
    this.contentSubject.next(null);
  }

  /**
   * Obtiene el estado actual del panel
   */
  get isOpen(): boolean {
    return this.isOpenSubject.value;
  }

  /**
   * Obtiene el contenido actual
   */
  get content(): HelpContent | null {
    return this.contentSubject.value;
  }
}
