import { Injectable, OnDestroy } from '@angular/core';
import { Client, StompSubscription } from '@stomp/stompjs';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from '../../../../environment';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService implements OnDestroy {

  private client!: Client;
  private isConnected = false;

  private connectionAttempts = 0;
  private maxAttempts = 15;

  private subscriptions = new Map<string, StompSubscription>();
  // Registrations mantiene los topics que el frontend desea suscribir
  // y sus Subjects asociados. Se usa para (re)crear subscripciones
  // cuando se establece/reestablece la conexión.
  private registrations = new Map<string, Subject<any>>();

  constructor() {
    this.initializeWebSocket();
  }

  // ============================
  //   INICIALIZAR SOCKET
  // ============================
  private initializeWebSocket() {
    const wsUrl = this.getWebSocketUrl();

    this.client = new Client({
      // Usar WebSocket nativo cuando el servidor expone wss://
      brokerURL: wsUrl,
      reconnectDelay: 5000,
      heartbeatIncoming: 20000,
      heartbeatOutgoing: 10000,
      debug: (msg) => {
        if (msg.includes('ERROR') || msg.includes('CLOSE') || msg.includes('DISCONNECT')) {
          console.warn('WS DEBUG:', msg);
        }
      },
    });

    this.client.beforeConnect = (client: Client) => {
      this.connectionAttempts++;
      console.log(`🔄 Intentando conectar WebSocket (${this.connectionAttempts}/${this.maxAttempts})`);

      // Intentar enviar credenciales basadas en cookie en el CONNECT frame.
      // Muchos backends aceptan headers en el STOMP CONNECT; como mínimo
      // incluimos JSESSIONID/SESSION si existe, y como fallback `document.cookie`.
      try {
        const jsession = this.getCookie('JSESSIONID') || this.getCookie('SESSION');
        if (jsession) {
          client.connectHeaders = { ...(client.connectHeaders || {}), JSESSIONID: jsession, Cookie: `JSESSIONID=${jsession}` };
        } else if (typeof document !== 'undefined' && document.cookie) {
          client.connectHeaders = { ...(client.connectHeaders || {}), Cookie: document.cookie };
        }
      } catch (e) {
        // no crítico si falla la lectura de cookies
        console.warn('⚠️ No fue posible adjuntar cookies al CONNECT WS', e);
      }

      if (this.connectionAttempts >= this.maxAttempts) {
        console.error('❌ Límite de intentos alcanzado.');
        // Detener intentos adicionales de conexión llamando a deactivate en el cliente
        client.deactivate();
        return;
      }
    };

    this.client.onConnect = () => {
      console.log('✅ WebSocket conectado');
      this.connectionAttempts = 0;
      this.isConnected = true;

      // (Re)crear subscripciones para todos los topics registrados
      this.restoreRegistrations();
    };

    this.client.onStompError = (frame) => {
      console.error('❌ Error STOMP:', frame.headers['message']);
      console.error('📄 Detalle:', frame.body);
    };

    this.client.onWebSocketClose = (ev) => {
      this.isConnected = false;
      console.warn('⚠️ WebSocket cerrado', ev);
    };

    this.client.activate();
  }

  // Leer cookie por nombre (browser-side)
  private getCookie(name: string): string | null {
    try {
      const match = document.cookie.match(new RegExp('(^|; )' + name + '=([^;]*)'));
      return match ? decodeURIComponent(match[2]) : null;
    } catch (e) {
      return null;
    }
  }

  private getWebSocketUrl(): string {
    // environment.wsUrl puede ser http(s)://.../ws
    // Para brokerURL debe ser ws(s)://.../ws
    try {
      const raw = environment.wsUrl || '';
      const u = new URL(raw);
      const wsProtocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${wsProtocol}//${u.host}${u.pathname}`;
    } catch {
      // fallback seguro: asumir wss si viene https
      return rawToWs(environment.wsUrl);
    }

    function rawToWs(url: string): string {
      if (!url) return '';
      if (url.startsWith('https://')) return url.replace('https://', 'wss://');
      if (url.startsWith('http://')) return url.replace('http://', 'ws://');
      return url;
    }
  }

  // ======================================
  //          SUSCRIPCIÓN A TOPICS
  // ======================================
  public subscribe(topic: string): Observable<any> {
    const destination = `/topic/${topic}`;
    // Reuse existing registration if present
    if (this.registrations.has(destination)) {
      return this.registrations.get(destination)!.asObservable();
    }

    const subject = new Subject<any>();
    this.registrations.set(destination, subject);

    // If already connected, subscribe immediately
    if (this.isConnected) {
      const subscription = this.client.subscribe(destination, (message) => {
        try {
          const parsed = JSON.parse(message.body);
          subject.next(parsed);
        } catch (e) {
          console.error('❌ Error parseando mensaje WS:', e, message.body);
        }
      });
      this.subscriptions.set(destination, subscription);
    }
    return subject.asObservable();
  }

  private restoreRegistrations() {
    if (this.registrations.size === 0) return;

    // unsubscribe any stale subscriptions first
    try {
      this.subscriptions.forEach((sub, dest) => {
        try { sub.unsubscribe(); } catch (e) {}
      });
    } catch (e) {}
    this.subscriptions.clear();

    this.registrations.forEach((subject, destination) => {
      try {
        const subscription = this.client.subscribe(destination, (message) => {
          try {
            subject.next(JSON.parse(message.body));
          } catch (e) {
            console.error('❌ Error parseando mensaje WS:', e, message.body);
          }
        });
        this.subscriptions.set(destination, subscription);
      } catch (e) {
        console.warn('⚠️ No fue posible (re)subscribir topic', destination, e);
      }
    });
  }

  // ======================================
  //              ENVIAR MENSAJES
  // ======================================
  public send(destination: string, payload: any) {
    if (!this.isConnected) {
      console.warn('⚠️ No se puede enviar mensaje, WebSocket desconectado');
      return;
    }

    this.client.publish({
      destination: `/app/${destination}`,
      body: JSON.stringify(payload)
    });
  }

  // ======================================
  //             DESTRUCCIÓN
  // ======================================
  ngOnDestroy() {
    console.log('🔌 Cerrando WebSocket...');
    this.client.deactivate();
  }
}