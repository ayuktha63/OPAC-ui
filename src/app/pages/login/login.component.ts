import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  tenantName = '';
  username = '';
  password = '';
  loading = false;
  error: string | null = null;
  success: string | null = null;

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}

  ngOnInit() {
    // Check if already logged in
    const sessionData = sessionStorage.getItem('opac_session');
    if (sessionData) {
      this.router.navigate(['/tenant']);
    }
  }

  onLogin() {
    this.error = null;
    this.success = null;

    if (!this.tenantName.trim() || !this.username.trim() || !this.password.trim()) {
      this.error = 'Please fill in all fields';
      return;
    }

    this.loading = true;

    this.http.post<any>('http://localhost:8082/api/auth/login', {
      tenantName: this.tenantName.trim(),
      username: this.username.trim(),
      password: this.password.trim()
    }).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success && response.data) {
          // Store session data
          sessionStorage.setItem('opac_session', JSON.stringify(response.data));
          sessionStorage.setItem('opac_user', response.data.username);
          sessionStorage.setItem('opac_tenant', response.data.tenantName);
          sessionStorage.setItem('opac_tenant_id', response.data.tenantUuid);
          sessionStorage.setItem('opac_user_id', response.data.userId);
          sessionStorage.setItem('opac_role', 'SYSTEM_ADMIN');

          this.success = 'Login successful! Redirecting...';
          setTimeout(() => {
            this.router.navigate(['/tenant']);
          }, 1000);
        } else {
          this.error = response.message || 'Login failed. Please try again.';
        }
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 401) {
          this.error = 'Invalid tenant name, username, or password.';
        } else if (err.status === 400) {
          this.error = 'Please fill in all fields.';
        } else {
          this.error = err.error?.message || 'An error occurred. Please try again.';
        }
      }
    });
  }

  onClear() {
    this.tenantName = '';
    this.username = '';
    this.password = '';
    this.error = null;
    this.success = null;
  }
}
