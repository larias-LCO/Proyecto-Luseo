import { Routes } from '@angular/router';
import { TeamComponent } from './pages/team/team'; 
import { TimeComponent } from './pages/time/time'; 
import { SubmenuComponent } from './core/components/submenu/submenu';
import { ParteDeHorasComponent } from './pages/parte-de-horas/parte-de-horas';


// este es un array que contiene objetos adentro, que son los obejtos?, las clases de las paginas que cree
export const routes: Routes = [
    { path: 'team', component: TeamComponent }, 
    { path: 'time', component: TimeComponent }, 
    { path: 'Submenu', component: SubmenuComponent }, 
    { path: '', redirectTo: 'team', pathMatch: 'full' },
    { path: 'parte-horas', component: ParteDeHorasComponent },  
];
