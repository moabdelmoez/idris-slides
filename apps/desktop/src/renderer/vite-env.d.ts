/// <reference types="vite/client" />

import type { IdrisSlidesApi } from "../preload/preload";
import type * as React from "react";

declare global {
  interface Window {
    idrisSlides?: IdrisSlidesApi;
    React?: typeof React;
  }
}
