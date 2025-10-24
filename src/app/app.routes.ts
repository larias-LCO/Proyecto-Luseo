import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { TeamComponent } from './pages/team/team';
import { authGuard } from './core/guards/auth.guard';
import { ProjectsComponent } from './pages/projects/projects';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'team', component: TeamComponent, canActivate: [authGuard] },
  { path: 'proyectos', component: ProjectsComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'login' }
];
