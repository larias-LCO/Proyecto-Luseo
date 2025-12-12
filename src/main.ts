
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app';
import './app/core/services/auth-sync';

// Inicializa la base de la API para Auth
(window as any).Auth.bootstrap({ apiBase: 'https://api.luseoeng.com' });

// Polyfills para librerías que esperan entorno Node
// Corrige errores como "global is not defined" en sockjs-client
(window as any).global = window as any;
(window as any).process = (window as any).process || { env: {} };
(window as any).Buffer = (window as any).Buffer || undefined;

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
