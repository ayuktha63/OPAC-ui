import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ListPageComponent } from '../list-page/list-page';
import { PageStoreService } from '../../core/page-store.service';
import { TenantContextService } from '../../core/tenant-context.service';
import { AuthService } from '../../core/auth.service';
import { TenantConfigurationPageComponent } from '../tenant-configuration/tenant-configuration-page.component';

interface Quota {
  productName: string;
  purchased:   number;
  issued:      number;
  remaining:   number;
}

@Component({
  selector:    'app-license-page',
  standalone:  true,
  imports:     [CommonModule, ListPageComponent, TenantConfigurationPageComponent],
  templateUrl: './license-page.component.html',
  styleUrl:    './license-page.component.css'
})
export class LicensePageComponent implements OnInit {
  activeTab        = '';
  isTenantAdmin    = false;
  hasActiveLicense = false;
  loadingQuota     = false;
  quotas: Quota[]  = [];

  constructor(
    private readonly route:   ActivatedRoute,
    private readonly router:  Router,
    private readonly store:   PageStoreService,
    private readonly ctx:     TenantContextService,
    private readonly authSvc: AuthService,
    private readonly cdr:     ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.activeTab       = this.route.snapshot.params['tab'] || 'In-Progress';
    const role           = localStorage.getItem('opac_role') || '';
    this.isTenantAdmin   = !this.ctx.isPlatformOwner() && role === 'SYSTEM_ADMIN';
    this.hasActiveLicense = this.ctx.hasActiveLicense();
    if (this.isTenantAdmin && this.hasActiveLicense) this.loadQuota();
  }

  loadQuota() {
    this.loadingQuota = true;
    this.store.getList('/api/license-quota').subscribe({
      next: (rows: any) => {
        this.quotas      = rows || [];
        this.loadingQuota = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loadingQuota = false; this.cdr.markForCheck(); }
    });
  }

  logout() {
    this.authSvc.logout();
    this.ctx.clearContext();
    this.router.navigate(['/']);
  }

  /** Poll OPAC for current license status; unlocks the account if now active. */
  checkLicenseStatus() {
    this.loadingQuota = true;
    this.store.getList('/api/license-quota').subscribe({
      next: (rows: any) => {
        this.loadingQuota = false;
        if (rows && rows.length > 0) {
          this.hasActiveLicense = true;
          this.quotas = rows;
          this.ctx.markLicenseActivated();
        }
        this.cdr.markForCheck();
      },
      error: () => { this.loadingQuota = false; this.cdr.markForCheck(); }
    });
  }
}
