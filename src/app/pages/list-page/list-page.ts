import {
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  PageRendererComponent,
  PageAction,
  PageConfig,
  UserRole,
  OToastService
} from 'orque-ui';
import { PageStoreService } from '../../core/page-store.service';

@Component({
  selector: 'app-list-page',
  standalone: true,
  imports: [FormsModule, PageRendererComponent],
  templateUrl: './list-page.component.html',
  styleUrls: ['./list-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ListPageComponent implements OnInit, OnChanges, OnDestroy {
  @Input() resource: string = '';

  /** Optional initial tab passed from parent page component (from route param) */
  @Input() initialTab: string = '';

  @ViewChild(PageRendererComponent) private pageRendererRef?: PageRendererComponent;

  page: PageConfig | null = null;

  data: any[] = [];
  loading = false;
  error: string | null = null;

  /** Active tab driven by route param */
  activeTab: string = '';

  /** Role read from localStorage */
  userRole: UserRole = 'SYSTEM_ADMIN';

  /** Products allowed by the tenant's master license — limits the license-form product picker. */
  allowedProducts: string[] = [];

  // Legacy error toast (kept for backward compat)
  toastError: string | null = null;
  private _toastTimer: any = null;

  private _routeSub?: Subscription;
  /** Resource that has been loaded — used to reload when the @Input resource changes */
  private _loadedResource: string | null = null;

  constructor(
    private readonly store: PageStoreService,
    private readonly cdr: ChangeDetectorRef,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toast: OToastService
  ) {}

  ngOnInit() {
    console.log(`🔧 ListPageComponent.ngOnInit() called for resource: ${this.resource}`);
    const storedRole = localStorage.getItem('opac_role');
    if (storedRole && ['SYSTEM_ADMIN', 'APPROVER', 'REQUESTER', 'VIEWER'].includes(storedRole)) {
      this.userRole = storedRole as UserRole;
    }

    if (this.initialTab) {
      this.activeTab = this.initialTab;
    }

    this._routeSub = this.route.params.subscribe(params => {
      const tabParam = params['tab'];
      if (tabParam) {
        console.log(`📍 Route param changed: ${tabParam}`);
        this.activeTab = tabParam;
        this.cdr.markForCheck();
      }
    });

    const tabSnap = this.route.snapshot.params['tab'];
    if (tabSnap) {
      this.activeTab = tabSnap;
    }

    // Load page config if a resource is provided and not already loaded.
    // (ngOnChanges normally fires first and loads it, but guard here too.)
    if (this.resource && this._loadedResource !== this.resource) {
      console.log(`🚀 Calling loadPage() from ngOnInit`);
      this._loadedResource = this.resource;
      this.loadPage();
    }

    // For the license resource: non-Orque system admins load master products so the
    // form restricts product/feature selection to only what the master license allows.
    if (this.resource === 'license') {
      const tenantName = (localStorage.getItem('opac_tenant_name') || '').trim().toLowerCase();
      const isTenantAdmin = !!tenantName && tenantName !== 'orque'
                            && localStorage.getItem('opac_role') === 'SYSTEM_ADMIN';
      if (isTenantAdmin) {
        this.store.getList('/api/master-license-products').subscribe({
          next: (products: any[]) => {
            this.allowedProducts = (products || []).map((p: any) => (p.productName || '').toUpperCase());
            if (this.pageRendererRef) {
              (this.pageRendererRef as any).allowedProducts = this.allowedProducts;
            }
            this.cdr.markForCheck();
          },
          error: () => { /* keep empty — backend still enforces at save time */ }
        });
      }
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // Reload whenever the resource input genuinely changes to a new value.
    // This is what lets the System Settings page swap between users/roles/
    // sessions/audits/tenant-configuration on the same component instance.
    if (changes['resource'] && this.resource && this._loadedResource !== this.resource) {
      console.log(`📌 loadPage() from ngOnChanges (resource = ${this.resource})`);
      this._loadedResource = this.resource;
      this.loadPage();
    }
  }

  ngOnDestroy() {
    this._routeSub?.unsubscribe();
    if (this._toastTimer) clearTimeout(this._toastTimer);
  }

  // ── Page Load ──────────────────────────────────────────────────────────────

  loadPage() {
    console.log(`📄 Loading page config for: ${this.resource}`);
    this.loading = true;
    this.error = null;
    this.page = null;
    this.data = [];
    this.cdr.markForCheck();

    this.store.getPageConfig(this.resource).subscribe({
      next: (config: PageConfig) => {
        console.log(`✅ Page config loaded, now fetching data from: ${config.api}`);
        this.page = config;
        this.cdr.markForCheck();
        this.populateTenantOptions(config);
        this.loadData(config.api);
      },
      error: (err) => {
        console.error(`❌ Failed to load page config:`, err.message);
        this.error = `Failed to load page config: ${err.message}`;
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadData(api: string) {
    console.log(`📊 Fetching data from: ${api}`);
    this.loading = true;
    this.cdr.markForCheck();

    this.store.getList(api).subscribe({
      next: (rows) => {
        console.log(`✅ Data loaded! Rows: ${rows?.length || 0}`);
        this.data = rows ?? [];
        this.loading = false;
        this.error = null;
        this.cdr.markForCheck();
        console.log(`✨ UI should now show data table (loading=${this.loading})`);
      },
      error: (err) => {
        console.error(`❌ Failed to fetch data:`, err.message);
        this.error = `Failed to load data: ${err.message}`;
        this.data = [];
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * If the page's form has a "tenantName" select field, fill its options with the
   * list of tenants so the Orque super admin can assign records to a tenant.
   * (Backend still forces a tenant-scoped admin's records to their own tenant.)
   */
  private populateTenantOptions(config: PageConfig) {
    const tenantFields = (config?.steps || [])
      .flatMap(step => step.fields || [])
      .filter(field => field.name === 'tenantName' && field.type === 'select');
    if (tenantFields.length === 0) return;

    // Non-Orque tenants don't choose a tenant — it's their own, pre-filled and locked.
    const tenantName = (localStorage.getItem('opac_tenant_name') || '').trim();
    const isTenantScoped = !!tenantName && tenantName.toLowerCase() !== 'orque';

    this.store.getList('/api/active-tenants').subscribe({
      next: (tenants) => {
        const options = (tenants || []).map((tenant: any) => ({
          label: tenant.label || tenant.tenantName || tenant.value,
          value: tenant.label || tenant.tenantName || tenant.value
        }));
        tenantFields.forEach(field => {
          field.options = options;
          if (isTenantScoped) (field as any).isDisabled = true;
        });
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Failed to load tenant options:', err.message)
    });
  }

  // ── Tab Navigation ─────────────────────────────────────────────────────────

  onTabChange(tab: string) {
    this.router.navigate(['..', tab], { relativeTo: this.route });
  }

  // ── Action Dispatch ────────────────────────────────────────────────────────

  handleAction(event: PageAction) {
    if (!this.page) return;
    const uuid = event.row?.[this.page.tableUniqueFieldName || 'uuid'];
    const base = this.page.workflowApiBase || this.page.api;
    const recordLabel = event.row?.requestId || event.row?.companyName || uuid || 'Record';

    switch (event.action) {

      case 'view':
        break;

      case 'save': {
        this.store.post(base, event.payload).subscribe({
          next: () => {
            this.toast.addSuccess('Saved', `${recordLabel} saved successfully.`);
            this.loadData(this.page!.api);
          },
          error: (err) => this.showError(`Save failed: ${err?.error?.error || err.message}`)
        });
        break;
      }

      case 'submit': {
        const submitPayload = event.payload || {};
        const targetApi = uuid ? `${base}/submit/${uuid}` : base;
        this.store.post(targetApi, submitPayload).subscribe({
          next: () => {
            this.toast.addSuccess(
              'Sent for Approval',
              `${recordLabel} has been submitted for approval and moved to In-Progress.`
            );
            this.loadData(this.page!.api);
          },
          error: (err) => this.showError(`Submit failed: ${err?.error?.error || err.message}`)
        });
        break;
      }

      case 'renew':
      case 'upgrade': {
        const renewUpgradePayload = event.payload || {};
        this.store.post(`${base}/${event.action}/${uuid}`, renewUpgradePayload).subscribe({
          next: () => {
            const label = event.action === 'renew' ? 'Renewal' : 'Upgrade';
            this.toast.addSuccess(label, `${recordLabel} ${label.toLowerCase()} request submitted for approval.`);
            this.loadData(this.page!.api);
          },
          error: (err) => this.showError(`${event.action} failed: ${err?.error?.error || err.message}`)
        });
        break;
      }

      case 'approve': {
        this.store.post(`${base}/approve/${uuid}`, {}).subscribe({
          next: () => {
            this.toast.addSuccess('Approved', `${recordLabel} has been approved and moved to Active.`);
            this.loadData(this.page!.api);
          },
          error: (err) => this.showError(`Approve failed: ${err?.error?.error || err.message}`)
        });
        break;
      }

      case 'reject': {
        this.store.post(`${base}/reject/${uuid}`, {}).subscribe({
          next: () => {
            this.toast.addWarning('Rejected', `${recordLabel} has been rejected and moved to Inactive.`);
            this.loadData(this.page!.api);
          },
          error: (err) => this.showError(`Reject failed: ${err?.error?.error || err.message}`)
        });
        break;
      }

      case 'return': {
        this.store.post(`${base}/return/${uuid}`, {}).subscribe({
          next: () => {
            this.toast.addInfo('Returned for Revision', `${recordLabel} has been returned to the requester as Draft.`);
            this.loadData(this.page!.api);
          },
          error: (err) => this.showError(`Return failed: ${err?.error?.error || err.message}`)
        });
        break;
      }

      case 'terminate':
      case 'deactivate':
      case 'activate': {
        this.store.post(`${base}/${event.action}/${uuid}`, {}).subscribe({
          next: () => {
            this.toast.addSuccess('Done', `${recordLabel}: ${event.action} completed.`);
            this.loadData(this.page!.api);
          },
          error: (err) => this.showError(`Action failed: ${err?.error?.error || err.message}`)
        });
        break;
      }

      case 'refresh':
        this.loadData(this.page.api);
        break;

      case 'delete':
        if (confirm('Are you sure you want to delete this record?')) {
          this.store.post(`${base}/delete/${uuid}`, {}).subscribe({
            next: () => {
              this.toast.addSuccess('Deleted', `${recordLabel} has been deleted.`);
              this.loadData(this.page!.api);
            },
            error: (err) => this.showError(`Delete failed: ${err?.error?.error || err.message}`)
          });
        }
        break;

      case 'export':
        this.exportToCsv(event.payload);
        break;
    }
  }

  exportToCsv(selectedRows?: any[]) {
    const rowsToExport = (selectedRows && selectedRows.length > 0) ? selectedRows : [];
    if (rowsToExport.length === 0) {
      this.showError('No records selected for export. Please select at least one record.');
      return;
    }
    const headers = Object.keys(rowsToExport[0]);
    const csvRows = [
      headers.join(','),
      ...rowsToExport.map(row => headers.map(fieldName => {
        const val = row[fieldName];
        return JSON.stringify(val === null || val === undefined ? '' : val);
      }).join(','))
    ];
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${this.resource || 'export'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ── Error Toast ────────────────────────────────────────────────────────────

  private showError(message: string) {
    this.toast.addError('Error', message);
    // Keep legacy inline toast as backup
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this.toastError = message;
    this._toastTimer = setTimeout(() => {
      this.toastError = null;
      this.cdr.detectChanges();
    }, 6000);
    this.cdr.detectChanges();
  }
}
