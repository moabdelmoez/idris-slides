import { BrowserWindow } from "electron";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import PptxGenJS from "pptxgenjs";
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
  kind: "pdf" | "html" | "pptx",
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

function slideUrl(url: string, index: number): string {
  const slide = new URL(url);
  slide.searchParams.set("slide", String(index));
  return slide.toString();
}

function projectSlideCount(project: ProjectMetadata): number {
  return Math.max(project.slideCount ?? project.outline?.slides.length ?? 1, 1);
}

export async function exportProjectToPptx(project: ProjectMetadata): Promise<ProjectMetadata> {
  const outputPath = join(projectRoot(project), "exports", `deck-${timestamp()}.pptx`);
  await mkdir(dirname(outputPath), { recursive: true });

  const session = await startProjectPreview(project);
  const window = new BrowserWindow({
    width: 1920,
    height: 1080,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      offscreen: true
    }
  });
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Idris Slides";
  pptx.subject = project.name;
  pptx.title = project.name;

  try {
    for (let index = 0; index < projectSlideCount(project); index += 1) {
      await window.loadURL(slideUrl(session.url, index));
      const image = await window.webContents.capturePage();
      const slide = pptx.addSlide();
      slide.addImage({
        data: `data:image/png;base64,${image.toPNG().toString("base64")}`,
        x: 0,
        y: 0,
        w: 13.333,
        h: 7.5
      });
    }

    await pptx.writeFile({ fileName: outputPath });
  } finally {
    window.destroy();
  }

  return recordExport(project, "pptx", outputPath);
}

export async function exportProject(
  project: ProjectMetadata,
  kind: "pdf" | "html" | "pptx"
): Promise<ProjectMetadata> {
  if (kind === "pdf") {
    return exportProjectToPdf(project);
  }

  if (kind === "pptx") {
    return exportProjectToPptx(project);
  }

  return exportProjectToHtml(project);
}
