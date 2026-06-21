import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ListPageComponent } from '../list-page/list-page';
import { PageStoreService } from '../../core/page-store.service';

interface Quota {
  productName: string;
  purchased: number;
  issued: number;
  remaining: number;
}

@Component({
  selector: 'app-license-page',
  standalone: true,
  imports: [CommonModule, ListPageComponent],
  templateUrl: './license-page.component.html',
  styleUrl: './license-page.component.css'
})
export class LicensePageComponent implements OnInit {
  activeTab = '';

  /** Live per-product license counter, shown for a tenant's System Admin. */
  isTenantAdmin = false;
  quotas: Quota[] = [];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly store: PageStoreService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.activeTab = this.route.snapshot.params['tab'] || 'In-Progress';
    const tenantName = (localStorage.getItem('opac_tenant_name') || '').trim().toLowerCase();
    const role = localStorage.getItem('opac_role') || '';
    this.isTenantAdmin = !!tenantName && tenantName !== 'orque' && role === 'SYSTEM_ADMIN';
    if (this.isTenantAdmin) this.loadQuota();
  }

  /** Refreshes the live counter (purchased / issued / remaining per allotted product). */
  loadQuota() {
    this.store.getList('/api/license-quota').subscribe({
      next: (rows: any) => { this.quotas = rows || []; this.cdr.markForCheck(); },
      error: () => { /* no quota yet */ }
    });
  }
}
