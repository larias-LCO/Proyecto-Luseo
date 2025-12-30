import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth-api.service';
import { AuthStateService } from '../services/auth-state.service';
import { catchError, map, of, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {

  constructor(
    private api: AuthService,
    private state: AuthStateService,
    private router: Router
  ) {}

  canActivate() {
  //   if (this.state.isAuthenticated) return true;

  //   return this.api.me().pipe(
  //     tap(me => this.state.setSession(me)),
  //     map(() => true),
  //     catchError(() => {
  //       this.router.navigate(['/login']);
  //       return of(false);
  //     })
  //   );
  // }
  return true;
  }
}