import { app } from "electron";
import { relative, resolve, join } from "node:path";
import { createProject, createProjectFromOutline } from "@idris-slides/project";
import type { ProjectMetadata } from "@idris-slides/project";
import type { DeckOutline } from "../shared/types";
import { startProjectPreview } from "./preview-manager";

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

export function assertLocalProject(project: ProjectMetadata): ProjectMetadata {
  const root = resolve(workspaceRoot());
  const deckPath = resolve(project.deckPath);
  const pathFromRoot = relative(root, deckPath);

  if (pathFromRoot.startsWith("..") || pathFromRoot === "") {
    throw new Error("Project path is outside the Idris Slides workspace.");
  }

  return project;
}

export async function startLocalPreview(project: ProjectMetadata) {
  return startProjectPreview(assertLocalProject(project));
}
