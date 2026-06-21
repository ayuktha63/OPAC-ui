import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ListPageComponent } from '../list-page/list-page';

@Component({
  selector: 'app-license-page',
  standalone: true,
  imports: [ListPageComponent],
  templateUrl: './license-page.component.html',
  styleUrl: './license-page.component.css'
})
export class LicensePageComponent implements OnInit {
  activeTab = '';

  constructor(private readonly route: ActivatedRoute) {}

  ngOnInit() {
    this.activeTab = this.route.snapshot.params['tab'] || 'In-Progress';
  }
}
