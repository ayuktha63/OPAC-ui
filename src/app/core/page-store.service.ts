import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { shareReplay, tap } from 'rxjs/operators';
import { TenantContextService } from './tenant-context.service';
import { AppConfigService } from './app-config.service';

@Injectable({ providedIn: 'root' })
export class PageStoreService {
  private get backendUrl(): string { return this.cfg.opacApiUrl; }

  /** In-memory config cache — avoids repeated asset fetches on tab switches */
  private readonly configCache = new Map<string, any>();

  /** Cached /api/active-tenants response — same list is re-fetched on every page
   *  that has a tenant picker field; the list rarely changes within a session. */
  private activeTenants$: Observable<any[]> | null = null;

  constructor(
    private readonly http: HttpClient,
    private readonly tenantContextSvc: TenantContextService,
    private readonly cfg: AppConfigService
  ) {}

  /**
   * Builds the standard request headers for every backend call:
   *  - x-user        → the logged-in username (drives audit attribution)
   *  - x-tenant-uuid → the active tenant (drives data isolation on reads AND writes)
   */
  private buildHeaders(): HttpHeaders {
    const tenantUuid = this.tenantContextSvc.getTenantUuid();
    let username = 'opac-admin';
    try {
      const user = JSON.parse(localStorage.getItem('opac_user') || '{}');
      if (user?.username) username = user.username;
    } catch { /* ignore malformed storage */ }

    const role = localStorage.getItem('opac_role') || '';
    return new HttpHeaders({
      'x-user': username,
      'x-role': role,
      ...(tenantUuid && { 'x-tenant-uuid': tenantUuid })
    });
  }

  /** Fetch all records for a given API path */
  getList(apiPath: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.backendUrl}${apiPath}`, { headers: this.buildHeaders() });
  }

  /** Cached variant of getList('/api/active-tenants') — the tenant picker list is
   *  identical across every page load in a session, so fetch it once and replay it. */
  getActiveTenantsCached(): Observable<any[]> {
    if (!this.activeTenants$) {
      this.activeTenants$ = this.getList('/api/active-tenants').pipe(shareReplay(1));
    }
    return this.activeTenants$;
  }

  /** POST — create new record or trigger a workflow action */
  post(apiPath: string, payload: any): Observable<any> {
    return this.http.post(`${this.backendUrl}${apiPath}`, payload, { headers: this.buildHeaders() });
  }

  /** PUT — update an existing record */
  put(apiPath: string, payload: any): Observable<any> {
    return this.http.put(`${this.backendUrl}${apiPath}`, payload, { headers: this.buildHeaders() });
  }

  /** Load a JSON page config from assets — cached after first load */
  getPageConfig(resource: string): Observable<any> {
    const cached = this.configCache.get(resource);
    if (cached) {
      return of(cached);
    }
    return this.http.get<any>(`./assets/application/pages/${resource}.json`).pipe(
      tap(config => this.configCache.set(resource, config))
    );
  }

  /** Invalidate a specific cached config (call after saving page-level config changes) */
  invalidateConfig(resource: string): void {
    this.configCache.delete(resource);
  }

  /**
   * Clear ALL cached configs. Must be called on login/logout — the renderer mutates
   * config field objects (tenant/requester options, disabled flags) per logged-in tenant,
   * so a stale cached config would leak one tenant's options into another's session.
   */
  clearConfigCache(): void {
    this.configCache.clear();
    this.activeTenants$ = null;
  }
}
