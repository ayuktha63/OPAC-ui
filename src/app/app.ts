import { Component, ElementRef, HostListener, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterOutlet } from '@angular/router';
import { ContextSwitcherComponent, OToastComponent, OAppSwitcherComponent, AppItem } from 'orque-ui';
import { SystemSettingsService } from './core/system-settings.service';
import { TenantContextService } from './core/tenant-context.service';
import { AuthService } from './core/auth.service';
import { ToastService } from './core/toast.service';
import { PageStoreService } from './core/page-store.service';
import { AppConfigService } from './core/app-config.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, ContextSwitcherComponent, OToastComponent, OAppSwitcherComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private get backendUrl(): string { return this.cfgSvc.opacApiUrl; }
  private get crmAppUrl(): string  { return this.cfgSvc.crmAppUrl; }

  // ── Login State ─────────────────────────────────────────
  isLoggedIn  = !!localStorage.getItem('opac_user');
  isLoading   = false;
  loginMode: 'business' | 'system' = (localStorage.getItem('opac_login_mode') as 'business' | 'system') || 'business';
  companyName = '';
  username    = '';
  password    = '';
  userRole    = localStorage.getItem('opac_role') || 'REQUESTER';


  // ── Shell Navigation ─────────────────────────────────────
  currentContext = 'OPAC';

  // ── App Switcher ──────────────────────────────────────────
  crmLaunching = false;
  showNoLicensePopup = false;

  get hasCrmLicense(): boolean {
    return localStorage.getItem('opac_has_crm_license') === 'true';
  }

  get appSwitcherApps(): AppItem[] {
    if (!this.isLoggedIn || this.isPlatformOwner) return [];
    return [{
      key: 'crm',
      label: 'CRM',
      desc: 'Customer Management',
      iconPath: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 1-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
      color: this.hasCrmLicense ? '#7c3aed' : '#9ca3af',
      loading: this.crmLaunching,
      action: () => this.launchCrm()
    }];
  }

  launchCrm() {
    if (!this.hasCrmLicense) {
      this.showNoLicensePopup = true;
      return;
    }
    const user = JSON.parse(localStorage.getItem('opac_user') || '{}');
    if (!user.username) { this.toastSvc.error('Session expired. Please log in again.'); return; }
    this.crmLaunching = true;
    // Open the window synchronously (on the user-gesture stack) to avoid popup blockers.
    // We'll navigate it once the SSO token arrives.
    const crmWindow = globalThis.open('', '_blank');
    this.authSvc.getSsoToken(user.username, user.tenantUuid || '').subscribe({
      next: (res) => {
        this.crmLaunching = false;
        const url = `${this.crmAppUrl}/sso?token=${encodeURIComponent(res.token)}`;
        if (crmWindow) {
          crmWindow.location.href = url;
        } else {
          globalThis.location.href = url;
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.crmLaunching = false;
        if (crmWindow) crmWindow.close();
        this.toastSvc.error('Failed to launch CRM. Please try again.');
        this.cdr.markForCheck();
      }
    });
  }

  closeNoLicensePopup() {
    this.showNoLicensePopup = false;
  }

  // ── Active Tenant Context ────────────────────────────────
  activeTenant: any = (() => {
    const uuid = localStorage.getItem('opac_tenant_uuid');
    const name = localStorage.getItem('opac_tenant_name');
    return uuid ? { uuid, tenant_name: name, company_name: name } : null;
  })();
  activeTenantsList: any[] = [];

  // ── Topbar Dropdowns ────────────────────────────────────
  settingsOpen     = false;
  profileOpen      = false;
  showProfileModal = false;

  readonly settingsNavItems = [
    { label: 'User Master',          resource: 'users',                icon: 'users' },
    { label: 'Role Master',          resource: 'roles',                icon: 'shield' },
    { label: 'Session Management',   resource: 'sessions',             icon: 'monitor' },
    { label: 'Audit Log',            resource: 'audits',               icon: 'file-text' },
    { label: 'Tenant Configuration', resource: 'tenant-configuration', icon: 'settings' }
  ];

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
    private readonly elRef: ElementRef,
    private readonly cdr: ChangeDetectorRef,
    readonly settingsSvc: SystemSettingsService,
    private readonly tenantContextSvc: TenantContextService,
    private readonly authSvc: AuthService,
    private readonly toastSvc: ToastService,
    private readonly pageStore: PageStoreService,
    private readonly cfgSvc: AppConfigService
  ) {}

  ngOnInit() {
    this.loadActiveTenants();
    this.restoreSession();
  }

  private restoreSession(): void {
    if (this.authSvc.isLoggedIn()) {
      const user = this.authSvc.getCurrentUser();
      this.userRole = user?.role || 'REQUESTER';
      this.activeTenant = {
        uuid: localStorage.getItem('opac_tenant_uuid') || '',
        tenant_name: localStorage.getItem('opac_tenant_name') || '',
        company_name: localStorage.getItem('opac_tenant_name') || ''
      };
      this.isLoggedIn = true;
      this.refreshCrmLicenseFlag();
    }
  }

  /** Refresh the CRM license flag from the backend so the app switcher reflects
   *  the latest license state without requiring a re-login. */
  private refreshCrmLicenseFlag(): void {
    this.pageStore.getList('/api/my-crm-license').subscribe({
      next: (res: any) => {
        const hasLicense = !!(res?.hasCrmLicense ?? (res as any[])?.[0]?.hasCrmLicense);
        localStorage.setItem('opac_has_crm_license', String(hasLicense));
        this.cdr.markForCheck();
      },
      error: () => { /* keep existing value on network error */ }
    });
  }

  /** Tenant name shown in the topbar badge. Reads directly from localStorage so it's
   *  always current without requiring a re-login or change-detection cycle. */
  get currentTenantName(): string {
    return localStorage.getItem('opac_tenant_name') || this.activeTenant?.tenant_name || '';
  }

  get isPlatformOwner(): boolean {
    return this.tenantContextSvc.isPlatformOwner();
  }

  get isSystemAdmin(): boolean {
    return this.tenantContextSvc.isSystemAdmin();
  }

  get isBusinessUser(): boolean {
    return this.tenantContextSvc.isBusinessUser();
  }

  get roleDisplayLabel(): string {
    switch (this.userRole) {
      case 'SYSTEM_ADMIN': return 'System Admin';
      case 'APPROVER':     return 'Approver';
      case 'REQUESTER':    return 'Requester';
      case 'VIEWER':       return 'Viewer';
      default:             return 'Requester';
    }
  }

  get loginModeLabel(): string {
    return this.loginMode === 'system' ? 'System Admin' : 'Business User';
  }

  // ── Authentication ────────────────────────────────────────
  onLoginSubmit() {
    if (!this.username || !this.password) {
      this.toastSvc.error('Please enter Username and Password.');
      return;
    }

    if (!this.companyName) {
      this.toastSvc.error('Please enter Tenant/Company Name.');
      return;
    }

    this.isLoading = true;
    console.log('🔓 Starting login with mode:', this.loginMode);

    this.authSvc.login({
      username: this.username,
      password: this.password,
      tenantName: this.companyName,
      loginMode: this.loginMode
    }).subscribe({
      next: (response) => {
        console.log('✅ Login response received:', response);
        this.isLoading = false;

        if (response.success && response.data) {
          console.log('✨ Login successful! Setting up user context...');
          // Drop any cached page configs from a previous session so tenant/requester
          // options don't leak between logins (e.g. AKRO's requesters showing for Orque).
          this.pageStore.clearConfigCache();
          this.toastSvc.success('Login successful!');
          this.userRole = response.data.role;
          this.activeTenant = {
            uuid: response.data.tenantUuid,
            tenant_name: response.data.tenantName,
            company_name: response.data.tenantName
          };
          console.log('📍 Active tenant set to:', this.activeTenant);

          const tenantName = response.data.tenantName || '';
          this.tenantContextSvc.setTenantContext(
            response.data.tenantUuid || '',
            tenantName,
            this.loginMode,
            this.userRole,
            !!response.data.hasActiveLicense
          );

          this.isLoggedIn = true;
          this.cdr.detectChanges();

          // Route each user type to their appropriate home screen
          let homeRoute: string;
          if (tenantName.trim().toLowerCase() === 'orque') {
            homeRoute = '/tenant';
          } else if (this.userRole === 'SYSTEM_ADMIN') {
            homeRoute = '/license';
          } else {
            homeRoute = '/tenant-configuration';
          }
          this.router.navigate([homeRoute]);
          this.logSession();
        } else {
          console.error('❌ Response not successful:', response);
          this.toastSvc.error(response.message || 'Login failed');
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('❌ Login error:', error);
        const errorMessage = error.message || 'Invalid username or password';
        this.toastSvc.error(errorMessage);
      }
    });
  }

  onLogout() {
    this.authSvc.logout();
    this.tenantContextSvc.clearContext();
    this.pageStore.clearConfigCache();
    this.isLoggedIn   = false;
    this.username     = '';
    this.password     = '';
    this.companyName  = '';
    this.loginMode    = 'business';
    this.userRole     = 'REQUESTER';
    this.settingsOpen = false;
    this.profileOpen  = false;
    this.showProfileModal = false;
    this.toastSvc.success('Logged out successfully');
  }

  // ── Router Navigation ─────────────────────────────────────
  navigateSidebar(route: string) {
    this.router.navigate([route]);
  }

  isActive(route: string): boolean {
    const url = this.router.url;
    return url === route || url.startsWith(route + '/');
  }

  getModuleName(): string {
    const url = this.router.url;
    if (url.startsWith('/system-settings'))       return 'System Settings';
    if (url.startsWith('/tenant-configuration'))  return 'Tenant Configuration';
    if (url.startsWith('/tenant'))  return 'Tenant Lifecycle';
    if (url.startsWith('/license')) return 'License Lifecycle';
    if (url.startsWith('/sessions'))return 'Session Management';
    if (url.startsWith('/audits'))  return 'Audit Logs';
    if (url.startsWith('/users'))   return 'User Management';
    if (url.startsWith('/roles'))   return 'Role Management';
    return 'OPAC';
  }

  // ── Context Switcher ──────────────────────────────────────
  onContextSwitcherChange(product: string) {
    this.currentContext = product;
  }

  onContextNavigate(path: string) {
    this.router.navigate([path]);
  }

  // ── Topbar Dropdowns ─────────────────────────────────────
  toggleSettings() {
    this.settingsOpen = !this.settingsOpen;
    this.profileOpen  = false;
  }

  toggleProfile() {
    this.profileOpen  = !this.profileOpen;
    this.settingsOpen = false;
  }

  openProfileModal() {
    this.showProfileModal = true;
    this.profileOpen      = false;
  }

  closeProfileModal() {
    this.showProfileModal = false;
  }

  navigateFromSettings(route: string) {
    this.settingsOpen = false;
    this.router.navigate([route]);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.settingsOpen = false;
      this.profileOpen  = false;
    }
  }

  // ── Active Tenant Master Load ─────────────────────────────
  loadActiveTenants() {
    this.http.get<any[]>(`${this.backendUrl}/api/tenants-master`).subscribe({
      next: (list) => {
        this.activeTenantsList = list;
        if (list.length > 0 && !this.activeTenant) {
          this.activeTenant = list[0];
        }
      },
      error: (err) => console.error('Failed to load active tenants:', err)
    });
  }

  changeActiveTenantContext() {
    // Tenant context changed via context-switcher dropdown
  }

  // ── Session Logging ───────────────────────────────────────
  private logSession() {
    const userAgent = navigator.userAgent;
    let browser = 'Safari';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    this.http.post(`${this.backendUrl}/api/sessions/create`, {
      tenantUuid: this.activeTenant?.uuid || null,
      username: this.username,
      device: 'MacBook Pro',
      browser,
      ipAddress: '127.0.0.1'
    }).subscribe({ error: (e) => console.error('Session log failed:', e) });
  }
}
