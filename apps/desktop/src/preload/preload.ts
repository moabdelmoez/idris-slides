import { contextBridge, ipcRenderer } from "electron";
import type { ProjectMetadata } from "@idris-slides/project";
import type { AppSettings, DeckOutline, GenerateOutlineOptions, GenerationMode, PreviewSessionInfo } from "../shared/types";

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
  saveTavilyApiKey(apiKey: string): Promise<AppSettings>;
  classifyPrompt(prompt: string): Promise<GenerationMode>;
  generateOutline(prompt: string, options?: GenerateOutlineOptions): Promise<DeckOutline>;
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
  saveTavilyApiKey(apiKey) {
    return ipcRenderer.invoke("settings:saveTavilyApiKey", apiKey) as Promise<AppSettings>;
  },
  classifyPrompt(prompt) {
    return ipcRenderer.invoke("ai:classifyPrompt", prompt) as Promise<GenerationMode>;
  },
  generateOutline(prompt, options) {
    return ipcRenderer.invoke("ai:generateOutline", prompt, options) as Promise<DeckOutline>;
  }
};

contextBridge.exposeInMainWorld("idrisSlides", api);
