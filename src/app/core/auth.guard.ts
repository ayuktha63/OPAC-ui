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
 * Blocks business users from accessing any screen until the tenant has an active
 * license applied. ORQUE and System Admins are always allowed through — System Admins
 * need access to License and System Settings regardless of license state.
 */
export const licenseRequiredGuard: CanActivateFn = () => {
  const ctx    = inject(TenantContextService);
  const router = inject(Router);

  // Platform owner and System Admins are never locked out
  if (ctx.isPlatformOwner() || ctx.isSystemAdmin()) return true;

  // Business users need an active license before accessing anything else
  if (ctx.hasActiveLicense()) return true;

  router.navigate(['/tenant-configuration']);
  return false;
};
