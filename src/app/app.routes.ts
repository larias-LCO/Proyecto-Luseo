import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { TeamComponent } from './pages/team/team';
import { authGuard } from './core/guards/auth.guard';
import { Proyectos } from './pages/proyectos/proyectos';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'team', component: TeamComponent, canActivate: [authGuard] },
  { path: 'proyectos', component: Proyectos, canActivate: [authGuard] },
  { path: '**', redirectTo: 'login' }
];
