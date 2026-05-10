import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createProject, updateProject } from "./store";
import type { CommandRunner } from "./types";
import type {
  ApplyDeckOutlineInput,
  CreateProjectFromOutlineInput,
  DeckOutline,
  DeckOutlineSlide,
  ProjectMetadata
} from "./types";

const currentDir = dirname(fileURLToPath(import.meta.url));

function ancestorDirs(startDir: string): string[] {
  const dirs: string[] = [];
  let current = resolve(startDir);

  while (true) {
    dirs.push(current);
    const parent = dirname(current);
    if (parent === current) {
      return dirs;
    }
    current = parent;
  }
}

export function resolveWorkspacePackagePath(packageName: "brand" | "core", startDirs = [currentDir, process.cwd()]): string {
  for (const startDir of startDirs) {
    for (const candidateRoot of ancestorDirs(startDir)) {
      const packagePath = join(candidateRoot, "packages", packageName);
      if (existsSync(join(packagePath, "package.json"))) {
        return packagePath;
      }
    }
  }

  throw new Error(`Unable to locate @idris-slides/${packageName} package from ${startDirs.join(", ")}.`);
}

type ExportDeckInput = {
  deckPath: string;
  outputPath: string;
  runner: CommandRunner;
};

type InstallDeckInput = {
  deckPath: string;
  runner: CommandRunner;
};

type StartDeckPreviewInput = {
  deckPath: string;
  port: number;
  runner: CommandRunner;
};

type RenderableSlide = {
  title: string;
  content: string;
  layout: string;
};

function kebabCase(value: string): string {
  const id = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return id || "generated-deck";
}

function toPackageName(value: string): string {
  return kebabCase(value).slice(0, 80) || "generated-deck";
}

function normalizeSlides(slides: DeckOutlineSlide[]): DeckOutlineSlide[] {
  return slides.length > 0
    ? slides
    : [
        {
          title: "Opening",
          content: "Introduce the deck narrative.",
          goal: "Introduce the deck narrative.",
          layout: "Title slide",
          visualDirection: "Use the approved Solutions purple title treatment."
        }
      ];
}

function toRenderableSlides(slides: DeckOutlineSlide[]): RenderableSlide[] {
  return normalizeSlides(slides).map((slide) => ({
    title: slide.title,
    content: slide.content?.trim() ?? "",
    layout: slide.layout
  }));
}

function fileDependency(path: string): string {
  return `file:${path}`;
}

function createPackageJson(name: string): string {
  const corePackagePath = resolveWorkspacePackagePath("core");
  const brandPackagePath = resolveWorkspacePackagePath("brand");

  return `${JSON.stringify(
    {
      name: toPackageName(name),
      private: true,
      version: "0.0.0",
      type: "module",
      scripts: {
        dev: "vite",
        build: "vite build",
        preview: "vite preview"
      },
      dependencies: {
        "@idris-slides/core": fileDependency(corePackagePath),
        "@idris-slides/brand": fileDependency(brandPackagePath),
        react: "^18.3.1",
        "react-dom": "^18.3.1"
      },
      devDependencies: {
        "@types/react": "^18.3.12",
        "@types/react-dom": "^18.3.1",
        vite: "^7.0.0"
      }
    },
    null,
    2
  )}\n`;
}

function createViteConfig(): string {
  return [
    'import { defineConfig } from "vite";',
    "",
    "export default defineConfig({",
    "  esbuild: {",
    '    jsx: "automatic"',
    "  },",
    "  server: {",
    "    hmr: false",
    "  }",
    "});",
    ""
  ].join("\n");
}

function createIndexHtml(): string {
  return [
    '<!doctype html>',
    '<html lang="en">',
    "  <head>",
    '    <meta charset="UTF-8" />',
    '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    "    <title>Idris Slides</title>",
    "  </head>",
    "  <body>",
    '    <div id="root"></div>',
    '    <script type="module" src="/src/main.tsx"></script>',
    "  </body>",
    "</html>",
    ""
  ].join("\n");
}

