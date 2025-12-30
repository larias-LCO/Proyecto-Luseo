import { Injectable } from '@angular/core';

export type NotificationType = 'info' | 'success' | 'error' | 'warning';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private container?: HTMLElement;

  private ensureContainer() {
    if (this.container) return this.container;
    const c = document.createElement('div');
    c.className = 'rh-notification-container';
    // basic positioning and layout
    Object.assign(c.style, {
      position: 'fixed',
      right: '16px',
      top: '16px',
      zIndex: '1400',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      pointerEvents: 'none'
    } as any);
    document.body.appendChild(c);
    this.container = c;
    return c;
  }

  show(message: string, type: NotificationType = 'info', duration = 4000) {
    const c = this.ensureContainer();
    const n = document.createElement('div');
    n.className = `rh-notification rh-notification--${type}`;
    n.textContent = message;
    Object.assign(n.style, {
      pointerEvents: 'auto',
      padding: '10px 14px',
      borderRadius: '8px',
      color: '#fff',
      minWidth: '140px',
      maxWidth: '360px',
      boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
      opacity: '0',
      transform: 'translateY(-6px)',
      transition: 'opacity 220ms ease, transform 220ms ease',
      fontSize: '13px'
    } as any);

    // type-specific background
    switch (type) {
      case 'success': n.style.background = 'linear-gradient(90deg,#16a34a,#059669)'; break;
      case 'error': n.style.background = 'linear-gradient(90deg,#dc2626,#b91c1c)'; break;
      case 'warning': n.style.background = 'linear-gradient(90deg,#f59e0b,#f97316)'; break;
      default: n.style.background = 'linear-gradient(90deg,#0ea5a4,#06b6d4)';
    }

    c.appendChild(n);

    // entrance
    requestAnimationFrame(() => {
      n.style.opacity = '1';
      n.style.transform = 'translateY(0)';
    });

    const remove = () => {
      try {
        n.style.opacity = '0';
        n.style.transform = 'translateY(-6px)';
        setTimeout(() => { try { n.remove(); } catch (e) {} }, 240);
      } catch (e) {}
    };

    const timer = setTimeout(remove, duration);

    // allow click to dismiss immediately
    n.addEventListener('click', () => {
      clearTimeout(timer);
      remove();
    });
  }

  clearAll() {
    try {
      if (!this.container) return;
      this.container.innerHTML = '';
    } catch (e) {}
  }
}
