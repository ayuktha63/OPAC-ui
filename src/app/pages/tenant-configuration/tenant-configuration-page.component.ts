import { Component } from '@angular/core';
import { ListPageComponent } from '../list-page/list-page';

@Component({
  selector: 'app-tenant-configuration-page',
  standalone: true,
  imports: [ListPageComponent],
  templateUrl: './tenant-configuration-page.component.html',
  styleUrls: ['./tenant-configuration-page.component.css']
})
export class TenantConfigurationPageComponent {}