function createDeckEntry(slideDirName: string): string {
  return `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SlideDeck } from "@idris-slides/core";
import pages from "../slides/${slideDirName}/index";

import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SlideDeck pages={pages} presentMode />
  </StrictMode>
);
`;
}

function createDeckStyles(): string {
  return [
    "html,",
    "body,",
    "#root {",
    "  width: 100%;",
    "  height: 100%;",
    "  margin: 0;",
    "}",
    "",
    "body {",
    "  background: #111827;",
    "  overflow: hidden;",
    "}",
    ""
  ].join("\n");
}

function createSlideSource(outline: DeckOutline): string {
  const slides = toRenderableSlides(outline.slides);

  return `import type { CSSProperties } from "react";
import type { Page } from "@idris-slides/core";

const colors = {
  air: "#ffffff",
  purple: "#4f008c",
  coral: "#ff375e",
  sunlight: "#ffdd40",
  sunset: "#ff6a39",
  oasis: "#00c48c",
  sea: "#1bcad8",
  moon: "#a54ee1",
  silver: "#8e9aa0",
  onyx: "#1d252d"
} as const;

const fonts = {
  display: '"STCForward", "STC Forward", Arial, sans-serif',
  body: '"STCForward", "STC Forward", Arial, sans-serif'
} as const;

const slideSpecs = ${JSON.stringify(slides, null, 2)} as const;

const shell: CSSProperties = {
  width: "100%",
  height: "100%",
  boxSizing: "border-box",
  background: colors.air,
  color: colors.onyx,
  fontFamily: fonts.body,
  padding: "92px 104px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  overflow: "hidden"
};

function BrandMark() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <span style={{ width: 54, height: 10, background: colors.coral, display: "block" }} />
      <span style={{ width: 54, height: 10, background: colors.sunlight, display: "block" }} />
      <span style={{ width: 54, height: 10, background: colors.oasis, display: "block" }} />
      <span style={{ width: 54, height: 10, background: colors.sea, display: "block" }} />
    </div>
  );
}

function ContentPage({ index, slide }: { index: number; slide: (typeof slideSpecs)[number] }) {
  const isTitleLayout = slide.layout.toLowerCase().includes("title");

  if (isTitleLayout) {
    return (
      <section
        style={{
          ...shell,
          background: colors.purple,
          color: colors.air,
          justifyContent: "center",
          gap: 54
        }}
      >
        <BrandMark />
        <div>
          <p style={{ fontSize: 30, margin: "0 0 28px", color: colors.sunlight }}>Solutions deck</p>
          <h1 style={{ fontSize: 112, lineHeight: 1, margin: 0, maxWidth: 1320 }}>{slide.title}</h1>
          <p style={{ fontSize: 38, lineHeight: 1.28, margin: "44px 0 0", maxWidth: 1180 }}>
            {slide.content}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section style={shell}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <BrandMark />
        <span style={{ color: colors.silver, fontSize: 26 }}>{String(index + 1).padStart(2, "0")}</span>
      </header>
      <main style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 72, alignItems: "center" }}>
        <div>
          <p style={{ color: colors.purple, fontSize: 28, margin: "0 0 28px" }}>{slide.layout}</p>
          <h2 style={{ fontSize: 82, lineHeight: 1.04, margin: 0 }}>{slide.title}</h2>
        </div>
        <aside
          style={{
            background: colors.purple,
            color: colors.air,
            padding: "54px",
            minHeight: 360,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 28,
            boxSizing: "border-box"
          }}
        >
          <p style={{ color: colors.sunlight, fontSize: 26, margin: 0 }}>{slide.layout}</p>
          <p style={{ color: colors.air, fontSize: 34, lineHeight: 1.28, margin: 0 }}>{slide.content}</p>
        </aside>
      </main>
      <footer style={{ display: "flex", justifyContent: "space-between", color: colors.silver, fontSize: 22 }}>
        <span>Solutions</span>
        <span>Generated locally by Idris Slides</span>
      </footer>
    </section>
  );
}

const pages: Page[] = [
  ...slideSpecs.map((slide, index) => {
    const GeneratedPage: Page = () => <ContentPage index={index} slide={slide} />;
    return GeneratedPage;
  })
];

export const meta = {
  title: ${JSON.stringify(outline.title)}
};

export default pages satisfies Page[];
`;
}

