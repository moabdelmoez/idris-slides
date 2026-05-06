import { contextBridge, ipcRenderer } from "electron";
import type { ProjectMetadata } from "@idris-slides/project";
import type { AppSettings, DeckOutline } from "../shared/types";

export type IdrisSlidesApi = {
  createProject(name: string): Promise<ProjectMetadata>;
  createDeckFromOutline(prompt: string, outline: DeckOutline): Promise<ProjectMetadata>;
  getSettings(): Promise<AppSettings>;
  saveGeminiApiKey(apiKey: string): Promise<AppSettings>;
  generateOutline(prompt: string): Promise<DeckOutline>;
};

const api: IdrisSlidesApi = {
  createProject(name) {
    return ipcRenderer.invoke("projects:create", name) as Promise<ProjectMetadata>;
  },
  createDeckFromOutline(prompt, outline) {
    return ipcRenderer.invoke("projects:createDeckFromOutline", prompt, outline) as Promise<ProjectMetadata>;
  },
  getSettings() {
    return ipcRenderer.invoke("settings:get") as Promise<AppSettings>;
  },
  saveGeminiApiKey(apiKey) {
    return ipcRenderer.invoke("settings:saveGeminiApiKey", apiKey) as Promise<AppSettings>;
  },
  generateOutline(prompt) {
    return ipcRenderer.invoke("ai:generateOutline", prompt) as Promise<DeckOutline>;
  }
};

contextBridge.exposeInMainWorld("idrisSlides", api);
