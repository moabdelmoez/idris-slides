/// <reference types="vite/client" />

import type { IdrisSlidesApi } from "../preload/preload";

declare global {
  interface Window {
    idrisSlides?: IdrisSlidesApi;
  }
}
