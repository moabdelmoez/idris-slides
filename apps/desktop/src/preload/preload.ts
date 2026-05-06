import { contextBridge, ipcRenderer } from "electron";
import type { ProjectMetadata } from "@idris-slides/project";

export type IdrisSlidesApi = {
  createProject(name: string): Promise<ProjectMetadata>;
};

const api: IdrisSlidesApi = {
  createProject(name) {
    return ipcRenderer.invoke("projects:create", name) as Promise<ProjectMetadata>;
  }
};

contextBridge.exposeInMainWorld("idrisSlides", api);
