import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class SubmenuService implements OnDestroy {
  private openSubject = new BehaviorSubject<boolean>(false);
  open$ = this.openSubject.asObservable();
  private routerSub?: Subscription;
  constructor(private router: Router) {
    // asegurar que la variable CSS refleje el estado inicial
    this.syncCssWidth();
    // Recalcular estado cuando cambie la ruta (evita que quede la clase `submenu--push`
    // activa si el usuario abre el menú en una página que empuja y luego navega a otra)
    try {
      this.routerSub = this.router.events.pipe(filter((e: any) => e instanceof NavigationEnd)).subscribe(() => this.syncCssWidth());
    } catch (e) {
      // ignore if router not available in this runtime
    }
  }

  toggle() {
    this.openSubject.next(!this.openSubject.value);
    this.syncCssWidth();
  }

  open() { this.openSubject.next(true); this.syncCssWidth(); }
  close() { this.openSubject.next(false); this.syncCssWidth(); }
  set(value: boolean) { this.openSubject.next(!!value); this.syncCssWidth(); }

// Mantener la interfaz sincronizada actualizando la variable CSS global utilizada por los diseños
  private syncCssWidth() {
    try {
      const open = !!this.openSubject.value;
      document.documentElement.style.setProperty('--sidebar-width', open ? '250px' : '0px');
      // Añadir clase para activar comportamiento "push" solo en páginas que lo necesitan
      try {
        const path = (typeof window !== 'undefined' && window.location && window.location.pathname) ? window.location.pathname : '';
        const wantsPush = /report-?hours|estimated-?hours|\btask\b|\/tasks?/.test(path);
        if (open && wantsPush) document.documentElement.classList.add('submenu--push'); else document.documentElement.classList.remove('submenu--push');
      } catch (e) {
        // ignore
      }
    } catch (e) {
     // ignorar (renderizado del lado del servidor o entornos de prueba)
    }
  }

  ngOnDestroy(): void {
    try { this.routerSub?.unsubscribe(); } catch (e) { /* ignore */ }
  }
}
