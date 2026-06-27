import { computed, Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TenantContextService {
  private readonly tenantUuidSignal      = signal<string>('');
  private readonly tenantNameSignal      = signal<string>('');
  private readonly loginModeSignal       = signal<'business' | 'system'>('business');
  private readonly userRoleSignal        = signal<string>('REQUESTER');
  private readonly hasActiveLicenseSignal = signal<boolean>(false);

  tenantUuid       = this.tenantUuidSignal.asReadonly();
  tenantName       = this.tenantNameSignal.asReadonly();
  loginMode        = this.loginModeSignal.asReadonly();
  userRole         = this.userRoleSignal.asReadonly();
  hasActiveLicense = this.hasActiveLicenseSignal.asReadonly();

  /** True only for the ORQUE platform-owner tenant. */
  isPlatformOwner = computed(() =>
    this.tenantNameSignal().trim().toLowerCase() === 'orque'
  );

  /** True when the current user holds the SYSTEM_ADMIN role. */
  isSystemAdmin = computed(() =>
    this.userRoleSignal() === 'SYSTEM_ADMIN'
  );

  /** True when the user is a regular business user (not a system admin, not the platform owner). */
  isBusinessUser = computed(() =>
    !this.isPlatformOwner() && this.userRoleSignal() !== 'SYSTEM_ADMIN'
  );

  /**
   * True when the account is ready to use. ORQUE always passes.
   * Non-ORQUE tenants must apply a license first.
   */
  isAccountUnlocked = computed(() =>
    this.isPlatformOwner() || this.hasActiveLicenseSignal()
  );

  constructor() {
    this.loadContextFromStorage();
  }

  private loadContextFromStorage(): void {
    this.tenantUuidSignal.set(localStorage.getItem('opac_tenant_uuid') || '');
    this.tenantNameSignal.set(localStorage.getItem('opac_tenant_name') || '');
    this.loginModeSignal.set((localStorage.getItem('opac_login_mode') || 'business') as 'business' | 'system');
    this.userRoleSignal.set(localStorage.getItem('opac_role') || 'REQUESTER');
    this.hasActiveLicenseSignal.set(localStorage.getItem('opac_has_license') === 'true');
  }

  setTenantContext(tenantUuid: string, tenantName: string, loginMode: 'business' | 'system', userRole: string, hasActiveLicense = false): void {
    this.tenantUuidSignal.set(tenantUuid);
    this.tenantNameSignal.set(tenantName);
    this.loginModeSignal.set(loginMode);
    this.userRoleSignal.set(userRole);
    this.hasActiveLicenseSignal.set(hasActiveLicense);

    localStorage.setItem('opac_tenant_uuid',  tenantUuid);
    localStorage.setItem('opac_tenant_name',  tenantName);
    localStorage.setItem('opac_login_mode',   loginMode);
    localStorage.setItem('opac_role',         userRole);
    localStorage.setItem('opac_has_license',  String(hasActiveLicense));
  }

  /** Called after a license is successfully applied so the account unlocks without re-login. */
  markLicenseActivated(): void {
    this.hasActiveLicenseSignal.set(true);
    localStorage.setItem('opac_has_license', 'true');
  }

  isTenantUser(): boolean {
    return this.loginMode() === 'business';
  }

  getTenantUuid(): string {
    return this.tenantUuid();
  }

  clearContext(): void {
    this.tenantUuidSignal.set('');
    this.tenantNameSignal.set('');
    this.loginModeSignal.set('business');
    this.userRoleSignal.set('REQUESTER');
    this.hasActiveLicenseSignal.set(false);

    localStorage.removeItem('opac_tenant_uuid');
    localStorage.removeItem('opac_tenant_name');
    localStorage.removeItem('opac_login_mode');
    localStorage.removeItem('opac_role');
    localStorage.removeItem('opac_has_license');
  }
}
