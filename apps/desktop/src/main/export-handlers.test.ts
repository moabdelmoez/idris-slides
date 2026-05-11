import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectMetadata } from "@idris-slides/project";

const printToPDF = vi.fn();
const capturePage = vi.fn();
const loadURL = vi.fn();
const destroy = vi.fn();
const addImage = vi.fn();
const writeFile = vi.fn();

vi.mock("electron", () => ({
  BrowserWindow: vi.fn(() => ({
    loadURL,
    webContents: {
      printToPDF,
      capturePage
    },
    destroy
  }))
}));

vi.mock("pptxgenjs", () => ({
  default: vi.fn(() => ({
    layout: "",
    author: "",
    subject: "",
    title: "",
    addSlide: vi.fn(() => ({ addImage })),
    writeFile
  }))
}));

vi.mock("./preview-manager", () => ({
  startProjectPreview: vi.fn(async () => ({
    projectId: "project-1",
    url: "http://127.0.0.1:5317",
    slideModuleUrl: "http://127.0.0.1:5317/slides/deck/index.tsx"
  }))
}));

describe("export handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    printToPDF.mockResolvedValue(Buffer.from("pdf"));
    capturePage.mockResolvedValue({
      toPNG: () => Buffer.from("png")
    });
    writeFile.mockResolvedValue(undefined);
  });

  it("exports PowerPoint as full-slide images and records a pptx export", async () => {
    const { exportProjectToPptx } = await import("./export-handlers");
    const root = await mkdtemp(join(tmpdir(), "idris-export-"));
    const project: ProjectMetadata = {
      id: "project-1",
      name: "Export Deck",
      createdAt: "2026-05-06T00:00:00.000Z",
      updatedAt: "2026-05-06T00:00:00.000Z",
      deckPath: join(root, "deck"),
      exports: [],
      slideCount: 2,
      outline: {
        title: "Export Deck",
        summary: "A deck for export.",
        slides: [
          {
            title: "One",
            goal: "Show one.",
            layout: "Title slide",
            visualDirection: "Use brand colors."
          },
          {
            title: "Two",
            goal: "Show two.",
            layout: "Title slide",
            visualDirection: "Use brand colors."
          }
        ]
      }
    };

    await import("node:fs/promises").then(({ mkdir, writeFile: writeJson }) =>
      mkdir(dirname(project.deckPath), { recursive: true }).then(() =>
        writeJson(join(root, "project.json"), `${JSON.stringify(project, null, 2)}\n`, "utf8")
      )
    );

    const updated = await exportProjectToPptx(project);

    expect(loadURL).toHaveBeenNthCalledWith(1, "http://127.0.0.1:5317/?slide=0");
    expect(loadURL).toHaveBeenNthCalledWith(2, "http://127.0.0.1:5317/?slide=1");
    expect(addImage).toHaveBeenCalledTimes(2);
    expect(writeFile).toHaveBeenCalledWith({ fileName: expect.stringMatching(/\.pptx$/) });
    expect(updated.exports).toEqual([
      expect.objectContaining({
        kind: "pptx",
        path: expect.stringMatching(/\.pptx$/)
      })
    ]);

    const metadata = JSON.parse(await readFile(join(root, "project.json"), "utf8")) as ProjectMetadata;
    expect(metadata.exports).toEqual([expect.objectContaining({ kind: "pptx" })]);
  });
});
