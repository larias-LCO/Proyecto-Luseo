import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

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
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Initialize the form with validators after fb is available
    this.form = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(4)]]
    });
  }

  async ngOnInit() {
    // Bootstrap auth state (keeps configured apiBase from AuthService)
    await this.auth.bootstrap();
    // Intenta recuperar la última ruta visitada
    const lastRoute = localStorage.getItem('lastRoute');
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || lastRoute || '/proyectos';
    const s = this.auth.getState();
    if (s.authenticated) {
      this.router.navigateByUrl(this.returnUrl);
    }
  }

  async onSubmit() {
    this.errorMsg = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { username, password } = this.form.value;
    this.loading = true;
    try {
      await this.auth.login(username!, password!);
      // Después de login, navega a la última ruta guardada
      const lastRoute = localStorage.getItem('lastRoute');
      this.router.navigateByUrl(this.returnUrl || lastRoute || '/proyectos');
    } catch (e: any) {
      this.errorMsg = 'Usuario/contraseña inválidos';
    } finally {
      this.loading = false;
    }
  }
}
