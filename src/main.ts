import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app';
import './app/core/services/auth-sync';


bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
