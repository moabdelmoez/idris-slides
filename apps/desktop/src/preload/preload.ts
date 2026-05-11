import { contextBridge, ipcRenderer } from "electron";
import type { ProjectMetadata } from "@idris-slides/project";
import type { AppSettings, DeckOutline, PreviewSessionInfo } from "../shared/types";

export type IdrisSlidesApi = {
  createProject(name: string): Promise<ProjectMetadata>;
  createDeckFromOutline(prompt: string, outline: DeckOutline): Promise<ProjectMetadata>;
  listProjects(): Promise<ProjectMetadata[]>;
  editDeck(project: ProjectMetadata, prompt: string): Promise<ProjectMetadata>;
  saveDeckOutline(project: ProjectMetadata, outline: DeckOutline): Promise<ProjectMetadata>;
  startPreview(project: ProjectMetadata): Promise<PreviewSessionInfo>;
  exportProject(project: ProjectMetadata, kind: "pdf" | "html" | "pptx"): Promise<ProjectMetadata>;
  getSettings(): Promise<AppSettings>;
  chooseWorkspaceRoot(): Promise<AppSettings>;
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
  listProjects() {
    return ipcRenderer.invoke("projects:list") as Promise<ProjectMetadata[]>;
  },
  editDeck(project, prompt) {
    return ipcRenderer.invoke("projects:editDeck", project, prompt) as Promise<ProjectMetadata>;
  },
  saveDeckOutline(project, outline) {
    return ipcRenderer.invoke("projects:saveDeckOutline", project, outline) as Promise<ProjectMetadata>;
  },
  startPreview(project) {
    return ipcRenderer.invoke("projects:startPreview", project) as Promise<PreviewSessionInfo>;
  },
  exportProject(project, kind) {
    return ipcRenderer.invoke("projects:export", project, kind) as Promise<ProjectMetadata>;
  },
  getSettings() {
    return ipcRenderer.invoke("settings:get") as Promise<AppSettings>;
  },
  chooseWorkspaceRoot() {
    return ipcRenderer.invoke("settings:chooseWorkspaceRoot") as Promise<AppSettings>;
  },
  saveGeminiApiKey(apiKey) {
    return ipcRenderer.invoke("settings:saveGeminiApiKey", apiKey) as Promise<AppSettings>;
  },
  generateOutline(prompt) {
    return ipcRenderer.invoke("ai:generateOutline", prompt) as Promise<DeckOutline>;
  }
};

contextBridge.exposeInMainWorld("idrisSlides", api);
