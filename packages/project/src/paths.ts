import { join } from "node:path";

export function projectRoot(workspaceRoot: string, projectId: string): string {
  return join(workspaceRoot, projectId);
}

export function projectMetadataPath(root: string): string {
  return join(root, "project.json");
}

export function projectDeckPath(root: string): string {
  return join(root, "deck");
}

export function projectAssetsPath(root: string): string {
  return join(root, "assets");
}
