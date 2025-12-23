import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthFacade } from '../report-hours/auth/auth.facade';
import { AuthService as ReportAuthApi } from '../report-hours/auth/services/auth-api.service';
import { AuthStateService as ReportAuthState } from '../report-hours/auth/services/auth-state.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, NgIf, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent implements OnInit {
  loading = false; 
  errorMsg = '';
  form!: FormGroup;

  private returnUrl = '/proyectos';

  constructor(
    private fb: FormBuilder,
    private facade: AuthFacade,
    private reportApi: ReportAuthApi,
    private reportState: ReportAuthState,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Initialize the form with validators after fb is available
    this.form = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(4)]]
    });
  }

  ngOnInit() {
    // Intenta recuperar sesión por cookie usando el API de report-hours
    const lastRoute = localStorage.getItem('lastRoute');
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || lastRoute || '/proyectos';
    this.reportApi.me().subscribe({
      next: (me) => {
        this.reportState.setSession(me);
        if (me?.authenticated) {
          this.router.navigateByUrl(this.returnUrl);
        }
      },
      error: () => {
        // no hay sesión activa; el usuario sigue en la página de login
      }
    });
  }

  onSubmit() {
    this.errorMsg = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { username, password } = this.form.value;
    this.loading = true;

    this.facade.login(username, password).subscribe({
      next: () => {
        // Después del login, obtener /auth/me para poblar el estado y navegar
        this.reportApi.me().subscribe({
          next: (me) => {
            this.reportState.setSession(me);
            this.router.navigateByUrl(this.returnUrl || localStorage.getItem('lastRoute') || '/proyectos');
            this.loading = false;
          },
          error: () => {
            this.errorMsg = 'Error obteniendo sesión después del login';
            this.loading = false;
          }
        });
      },
      error: () => {
        this.errorMsg = 'Usuario/contraseña inválidos';
        this.loading = false;
      }
    });
  }
}
