import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ListPageComponent } from '../list-page/list-page';

@Component({
  selector: 'app-tenant-page',
  standalone: true,
  imports: [ListPageComponent],
  templateUrl: './tenant-page.component.html',
  styleUrl: './tenant-page.component.css'
})
export class TenantPageComponent implements OnInit {
  activeTab = '';

  constructor(private readonly route: ActivatedRoute) {}

  ngOnInit() {
    this.activeTab = this.route.snapshot.params['tab'] || 'In-Progress';
  }
}
