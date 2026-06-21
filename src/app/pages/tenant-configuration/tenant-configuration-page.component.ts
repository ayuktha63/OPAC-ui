import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageStoreService } from '../../core/page-store.service';
import { ToastService } from '../../core/toast.service';

interface LicenseProduct {
  productName: string;
  startDate?: string;
  endDate?: string;
  userLimit?: number;
  issued?: number;
  remaining?: number;
  concurrentLimit?: number;
  gracePeriod?: number;
  features?: string[];
}

@Component({
  selector: 'app-tenant-configuration-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tenant-configuration-page.component.html',
  styleUrls: ['./tenant-configuration-page.component.css']
})
export class TenantConfigurationPageComponent implements OnInit {
  tenantName = '';
  tenantUuid = '';
  isPlatformOwner = false;
  /** Only a tenant SYSTEM_ADMIN may apply/generate licenses. Business users cannot. */
  isSystemAdmin = false;

  licenseKey = '';
  applying = false;

  /** The tenant's licensed products (always shown). */
  products: LicenseProduct[] = [];

  /** Summary of the currently-applied license (from tenant configuration) */
  currentSummary = '';

  constructor(
    private readonly store: PageStoreService,
    private readonly toast: ToastService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.tenantName = localStorage.getItem('opac_tenant_name') || '';
    this.tenantUuid = localStorage.getItem('opac_tenant_uuid') || '';
    this.isPlatformOwner = this.tenantName.trim().toLowerCase() === 'orque';
    this.isSystemAdmin = (localStorage.getItem('opac_role') || '') === 'SYSTEM_ADMIN';
    if (!this.isPlatformOwner) {
      this.loadCurrentConfig();
      this.loadLicensedProducts();
    }
  }

  /** Load the currently licensed products summary (chips) for this tenant. */
  private loadCurrentConfig() {
    this.store.getList('/api/tenant-configuration').subscribe({
      next: (rows) => {
        const row = (rows || [])[0];
        this.currentSummary = row?.configValue && row.configValue !== '—' ? row.configValue : '';
        this.cdr.markForCheck();
      },
      error: () => { /* no config yet */ }
    });
  }

  /**
   * Always show the tenant's licensed product details (every non-Orque tenant, all roles).
   * These are the only products the tenant holds, with quota usage.
   */
  private loadLicensedProducts() {
    this.store.getList('/api/license-quota').subscribe({
      next: (rows: any) => {
        this.products = (rows || []).map((r: any) => ({
          productName: r.productName,
          userLimit: r.purchased,
          issued: r.issued,
          remaining: r.remaining,
          endDate: r.expiry,
          features: r.features
        }));
        this.cdr.markForCheck();
      },
      error: () => { /* no products yet */ }
    });
  }

  /** Paste-key → Add License: decrypt + apply, then show the product details. */
  addLicense() {
    if (!this.licenseKey.trim()) {
      this.toast.error('Please paste a license key.');
      return;
    }
    this.applying = true;
    this.store.post('/api/licenses/apply', {
      licenseKey: this.licenseKey.trim(),
      tenantUuid: this.tenantUuid
    }).subscribe({
      next: () => {
        this.applying = false;
        this.licenseKey = '';
        this.toast.success('License added successfully.');
        this.loadCurrentConfig();
        this.loadLicensedProducts();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.applying = false;
        this.toast.error(err?.error?.error || 'Failed to add license. Check the key and try again.');
        this.cdr.markForCheck();
      }
    });
  }

  clear() {
    this.licenseKey = '';
  }
}
