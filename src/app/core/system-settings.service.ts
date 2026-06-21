import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SystemSettingsService {
  readonly activeResource = signal<string>('users');

  set(resource: string): void {
    this.activeResource.set(resource);
  }
}
