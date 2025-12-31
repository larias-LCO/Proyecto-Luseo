import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AnimatedIconRegistry {
  private icons: Record<string, any> = {};

  // Register multiple icons (e.g. from a JSON bundle)
  register(icons: Record<string, any>): void {
    this.icons = { ...this.icons, ...icons };
  }

  // Register single icon
  registerIcon(name: string, data: any): void {
    this.icons[name] = data;
  }

  get(name: string): any | null {
    return this.icons[name] ?? null;
  }
}