import { app } from "electron";
import { join } from "node:path";
import { createProject } from "@idris-slides/project";

export async function createLocalProject(name: string) {
  const workspaceRoot = join(app.getPath("userData"), "projects");
  return createProject({ name, workspaceRoot });
}
