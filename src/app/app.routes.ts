import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { TeamComponent } from './pages/team/team';
import { authGuard } from './core/guards/auth.guard';
import { ProjectsPage } from './pages/projects/projects';
import { TasksPage } from './pages/task/task';

export const routes: Routes = [
  // { path: '', redirectTo: 'proyectos', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'team', component: TeamComponent, canActivate: [authGuard] },
  { path: 'proyectos', component: ProjectsPage, canActivate: [authGuard] },
  { path: 'tasks', component: TasksPage, canActivate: [authGuard] },
  { path: '**', redirectTo: 'login' }
];
