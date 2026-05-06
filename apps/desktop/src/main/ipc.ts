import { ipcMain } from "electron";
import { createLocalProject } from "./project-handlers";

export function registerIpcHandlers(): void {
  ipcMain.handle("projects:create", async (_event, name: string) => {
    return createLocalProject(name);
  });
}
