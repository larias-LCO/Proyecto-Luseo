import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
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

  private returnUrl = '/report-hours';

  constructor(
    private fb: FormBuilder,
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
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || lastRoute || '/report-hours';
    this.reportApi.me().subscribe({
      next: (me) => {
        // Almacenar la sesión tal cual viene del backend (ya incluye employeeId)
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

    // Usar directamente reportApi para login con cookies
    this.reportApi.login({ login: username, password }).subscribe({
      next: () => {
        // El backend estableció las cookies (auth-token, username, role, employeeId, etc.)
        // El navegador las enviará automáticamente en cada petición con withCredentials: true
        
        // Pequeño delay para asegurar que las cookies se hayan establecido
        setTimeout(() => {
          // Después del login exitoso, obtener /auth/me para poblar el estado completo
          this.reportApi.me().subscribe({
            next: (me) => {
              // Almacenar la sesión completa (ya viene con employeeId desde el backend)
              this.reportState.setSession(me);
              
              if (me.authenticated) {
                this.router.navigateByUrl(this.returnUrl || '/report-hours');
              } else {
                this.errorMsg = 'Sesión no autenticada después del login';
              }
              this.loading = false;
            },
            error: () => {
              this.errorMsg = 'Error obteniendo sesión después del login';
              this.loading = false;
            }
          });
        }, 100);
      },
      error: () => {
        this.errorMsg = 'Usuario/contraseña inválidos';
        this.loading = false;
      }
    });
  }
}
