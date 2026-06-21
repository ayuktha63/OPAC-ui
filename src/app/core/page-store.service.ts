import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class PageStoreService {
  private readonly backendUrl = 'http://localhost:8082';
  private readonly defaultHeaders = { 'x-user': 'opac-admin' };

  /** In-memory config cache — avoids repeated asset fetches on tab switches */
  private readonly configCache = new Map<string, any>();

  constructor(private http: HttpClient) {}

  /** Fetch all records for a given API path */
  getList(apiPath: string, customHeaders?: any): Observable<any[]> {
    const headers = customHeaders ? new HttpHeaders(customHeaders) : undefined;
    return this.http.get<any[]>(`${this.backendUrl}${apiPath}`, { headers });
  }

  /** POST — create new record or trigger a workflow action */
  post(apiPath: string, payload: any): Observable<any> {
    return this.http.post(`${this.backendUrl}${apiPath}`, payload, {
      headers: new HttpHeaders(this.defaultHeaders)
    });
  }

  /** PUT — update an existing record */
  put(apiPath: string, payload: any): Observable<any> {
    return this.http.put(`${this.backendUrl}${apiPath}`, payload, {
      headers: new HttpHeaders(this.defaultHeaders)
    });
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
}
