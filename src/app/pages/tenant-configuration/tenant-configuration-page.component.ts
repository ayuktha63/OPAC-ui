import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageStoreService } from '../../core/page-store.service';
import { ToastService } from '../../core/toast.service';
import { TenantContextService } from '../../core/tenant-context.service';

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
  tenantName      = '';
  tenantUuid      = '';
  isPlatformOwner = false;
  isSystemAdmin   = false;

  get isBusinessUser(): boolean { return !this.isPlatformOwner && !this.isSystemAdmin; }
  /** Derived from actual API response, not localStorage — avoids stale flag issues. */
  get hasActiveLicense(): boolean { return this.productsLoaded && this.products.length > 0; }

  productsLoaded = false;

  licenseKey      = '';
  applying        = false;
  showAddKeyForm  = false;

  products: LicenseProduct[] = [];
  currentSummary  = '';

  constructor(
    private readonly store:   PageStoreService,
    private readonly toast:   ToastService,
    private readonly cdr:     ChangeDetectorRef,
    private readonly ctx:     TenantContextService
  ) {}

  ngOnInit() {
    this.tenantName     = this.ctx.tenantName() || localStorage.getItem('opac_tenant_name') || '';
    this.tenantUuid     = this.ctx.getTenantUuid();
    this.isPlatformOwner = this.ctx.isPlatformOwner();
    this.isSystemAdmin  = this.ctx.isSystemAdmin();
    if (!this.isPlatformOwner) {
      this.loadCurrentConfig();
      this.loadLicensedProducts();
    }
  }

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

  private loadLicensedProducts() {
    // Business users see only their own activated products (from their applied sub-license).
    // System Admins see the master quota summary.
    const endpoint = this.isBusinessUser ? '/api/my-products' : '/api/license-quota';
    this.store.getList(endpoint).subscribe({
      next: (rows: any) => {
        this.products = (rows || []).map((r: any) => ({
          productName:     r.productName,
          userLimit:       r.purchased ?? r.userLimit,
          endDate:         r.expiry,
          features:        r.features
        }));
        this.productsLoaded = true;
        this.cdr.markForCheck();
      },
      error: () => { this.productsLoaded = true; this.cdr.markForCheck(); }
    });
  }

  addLicense() {
    if (!this.licenseKey.trim()) {
      this.toast.error('Please paste your license key.');
      return;
    }
    this.applying = true;
    this.store.post('/api/licenses/apply', {
      licenseKey: this.licenseKey.trim(),
      tenantUuid: this.tenantUuid
    }).subscribe({
      next: () => {
        this.applying      = false;
        this.licenseKey    = '';
        this.showAddKeyForm = false;
        this.toast.success('Subscription activated successfully!');
        this.ctx.markLicenseActivated();   // unlock the account immediately
        this.loadCurrentConfig();
        this.loadLicensedProducts();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.applying = false;
        this.toast.error(err?.error?.error || 'Invalid license key. Please check and try again.');
        this.cdr.markForCheck();
      }
    });
  }

  clear() { this.licenseKey = ''; }

  // ── Product card helpers ───────────────────────────────────────────────────

  productColor(name: string): string {
    const n = (name || '').toUpperCase();
    if (n.includes('ERP'))                         return '#4F46E5';
    if (n.includes('CRM'))                         return '#7C3AED';
    if (n.includes('IMS') || n.includes('INVEN'))  return '#0891B2';
    if (n.includes('PARK'))                        return '#059669';
    if (n.includes('HR'))                          return '#DC2626';
    return '#ff8200';
  }

  productGradient(name: string): string {
    const c = this.productColor(name);
    return `linear-gradient(135deg, ${c}18 0%, ${c}08 100%)`;
  }

  productInitial(name: string): string {
    return (name || '?').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || '?';
  }

  formatDate(d: string | undefined): string {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return d;
    }
  }

  /** Show at most 5 features in the card; rest are counted. */
  visibleFeatures(features: string[] | undefined): string[] {
    return (features || []).slice(0, 5);
  }

  extraFeatureCount(features: string[] | undefined): number {
    return Math.max(0, (features || []).length - 5);
  }
}
