import { Injectable } from "@angular/core";
import { tap } from "rxjs/operators";
import { AuthService } from "./services/auth-api.service";
import { AuthStateService } from "./services/auth-state.service";
import { AuthTimerService } from "./services/auth-timer.service";

@Injectable({ providedIn: 'root' })
export class AuthFacade {

  constructor(
    private api: AuthService,
    private state: AuthStateService,
    private timer: AuthTimerService
  ) {}

  login(login: string, password: string) {
    return this.api.login({ login, password }).pipe(
      tap(() => {
        // 🔑 Empieza control de sesión
        this.timer.start();
      })
    );
  }

  logout() {
    this.timer.stop();
    this.api.logout().subscribe();
  }

  get isLoggedIn(): boolean {
    return this.state.isAuthenticated;
  }

  get role(): string | null {
    return this.state.role;
  }
}