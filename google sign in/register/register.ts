import { Component, AfterViewInit, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LoginService } from '../login/services/loginservices';
import { getGoogleClientId } from '../config/auth.config';

declare const google: any;

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class Register implements AfterViewInit, OnInit, OnDestroy {

  username = '';
  email = '';
  password = '';
  confirmPassword = '';
  phone = '';
  address = '';

  constructor(
    private router: Router,
    private auth: LoginService
  ) {}

  ngAfterViewInit() {
    this.waitForGoogle();
  }

  private waitForGoogle() {
    if ((window as any).google?.accounts?.id) {
      this.initGoogle();
    } else {
      setTimeout(() => this.waitForGoogle(), 100);
    }
  }

  private initGoogle() {
    google.accounts.id.initialize({
      client_id: getGoogleClientId(),
      callback: (response: any) => this.handleGoogleRegister(response),
      ux_mode: "popup",
      auto_select: false,
      use_fedcm_for_prompt: false
    });

    google.accounts.id.renderButton(
      document.getElementById("googleBtn")!,
      {
        theme: "outline",
        size: "large",
        width: "100%"
      }
    );
  }

  private handleGoogleRegister(response: any) {
    if (!response?.credential) return;

    this.auth.googleRegister(response.credential).subscribe({
      next: (res: any) => {
        this.auth.saveSession(res.token, res.user);

        this.router.navigate(['/']);
      },
      error: (err) => {
        console.error("Google Register Failed:", err);
        alert("Google Registration failed");
      }
    });
  }
  onRegister() {
    if (!this.username || !this.email || !this.password || !this.confirmPassword) {
      alert('Please fill all required fields');
      return;
    }

    if (this.password !== this.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    const payload = {
      name: this.username,
      email: this.email,
      password: this.password,
      phone: this.phone,
      address: this.address
    };

    this.auth.register(payload).subscribe({
      next: () => {
        this.auth.login({
          email: this.email,
          password: this.password
        }).subscribe({
          next: (loginRes: any) => {
            this.auth.saveSession(loginRes.token, loginRes.user);
            this.router.navigate(['/']);
          },
          error: () => {
            alert('Registration done, but login failed. Please login manually.');
            this.router.navigate(['/login']);
          }
        });
      },
      error: () => alert('Registration failed')
    });
  }
  ngOnInit() {
    document.body.classList.add("register-page");
  }

  ngOnDestroy() {
    document.body.classList.remove("register-page");
  }
}
