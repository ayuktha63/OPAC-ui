import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SystemSettingsService } from '../../core/system-settings.service';
import { ListPageComponent } from '../list-page/list-page';
import { TenantConfigurationPageComponent } from '../tenant-configuration/tenant-configuration-page.component';

@Component({
  selector: 'app-system-settings-page',
  standalone: true,
  imports: [CommonModule, ListPageComponent, TenantConfigurationPageComponent],
  templateUrl: './system-settings-page.component.html',
  styleUrl: './system-settings-page.component.css'
})
export class SystemSettingsPageComponent {
  readonly settingsSvc = inject(SystemSettingsService);
}