async function writeDeckSlideFile(deckPath: string, outline: DeckOutline, slideDirName: string): Promise<void> {
  const slideDir = join(deckPath, "slides", slideDirName);

  await mkdir(slideDir, { recursive: true });
  await writeFile(join(slideDir, "index.tsx"), createSlideSource(outline), "utf8");
}

async function writeIdrisDeckWorkspace(input: CreateProjectFromOutlineInput & { deckPath: string }) {
  const slideDirName = kebabCase(input.outline.title);
  await mkdir(join(input.deckPath, "src"), { recursive: true });
  await writeFile(join(input.deckPath, "package.json"), createPackageJson(input.outline.title), "utf8");
  await writeFile(join(input.deckPath, "vite.config.ts"), createViteConfig(), "utf8");
  await writeFile(join(input.deckPath, "index.html"), createIndexHtml(), "utf8");
  await writeFile(join(input.deckPath, "src", "main.tsx"), createDeckEntry(slideDirName), "utf8");
  await writeFile(join(input.deckPath, "src", "styles.css"), createDeckStyles(), "utf8");
  await writeDeckSlideFile(input.deckPath, input.outline, slideDirName);
  return slideDirName;
}

export async function repairDeckRuntimeWorkspace(project: ProjectMetadata): Promise<void> {
  const slideDirName = project.slideDirName ?? kebabCase(project.name);

  await mkdir(join(project.deckPath, "src"), { recursive: true });
  await writeFile(join(project.deckPath, "package.json"), createPackageJson(project.name), "utf8");
  await writeFile(join(project.deckPath, "vite.config.ts"), createViteConfig(), "utf8");
  await writeFile(join(project.deckPath, "index.html"), createIndexHtml(), "utf8");
  await writeFile(join(project.deckPath, "src", "main.tsx"), createDeckEntry(slideDirName), "utf8");
  await writeFile(join(project.deckPath, "src", "styles.css"), createDeckStyles(), "utf8");
}

export async function createProjectFromOutline(
  input: CreateProjectFromOutlineInput
): Promise<ProjectMetadata> {
  const project = await createProject({ name: input.outline.title, workspaceRoot: input.workspaceRoot });
  const slideDirName = await writeIdrisDeckWorkspace({ ...input, deckPath: project.deckPath });

  const root = join(input.workspaceRoot, project.id);
  return updateProject(root, (current) => ({
    ...current,
    sourcePrompt: input.prompt,
    outline: input.outline,
    slideCount: normalizeSlides(input.outline.slides).length,
    slideDirName
  }));
}

export async function applyDeckOutlineEdit(input: ApplyDeckOutlineInput): Promise<ProjectMetadata> {
  const slideDirName = input.project.slideDirName ?? kebabCase(input.project.name);
  await writeDeckSlideFile(input.project.deckPath, input.outline, slideDirName);

  return updateProject(dirname(input.project.deckPath), (current) => ({
    ...current,
    name: input.outline.title,
    outline: input.outline,
    slideCount: normalizeSlides(input.outline.slides).length,
    sourcePrompt: current.sourcePrompt,
    lastEditPrompt: input.editPrompt,
    slideDirName
  }));
}

export async function installDeckDependencies(input: InstallDeckInput): Promise<void> {
  await input.runner.run("npm", ["install"], { cwd: input.deckPath });
}

export async function startDeckPreview(input: StartDeckPreviewInput): Promise<void> {
  await input.runner.run("npm", ["run", "dev", "--", "--port", String(input.port), "--host", "127.0.0.1"], {
    cwd: input.deckPath
  });
}

export async function exportDeckToHtml(input: ExportDeckInput): Promise<void> {
  await input.runner.run("npm", ["run", "build", "--", "--out-dir", input.outputPath], {
    cwd: input.deckPath
  });
}
