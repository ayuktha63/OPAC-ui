import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ListPageComponent } from '../list-page/list-page';
import { PageStoreService } from '../../core/page-store.service';
import { TenantContextService } from '../../core/tenant-context.service';

interface Quota {
  productName: string;
  purchased:   number;
  issued:      number;
  remaining:   number;
}

@Component({
  selector:    'app-license-page',
  standalone:  true,
  imports:     [CommonModule, ListPageComponent],
  templateUrl: './license-page.component.html',
  styleUrl:    './license-page.component.css'
})
export class LicensePageComponent implements OnInit {
  activeTab     = '';
  isTenantAdmin = false;
  loadingQuota  = false;
  quotas: Quota[] = [];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly store: PageStoreService,
    private readonly ctx:   TenantContextService,
    private readonly cdr:   ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.activeTab    = this.route.snapshot.params['tab'] || 'In-Progress';
    const role        = localStorage.getItem('opac_role') || '';
    this.isTenantAdmin = !this.ctx.isPlatformOwner() && role === 'SYSTEM_ADMIN';
    if (this.isTenantAdmin) this.loadQuota();
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
}
