import { Injectable, OnDestroy, inject } from '@angular/core';
import { Client, StompSubscription } from '@stomp/stompjs';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from '../../../../environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService implements OnDestroy {

  private client!: Client;
  private isConnected = false;

  private connectionAttempts = 0;
  private maxAttempts = 15;

  private subscriptions = new Map<string, StompSubscription>();
  private pendingSubscriptions: Array<{ topic: string, subject: Subject<any> }> = [];

  private authService = inject(AuthService);

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
      // Agregar headers de autenticación
      connectHeaders: this.getAuthHeaders(),
      debug: (msg) => {
        if (msg.includes('ERROR') || msg.includes('CLOSE') || msg.includes('DISCONNECT')) {
          console.warn('WS DEBUG:', msg);
        }
      },
    });

    this.client.beforeConnect = (client: Client) => {
      this.connectionAttempts++;
      console.log(`🔄 Intentando conectar WebSocket (${this.connectionAttempts}/${this.maxAttempts})`);

      // Actualizar headers antes de cada intento de conexión
      client.connectHeaders = this.getAuthHeaders();

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

      this.restorePendingSubscriptions();
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

  private getAuthHeaders(): Record<string, string> {
    const token = this.authService.getState().token;
    if (token) {
      return {
        'Authorization': `Bearer ${token}`
      };
    }
    return {};
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
    const subject = new Subject<any>();

    if (!this.isConnected) {
      console.warn(`⏳ Guardando suscripción pendiente: ${destination}`);
      this.pendingSubscriptions.push({ topic, subject });
      return subject.asObservable();
    }

    const subscription = this.client.subscribe(destination, (message) => {
      try {
        const parsed = JSON.parse(message.body);
        subject.next(parsed);
      } catch (e) {
        console.error('❌ Error parseando mensaje WS:', e, message.body);
      }
    });

    this.subscriptions.set(destination, subscription);
    return subject.asObservable();
  }

  private restorePendingSubscriptions() {
    if (this.pendingSubscriptions.length === 0) return;

    const pending = [...this.pendingSubscriptions];
    this.pendingSubscriptions = [];

    pending.forEach(({ topic, subject }) => {
      const destination = `/topic/${topic}`;

      const subscription = this.client.subscribe(destination, (message) => {
        try {
          subject.next(JSON.parse(message.body));
        } catch (e) {
          console.error('❌ Error parseando mensaje:', e);
        }
      });

      this.subscriptions.set(destination, subscription);
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