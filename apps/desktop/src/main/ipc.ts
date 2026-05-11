import { ipcMain } from "electron";
import { editDeck, generateOutline } from "./ai-handlers";
import { exportProject } from "./export-handlers";
import {
  assertLocalProject,
  createLocalDeckFromOutline,
  createLocalProject,
  listLocalProjects,
  startLocalPreview
} from "./project-handlers";
import { chooseWorkspaceRoot, getSettings, saveGeminiApiKey } from "./settings-handlers";

export function registerIpcHandlers(): void {
  ipcMain.handle("projects:create", async (_event, name: string) => {
    return createLocalProject(name);
  });

  ipcMain.handle("projects:createDeckFromOutline", async (_event, prompt, outline) => {
    return createLocalDeckFromOutline(prompt, outline);
  });

  ipcMain.handle("projects:list", async () => {
    return listLocalProjects();
  });

  ipcMain.handle("projects:editDeck", async (_event, project, prompt: string) => {
    return editDeck(await assertLocalProject(project), prompt);
  });

  ipcMain.handle("projects:startPreview", async (_event, project) => {
    return startLocalPreview(project);
  });

  ipcMain.handle("projects:export", async (_event, project, kind: "pdf" | "html") => {
    return exportProject(await assertLocalProject(project), kind);
  });

  ipcMain.handle("settings:get", async () => {
    return getSettings();
  });

  ipcMain.handle("settings:saveGeminiApiKey", async (_event, apiKey: string) => {
    return saveGeminiApiKey(apiKey);
  });

  ipcMain.handle("settings:chooseWorkspaceRoot", async () => {
    return chooseWorkspaceRoot();
  });

  ipcMain.handle("ai:generateOutline", async (_event, prompt: string) => {
    return generateOutline(prompt);
  });
}
