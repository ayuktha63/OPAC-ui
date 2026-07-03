import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface AppConfig {
  opacApiUrl: string;
  crmAppUrl: string;
}

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private config: AppConfig = {
    opacApiUrl: 'http://localhost:8082',
    crmAppUrl: 'http://localhost:4300'
  };

  constructor(private http: HttpClient) {}

  async load(): Promise<void> {
    try {
      const loaded = await firstValueFrom(
        this.http.get<AppConfig>('/assets/config.json')
      );
      this.config = { ...this.config, ...loaded };
    } catch {
      // falls back to defaults above
    }
  }

  get opacApiUrl(): string { return this.config.opacApiUrl; }
  get crmAppUrl(): string  { return this.config.crmAppUrl; }
}
