import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ListPageComponent } from '../list-page/list-page';

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [ListPageComponent],
  templateUrl: './users-page.component.html',
  styleUrl: './users-page.component.css'
})
export class UsersPageComponent implements OnInit {
  activeTab = '';

  constructor(private readonly route: ActivatedRoute) {}

  ngOnInit() {
    this.activeTab = this.route.snapshot.params['tab'] || 'Active';
  }
}
