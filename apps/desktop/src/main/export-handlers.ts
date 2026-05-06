import { BrowserWindow } from "electron";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import type { ProjectMetadata } from "@idris-slides/project";
import { exportDeckToHtml, updateProject } from "@idris-slides/project";
import { commandRunner } from "./command-runner";
import { startProjectPreview } from "./preview-manager";

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function projectRoot(project: ProjectMetadata): string {
  return dirname(project.deckPath);
}

async function recordExport(
  project: ProjectMetadata,
  kind: "pdf" | "html",
  path: string
): Promise<ProjectMetadata> {
  return updateProject(projectRoot(project), (current) => ({
    ...current,
    exports: [
      ...current.exports,
      {
        id: randomUUID(),
        kind,
        path,
        createdAt: new Date().toISOString()
      }
    ]
  }));
}

export async function exportProjectToHtml(project: ProjectMetadata): Promise<ProjectMetadata> {
  const outputPath = join(projectRoot(project), "exports", `html-${timestamp()}`);
  await mkdir(dirname(outputPath), { recursive: true });
  await exportDeckToHtml({ deckPath: project.deckPath, outputPath, runner: commandRunner });
  return recordExport(project, "html", outputPath);
}

export async function exportProjectToPdf(project: ProjectMetadata): Promise<ProjectMetadata> {
  const outputPath = join(projectRoot(project), "exports", `deck-${timestamp()}.pdf`);
  await mkdir(dirname(outputPath), { recursive: true });

  const session = await startProjectPreview(project);
  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      offscreen: true
    }
  });

  try {
    await window.loadURL(session.url);
    const pdf = await window.webContents.printToPDF({
      landscape: true,
      printBackground: true,
      margins: { marginType: "none" }
    });
    await writeFile(outputPath, pdf);
  } finally {
    window.destroy();
  }

  return recordExport(project, "pdf", outputPath);
}

export async function exportProject(
  project: ProjectMetadata,
  kind: "pdf" | "html"
): Promise<ProjectMetadata> {
  if (kind === "pdf") {
    return exportProjectToPdf(project);
  }

  return exportProjectToHtml(project);
}
