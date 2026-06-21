import { Component, ElementRef, HostListener, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterOutlet } from '@angular/router';
import { ContextSwitcherComponent, OToastComponent } from 'orque-ui';
import { SystemSettingsService } from './core/system-settings.service';
import { TenantContextService } from './core/tenant-context.service';
import { AuthService } from './core/auth.service';
import { ToastService } from './core/toast.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, ContextSwitcherComponent, OToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly backendUrl = 'http://localhost:8082';

  // ── Login State ─────────────────────────────────────────
  isLoggedIn  = false;
  isLoading   = false;
  loginMode: 'business' | 'system' = 'business';
  companyName = '';
  username    = '';
  password    = '';
  userRole    = 'REQUESTER';


  // ── Shell Navigation ─────────────────────────────────────
  currentContext = 'OPAC';

  // ── Active Tenant Context ────────────────────────────────
  activeTenant: any  = null;
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
    private readonly toastSvc: ToastService
  ) {}

  ngOnInit() {
    this.loadActiveTenants();
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
          this.toastSvc.success('Login successful!');
          this.userRole = response.data.role;
          this.activeTenant = {
            uuid: response.data.tenantUuid,
            tenant_name: response.data.tenantName,
            company_name: response.data.tenantName
          };
          console.log('📍 Active tenant set to:', this.activeTenant);

          this.tenantContextSvc.setTenantContext(
            response.data.tenantUuid || '',
            this.loginMode,
            this.userRole
          );

          this.isLoggedIn = true;
          this.cdr.detectChanges();
          console.log('✅ isLoggedIn set to true, navigating to /tenant');
          this.router.navigate(['/tenant']).then(success => {
            console.log('🚀 Navigation result:', success);
          });
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
    const browser = userAgent.includes('Chrome') ? 'Chrome'
      : userAgent.includes('Firefox') ? 'Firefox' : 'Safari';
    this.http.post(`${this.backendUrl}/api/sessions/create`, {
      tenantUuid: this.activeTenant?.uuid || null,
      username: this.username,
      device: 'MacBook Pro',
      browser,
      ipAddress: '127.0.0.1'
    }).subscribe({ error: (e) => console.error('Session log failed:', e) });
  }
}
