import { ipcMain } from "electron";
import { generateOutline } from "./ai-handlers";
import { createLocalDeckFromOutline, createLocalProject } from "./project-handlers";
import { getSettings, saveGeminiApiKey } from "./settings-handlers";

export function registerIpcHandlers(): void {
  ipcMain.handle("projects:create", async (_event, name: string) => {
    return createLocalProject(name);
  });

  ipcMain.handle("projects:createDeckFromOutline", async (_event, prompt, outline) => {
    return createLocalDeckFromOutline(prompt, outline);
  });

  ipcMain.handle("settings:get", async () => {
    return getSettings();
  });

  ipcMain.handle("settings:saveGeminiApiKey", async (_event, apiKey: string) => {
    return saveGeminiApiKey(apiKey);
  });

  ipcMain.handle("ai:generateOutline", async (_event, prompt: string) => {
    return generateOutline(prompt);
  });
}
