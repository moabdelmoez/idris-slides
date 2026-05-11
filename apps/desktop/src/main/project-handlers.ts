import { relative, resolve } from "node:path";
import { createProject, createProjectFromOutline, listProjects } from "@idris-slides/project";
import type { ProjectMetadata } from "@idris-slides/project";
import type { DeckOutline } from "../shared/types";
import { startProjectPreview } from "./preview-manager";
import { getWorkspaceRoot } from "./settings-handlers";

export async function createLocalProject(name: string) {
  return createProject({ name, workspaceRoot: await getWorkspaceRoot() });
}

export async function createLocalDeckFromOutline(prompt: string, outline: DeckOutline) {
  return createProjectFromOutline({
    prompt,
    outline,
    workspaceRoot: await getWorkspaceRoot()
  });
}

export async function listLocalProjects(): Promise<ProjectMetadata[]> {
  return listProjects(await getWorkspaceRoot());
}

export async function assertLocalProject(project: ProjectMetadata): Promise<ProjectMetadata> {
  const root = resolve(await getWorkspaceRoot());
  const deckPath = resolve(project.deckPath);
  const pathFromRoot = relative(root, deckPath);

  if (pathFromRoot.startsWith("..") || pathFromRoot === "") {
    throw new Error("Project path is outside the Idris Slides workspace.");
  }

  return project;
}

export async function startLocalPreview(project: ProjectMetadata) {
  return startProjectPreview(await assertLocalProject(project));
}
