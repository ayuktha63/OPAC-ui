import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AppConfigService } from '../../core/app-config.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['../../app.css']
})
export class ForgotPasswordComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly cfg = inject(AppConfigService);
  private readonly cdr = inject(ChangeDetectorRef);

  usernameOrEmail = '';
  loading = false;
  errorMessage = '';
  submitted = false;

  submit(): void {
    this.errorMessage = '';

    if (!this.usernameOrEmail) {
      this.errorMessage = 'Username or email is required';
      return;
    }

    this.loading = true;
    this.http.post<{ success: boolean; message: string }>(
      `${this.cfg.opacApiUrl}/api/auth/forgot-password`,
      { usernameOrEmail: this.usernameOrEmail }
    ).subscribe({
      next: () => {
        this.loading = false;
        this.submitted = true;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        // Same generic message on error as on success — don't reveal whether the account exists.
        this.submitted = true;
        this.cdr.detectChanges();
      }
    });
  }

  backToLogin(): void {
    this.router.navigate(['/']);
  }
}
