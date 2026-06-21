import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterOutlet } from '@angular/router';
import { ContextSwitcherComponent, OToastComponent } from 'orque-ui';
import { SystemSettingsService } from './core/system-settings.service';

type LoginType = 'SYSTEM_ADMIN' | 'BUSINESS_USER';
type UserRole  = 'SYSTEM_ADMIN' | 'APPROVER' | 'REQUESTER' | 'VIEWER';

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
  loginType: LoginType = 'SYSTEM_ADMIN';   // replaces isSelect
  selectedRole: UserRole = 'SYSTEM_ADMIN'; // sub-role for system admin login
  companyName = '';
  username    = '';
  password    = '';

  // Derived convenience getter (keeps template in sync)
  get isSelect(): boolean { return this.loginType === 'SYSTEM_ADMIN'; }

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
    readonly settingsSvc: SystemSettingsService
  ) {}

  ngOnInit() {
    this.loadActiveTenants();
  }

  // ── Role label for display ────────────────────────────────
  get roleDisplayLabel(): string {
    switch (this.selectedRole) {
      case 'SYSTEM_ADMIN': return 'System Admin';
      case 'APPROVER':     return 'Approver';
      case 'REQUESTER':    return 'Requester';
      case 'VIEWER':       return 'Viewer';
      default:             return 'Unknown';
    }
  }

  get loginTypeDisplayLabel(): string {
    return this.loginType === 'SYSTEM_ADMIN' ? 'System Admin' : 'Business User';
  }

  // ── Authentication ────────────────────────────────────────
  onLoginSubmit() {
    if (this.loginType === 'SYSTEM_ADMIN') {
      if (!this.username || !this.password) {
        console.error('Please enter System Admin Email and Password.');
        return;
      }
      localStorage.setItem('opac_role', this.selectedRole);
      this.isLoggedIn = true;
      this.navigateByRole();
      this.logSession();
    } else {
      if (!this.companyName) { console.error('Please enter Company Name.'); return; }
      if (!this.username || !this.password) { console.error('Please enter Username and Password.'); return; }
      const matched = this.activeTenantsList.find(
        t => t.tenant_name?.toLowerCase()  === this.companyName.toLowerCase() ||
             t.company_name?.toLowerCase() === this.companyName.toLowerCase()
      );
      if (!matched) { console.error('Company/Tenant not found.'); return; }
      this.activeTenant = matched;
      localStorage.setItem('opac_role', 'REQUESTER');
      this.isLoggedIn = true;
      this.router.navigate(['/tenant']);
      this.logSession();
    }
  }

  /** Navigate to the most relevant first page based on role */
  private navigateByRole() {
    switch (this.selectedRole) {
      case 'APPROVER':
        this.router.navigate(['/tenant/In-Progress']);
        break;
      case 'REQUESTER':
        this.router.navigate(['/tenant/In-Progress']);
        break;
      default:
        this.router.navigate(['/tenant']);
    }
  }

  onLogout() {
    localStorage.removeItem('opac_role');
    this.isLoggedIn   = false;
    this.username     = '';
    this.password     = '';
    this.companyName  = '';
    this.loginType    = 'SYSTEM_ADMIN';
    this.selectedRole = 'SYSTEM_ADMIN';
    this.settingsOpen = false;
    this.profileOpen  = false;
    this.showProfileModal = false;
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
      username:   this.loginType === 'SYSTEM_ADMIN' ? 'admin@orque.com' : this.username,
      device:     'MacBook Pro',
      browser,
      ipAddress:  '127.0.0.1'
    }).subscribe({ error: (e) => console.error('Session log failed:', e) });
  }
}
