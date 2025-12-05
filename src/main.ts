
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app';
import './app/core/services/auth-sync';

// Inicializa la base de la API para Auth
(window as any).Auth.bootstrap({ apiBase: 'https://api.luseoeng.com' });

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
