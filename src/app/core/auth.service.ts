import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AppConfigService } from './app-config.service';

export interface LoginRequest {
  username: string;
  password: string;
  tenantName?: string;
  loginMode: 'system' | 'business';
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data?: {
    uuid: string;
    username: string;
    email: string;
    role: string;
    tenantUuid?: string;
    tenantName?: string;
    isPlatformOwner?: boolean;
    hasActiveLicense?: boolean;
    hasCrmLicense?: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private readonly http: HttpClient, private readonly cfg: AppConfigService) {}

  private get backendUrl(): string { return this.cfg.opacApiUrl; }

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.backendUrl}/api/auth/login`, request)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            // Store user info
            localStorage.setItem('opac_user', JSON.stringify(response.data));
            localStorage.setItem('opac_role', response.data.role);
            localStorage.setItem('opac_login_mode', request.loginMode);
            if (response.data.tenantUuid) {
              localStorage.setItem('opac_tenant_uuid', response.data.tenantUuid);
              localStorage.setItem('opac_tenant_name', response.data.tenantName || '');
            }
            localStorage.setItem('opac_has_crm_license', String(!!response.data.hasCrmLicense));
          }
          return response;
        }),
        catchError(error => {
          const errorMessage = error.error?.message || error.error?.error || 'Login failed';
          return throwError(() => ({
            message: errorMessage,
            status: error.status
          }));
        })
      );
  }

  getSsoToken(username: string, tenantUuid: string): Observable<{ success: boolean; token: string; username: string; email: string }> {
    return this.http.post<any>(`${this.backendUrl}/api/sso/token`, {}, {
      headers: {
        'x-user': username,
        'x-tenant-uuid': tenantUuid
      }
    });
  }

  logout(): void {
    localStorage.removeItem('opac_user');
    localStorage.removeItem('opac_role');
    localStorage.removeItem('opac_login_mode');
    localStorage.removeItem('opac_tenant_uuid');
    localStorage.removeItem('opac_tenant_name');
    localStorage.removeItem('opac_has_crm_license');
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('opac_user');
  }

  getCurrentUser(): any {
    const user = localStorage.getItem('opac_user');
    return user ? JSON.parse(user) : null;
  }
}
