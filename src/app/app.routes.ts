import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/tenant', pathMatch: 'full' },

  // Tenant – tab-param routing
  {
    path: 'tenant',
    redirectTo: 'tenant/In-Progress',
    pathMatch: 'full'
  },
  {
    path: 'tenant/:tab',
    loadComponent: () =>
      import('./pages/tenant/tenant-page.component').then(m => m.TenantPageComponent)
  },

  // License – tab-param routing
  {
    path: 'license',
    redirectTo: 'license/In-Progress',
    pathMatch: 'full'
  },
  {
    path: 'license/:tab',
    loadComponent: () =>
      import('./pages/license/license-page.component').then(m => m.LicensePageComponent)
  },

  // Users – tab-param routing
  {
    path: 'users',
    redirectTo: 'users/Active',
    pathMatch: 'full'
  },
  {
    path: 'users/:tab',
    loadComponent: () =>
      import('./pages/users/users-page.component').then(m => m.UsersPageComponent)
  },

  // Roles
  {
    path: 'roles',
    loadComponent: () =>
      import('./pages/roles/roles-page.component').then(m => m.RolesPageComponent)
  },

  // Sessions
  {
    path: 'sessions',
    loadComponent: () =>
      import('./pages/sessions/sessions-page.component').then(m => m.SessionsPageComponent)
  },

  // Audits
  {
    path: 'audits',
    loadComponent: () =>
      import('./pages/audits/audits-page.component').then(m => m.AuditsPageComponent)
  },

  // Tenant Configuration
  {
    path: 'tenant-configuration',
    loadComponent: () =>
      import('./pages/tenant-configuration/tenant-configuration-page.component')
        .then(m => m.TenantConfigurationPageComponent)
  },

  // System Settings
  {
    path: 'system-settings',
    loadComponent: () =>
      import('./pages/system-settings/system-settings-page.component')
        .then(m => m.SystemSettingsPageComponent)
  }
];
