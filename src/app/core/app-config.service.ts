import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface AppConfig {
  opacApiUrl: string;
  crmAppUrl: string;
}

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private config: AppConfig | null = null;

  constructor(private http: HttpClient) {}

  async load(): Promise<void> {
    this.config = await firstValueFrom(
      this.http.get<AppConfig>('/assets/config.json')
    );
  }

  private get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    if (!this.config) throw new Error(`AppConfig not loaded — missing /assets/config.json`);
    return this.config[key];
  }

  get opacApiUrl(): string { return this.get('opacApiUrl'); }
  get crmAppUrl():  string { return this.get('crmAppUrl'); }
}
