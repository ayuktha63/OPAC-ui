import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TenantContextService } from './tenant-context.service';

/**
 * Only the ORQUE platform-owner tenant may access the Tenant Lifecycle screen.
 * All other tenants are redirected: System Admins go to /license,
 * business users go to /tenant-configuration.
 */
export const platformOwnerGuard: CanActivateFn = () => {
  const ctx    = inject(TenantContextService);
  const router = inject(Router);

  if (ctx.isPlatformOwner()) return true;

  const fallback = ctx.isSystemAdmin() ? '/license' : '/tenant-configuration';
  router.navigate([fallback]);
  return false;
};

/**
 * The License Lifecycle screen is accessible to System Admins and the ORQUE platform owner.
 * Regular business users are redirected to /tenant-configuration.
 */
export const adminOrOwnerGuard: CanActivateFn = () => {
  const ctx    = inject(TenantContextService);
  const router = inject(Router);

  if (ctx.isPlatformOwner() || ctx.isSystemAdmin()) return true;

  router.navigate(['/tenant-configuration']);
  return false;
};

/**
 * Blocks ALL non-platform-owner users from accessing protected screens until the
 * tenant has an active license applied. System Admins without a license may only
 * access the /license page; business users go to /tenant-configuration.
 */
export const licenseRequiredGuard: CanActivateFn = () => {
  const ctx    = inject(TenantContextService);
  const router = inject(Router);

  // Platform owner is never locked out
  if (ctx.isPlatformOwner()) return true;

  // Anyone with an active license passes
  if (ctx.hasActiveLicense()) return true;

  // System Admin without a license → send to license page to apply one
  if (ctx.isSystemAdmin()) {
    router.navigate(['/license']);
    return false;
  }

  // Business users without a license → my configuration page
  router.navigate(['/tenant-configuration']);
  return false;
};
