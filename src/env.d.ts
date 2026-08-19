/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare global {
  interface Window {
    /**
     * The single mechanism for theme, accent and theme-color changes.
     * Defined by the blocking init script in BaseLayout.astro.
     */
    __theme: {
      readonly theme: 'light' | 'dark';
      readonly accent: string;
      set(theme: 'light' | 'dark', accent?: string): void;
    };
  }
}

export {};
