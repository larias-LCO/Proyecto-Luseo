import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService as ReportAuthApi } from '../report-hours/auth/services/auth-api.service';
import { AuthStateService as ReportAuthState } from '../report-hours/auth/services/auth-state.service';
import { AuthService } from '../../core/services/auth.service'; // Importar el AuthService principal

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

  // Inyectar el AuthService principal
  private mainAuthService = inject(AuthService);

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
      next: (loginResponse) => {
        console.log('[Login] Respuesta del login:', loginResponse);
        const loginToken = loginResponse?.token || '';
        console.log('[Login] Token recibido:', loginToken ? 'SÍ' : 'NO');
        
        // El backend estableció las cookies (auth-token, username, role, employeeId, etc.)
        // El navegador las enviará automáticamente en cada petición con withCredentials: true
        
        // Pequeño delay para asegurar que las cookies se hayan establecido
        setTimeout(() => {
          // Después del login exitoso, obtener /auth/me para poblar el estado completo
          this.reportApi.me().subscribe({
            next: (me) => {
              // Almacenar la sesión completa (ya viene con employeeId desde el backend)
              this.reportState.setSession(me);
              
              // SINCRONIZAR CON AUTH.SERVICE.TS Y AUTH-SYNC.TS
              console.log('[Login] Sincronizando con AuthService principal:', me);
              try {
                // Extraer el rol del objeto me
                let role = me.role || '';
                
                // Si viene en authorities, extraerlo
                if (!role && me.authorities && Array.isArray(me.authorities)) {
                  const roleAuth = me.authorities.find((a: string) => a.startsWith('ROLE_'));
                  if (roleAuth) {
                    role = roleAuth.replace('ROLE_', '');
                  }
                }
                
                console.log('[Login] Rol detectado:', role);
                console.log('[Login] Usando token:', loginToken || 'NINGUNO');
                
                // Sincronizar con auth.state (usado por auth-sync.ts)
                const authState = {
                  token: loginToken, // Token de la respuesta del login
                  username: me.username || username,
                  role: role,
                  authorities: me.authorities || (role ? [`ROLE_${role}`] : []),
                  employeeId: me.employeeId,
                  expiresAtMillis: me.tokenExpiresAtMillis || (Date.now() + 3600000),
                  openMode: me.openMode || false,
                  serverDeltaMs: me.serverTimeMillis ? (me.serverTimeMillis - Date.now()) : 0
                };
                
                console.log('[Login] Guardando en auth.state:', authState);
                localStorage.setItem('auth.state', JSON.stringify(authState));
                
                // Sincronizar con auth.service.ts (claves individuales)
                if (role) {
                  localStorage.setItem('auth.roles', JSON.stringify([role]));
                  console.log('[Login] Guardando en auth.roles:', [role]);
                }
                
                // Recargar el estado en el AuthService principal
                this.mainAuthService.loadFromStorage();
                
                console.log('[Login] Estado final AuthService:', this.mainAuthService.getState());
                console.log('[Login] isOwner:', this.mainAuthService.isOwner());
                console.log('[Login] isAdmin:', this.mainAuthService.isAdmin());
                
              } catch (syncError) {
                console.error('[Login] Error sincronizando con AuthService:', syncError);
              }
              
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
