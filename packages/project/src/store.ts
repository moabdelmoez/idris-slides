import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { nanoid } from "nanoid";
import {
  projectAssetsPath,
  projectDeckPath,
  projectMetadataPath,
  projectRoot
} from "./paths";
import type { CreateProjectInput, ProjectMetadata } from "./types";

function nowIso(): string {
  return new Date().toISOString();
}

async function writeJsonAtomic(path: string, value: unknown): Promise<void> {
  const tmpPath = `${path}.${nanoid(8)}.tmp`;
  await writeFile(tmpPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tmpPath, path);
}

export async function createProject(input: CreateProjectInput): Promise<ProjectMetadata> {
  const id = nanoid(10);
  const root = projectRoot(input.workspaceRoot, id);
  const deckPath = projectDeckPath(root);
  const createdAt = nowIso();

  await mkdir(deckPath, { recursive: true });
  await mkdir(projectAssetsPath(root), { recursive: true });

  const project: ProjectMetadata = {
    id,
    name: input.name,
    createdAt,
    updatedAt: createdAt,
    deckPath,
    exports: []
  };

  await writeJsonAtomic(projectMetadataPath(root), project);
  return project;
}

export async function readProject(root: string): Promise<ProjectMetadata> {
  const raw = await readFile(projectMetadataPath(root), "utf8");
  return JSON.parse(raw) as ProjectMetadata;
}

export async function listProjects(workspaceRoot: string): Promise<ProjectMetadata[]> {
  let entries: string[];

  try {
    entries = await readdir(workspaceRoot);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const projects = await Promise.all(
    entries.map(async (entry) => {
      try {
        return await readProject(projectRoot(workspaceRoot, entry));
      } catch {
        return null;
      }
    })
  );

  return projects
    .filter((project): project is ProjectMetadata => Boolean(project))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function updateProject(
  root: string,
  updater: (project: ProjectMetadata) => ProjectMetadata
): Promise<ProjectMetadata> {
  const current = await readProject(root);
  const next = updater({ ...current, updatedAt: nowIso() });
  await writeJsonAtomic(projectMetadataPath(root), next);
  return next;
}
