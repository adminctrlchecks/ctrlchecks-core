import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Output,
  AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LoginService } from './services/loginservices';
import { LoginResponse } from '../models.ts/login-response.model';
import { getGoogleClientId } from '../config/auth.config';

declare const google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class login implements AfterViewInit {

  @Output() close = new EventEmitter<void>();

  email = '';
  password = '';
  showDialog = false;
  error = '';
  googleError = '';
  showPassword = false;
  private googleRendered = false;
  private googleScriptInjected = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private loginService: LoginService,
    private cdr: ChangeDetectorRef
  ) {}

  /* ---------------- GOOGLE INIT ---------------- */

  ngAfterViewInit() {
    this.ensureGoogleScript();
    this.waitForGoogle();
  }

  /** Inject the Google script if it is not already on the page. */
  private ensureGoogleScript() {
    if ((window as any).google?.accounts?.id) {
      return;
    }
    if (this.googleScriptInjected || document.querySelector('script[data-gsi-client]')) {
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset['gsiClient'] = 'true';
    script.onload = () => this.initGoogle();
    document.head.appendChild(script);
    this.googleScriptInjected = true;
  }

  private waitForGoogle() {
    if ((window as any).google?.accounts?.id) {
      this.initGoogle();
    } else {
      setTimeout(() => this.waitForGoogle(), 100);
    }
  }

  private initGoogle() {
    if (this.googleRendered) return;
    const target = document.getElementById('googleLoginBtn');
    if (!target) return;
    try {
      google.accounts.id.initialize({
        client_id: getGoogleClientId(),
        callback: (response: any) => this.handleGoogleLogin(response),
        ux_mode: 'popup',
        auto_select: false
      });

      target.replaceChildren();
      google.accounts.id.renderButton(target, {
        theme: 'outline',
        size: 'large'
      });

      this.googleRendered = true;
    } catch (error) {
      this.googleError = 'Google Sign-In is unavailable on this origin.';
      this.detectChangesSafe();
      console.error('Google button init failed:', error);
    }
  }

  /* ---------------- GOOGLE LOGIN ---------------- */

  private handleGoogleLogin(response: any) {
    if (!response?.credential) return;
    this.googleError = '';

    this.loginService.googleRegister(response.credential).subscribe({
      next: (res: any) => {
        // ✅ Save session
        this.loginService.saveSession(res.token, res.user);

        this.showDialog = false;
        this.detectChangesSafe();
        this.close.emit();
        this.router.navigate(['/']);
      },
      error: err => {
        console.error('Google login failed:', err);
        if (err?.status === 404) {
          this.googleError = 'Google login is not enabled on backend yet. Please use email/password for now.';
        } else if (err?.status === 401) {
          this.googleError = 'Google authentication failed. Please try again.';
        } else if (err?.status === 0) {
          this.googleError = 'Unable to reach server. Please check internet/DNS and try again.';
        } else {
          this.googleError = err?.error?.message || 'Google login failed.';
        }
        this.detectChangesSafe();
      }
    });
  }

  /* ---------------- NORMAL LOGIN ---------------- */

  onLogin() {
    this.error = '';

    this.loginService.login({
      email: this.email,
      password: this.password
    }).subscribe({
      next: (res: LoginResponse) => {
        // ✅ Save session
        this.loginService.saveSession(res.token, res.user);

        this.showDialog = true;
        this.error = '';
        this.detectChangesSafe();
      },
      error: err => {
        console.error('Login failed:', err);
        this.showDialog = false;
        this.error =
          err?.error?.message ||
          err?.error?.error ||
          'Invalid email or password. Please try again.';
        this.detectChangesSafe();
      }
    });
  }

  /* ---------------- UI HELPERS ---------------- */

  onBackgroundClick() {
    this.router.navigate(['/']);
  }




  closeDialog() {
    this.showDialog = false;
    this.detectChangesSafe();
    this.close.emit();
    this.router.navigate(['/']);

    // Navigate back to the previous page or home
    const previousUrl = this.router.parseUrl(this.router.routerState.root.component?.toString() || '');
    if (document.referrer && !document.referrer.includes('/login')) {
      window.history.back();
    } else {
      this.router.navigate(['/']);
    }
  }

  private detectChangesSafe(): void {
    try {
      this.cdr.detectChanges();
    } catch {
      // view already destroyed
    }
  }
}
