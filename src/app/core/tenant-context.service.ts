import { Injectable } from '@angular/core';
import { signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TenantContextService {
  private tenantUuidSignal = signal<string>('');
  private loginModeSignal = signal<'business' | 'system'>('business');
  private userRoleSignal = signal<string>('REQUESTER');

  tenantUuid = this.tenantUuidSignal.asReadonly();
  loginMode = this.loginModeSignal.asReadonly();
  userRole = this.userRoleSignal.asReadonly();

  constructor() {
    this.loadContextFromStorage();
  }

  private loadContextFromStorage(): void {
    const tenantUuid = localStorage.getItem('opac_tenant_uuid') || '';
    const loginMode = (localStorage.getItem('opac_login_mode') || 'business') as 'business' | 'system';
    const userRole = localStorage.getItem('opac_role') || 'REQUESTER';

    this.tenantUuidSignal.set(tenantUuid);
    this.loginModeSignal.set(loginMode);
    this.userRoleSignal.set(userRole);
  }

  setTenantContext(tenantUuid: string, loginMode: 'business' | 'system', userRole: string): void {
    this.tenantUuidSignal.set(tenantUuid);
    this.loginModeSignal.set(loginMode);
    this.userRoleSignal.set(userRole);

    localStorage.setItem('opac_tenant_uuid', tenantUuid);
    localStorage.setItem('opac_login_mode', loginMode);
    localStorage.setItem('opac_role', userRole);
  }

  isTenantUser(): boolean {
    return this.loginMode() === 'business';
  }

  isSystemAdmin(): boolean {
    return this.loginMode() === 'system';
  }

  getTenantUuid(): string {
    return this.tenantUuid();
  }

  clearContext(): void {
    this.tenantUuidSignal.set('');
    this.loginModeSignal.set('business');
    this.userRoleSignal.set('REQUESTER');

    localStorage.removeItem('opac_tenant_uuid');
    localStorage.removeItem('opac_login_mode');
    localStorage.removeItem('opac_role');
  }
}
