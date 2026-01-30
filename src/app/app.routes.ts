import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { TeamComponent } from './pages/team/team';
import { AuthGuard as ReportAuthGuard } from './pages/report-hours/auth/guards/auth.guard';
import { ProjectsPage } from './pages/projects/projects';
import { TasksPage } from './pages/task/task';
import { ReportHours } from './pages/report-hours/report-hours';
import { Schedule } from './pages/schedule/schedule';
import { EstimatedHoursPage } from './pages/estimated-hours/estimated-hours';
import { EstimatedHoursStep2Page } from './pages/estimated-hours/estimated-hours-step2';

export const routes: Routes = [
  { path: '', redirectTo: 'report-hours', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'team', component: TeamComponent, canActivate: [ReportAuthGuard] },
  { path: 'proyectos', component: ProjectsPage, canActivate: [ReportAuthGuard] },
  { path: 'tasks', component: TasksPage, canActivate: [ReportAuthGuard] },
  { path: 'report-hours', component: ReportHours, canActivate: [ReportAuthGuard] },
  { path: 'schedule', component: Schedule, canActivate: [ReportAuthGuard] },
  {path: 'estimated-hours', component: EstimatedHoursPage, canActivate: [ReportAuthGuard] },
<<<<<<< HEAD
  {path: 'estimated-hours/step2', component: EstimatedHoursStep2Page, canActivate: [ReportAuthGuard] },
=======
  { path: '**', redirectTo: 'login' }
>>>>>>> 9930ef0ffc536a36d8f31c66fef518f4c75b5540
];
