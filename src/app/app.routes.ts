import { Routes } from '@angular/router';
import { adminOrOwnerGuard, licenseRequiredGuard, platformOwnerGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/tenant', pathMatch: 'full' },

  // Tenant – ORQUE platform-owner only
  {
    path: 'tenant',
    redirectTo: 'tenant/In-Progress',
    pathMatch: 'full'
  },
  {
    path: 'tenant/:tab',
    canActivate: [platformOwnerGuard],
    loadComponent: () =>
      import('./pages/tenant/tenant-page.component').then(m => m.TenantPageComponent)
  },

  // License – System Admin + ORQUE only; account must be unlocked
  {
    path: 'license',
    redirectTo: 'license/In-Progress',
    pathMatch: 'full'
  },
  {
    path: 'license/:tab',
    canActivate: [adminOrOwnerGuard],
    loadComponent: () =>
      import('./pages/license/license-page.component').then(m => m.LicensePageComponent)
  },

  // Users – account must be unlocked
  {
    path: 'users',
    redirectTo: 'users/Active',
    pathMatch: 'full'
  },
  {
    path: 'users/:tab',
    canActivate: [licenseRequiredGuard],
    loadComponent: () =>
      import('./pages/users/users-page.component').then(m => m.UsersPageComponent)
  },

  // Roles – account must be unlocked
  {
    path: 'roles',
    canActivate: [licenseRequiredGuard],
    loadComponent: () =>
      import('./pages/roles/roles-page.component').then(m => m.RolesPageComponent)
  },

  // Sessions – account must be unlocked
  {
    path: 'sessions',
    canActivate: [licenseRequiredGuard],
    loadComponent: () =>
      import('./pages/sessions/sessions-page.component').then(m => m.SessionsPageComponent)
  },

  // Audits – account must be unlocked
  {
    path: 'audits',
    canActivate: [licenseRequiredGuard],
    loadComponent: () =>
      import('./pages/audits/audits-page.component').then(m => m.AuditsPageComponent)
  },

  // Tenant Configuration – always accessible (this is where the license key is applied)
  {
    path: 'tenant-configuration',
    loadComponent: () =>
      import('./pages/tenant-configuration/tenant-configuration-page.component')
        .then(m => m.TenantConfigurationPageComponent)
  },

  // System Settings – account must be unlocked
  {
    path: 'system-settings',
    canActivate: [licenseRequiredGuard],
    loadComponent: () =>
      import('./pages/system-settings/system-settings-page.component')
        .then(m => m.SystemSettingsPageComponent)
  }
];
