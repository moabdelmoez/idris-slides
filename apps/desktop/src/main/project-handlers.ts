import { app } from "electron";
import { join } from "node:path";
import { createProject, createProjectFromOutline } from "@idris-slides/project";
import type { DeckOutline } from "../shared/types";

function workspaceRoot(): string {
  return join(app.getPath("userData"), "projects");
}

export async function createLocalProject(name: string) {
  return createProject({ name, workspaceRoot: workspaceRoot() });
}

export async function createLocalDeckFromOutline(prompt: string, outline: DeckOutline) {
  return createProjectFromOutline({
    prompt,
    outline,
    workspaceRoot: workspaceRoot()
  });
}
