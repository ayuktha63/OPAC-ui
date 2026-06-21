import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ListPageComponent } from '../list-page/list-page';

@Component({
  selector: 'app-tenant-page',
  standalone: true,
  imports: [ListPageComponent],
  templateUrl: './tenant-page.component.html',
  styleUrl: './tenant-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TenantPageComponent implements OnInit {
  activeTab = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.activeTab = this.route.snapshot.params['tab'] || 'In-Progress';
    this.cdr.markForCheck();
  }
}
