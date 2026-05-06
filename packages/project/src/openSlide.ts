import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createProject, updateProject } from "./store";
import type { CommandRunner } from "./types";
import type { CreateProjectFromOutlineInput, DeckOutlineSlide, ProjectMetadata } from "./types";

const openSlideCoreVersion = "^1.0.6";

type ExportDeckInput = {
  deckPath: string;
  outputPath: string;
  runner: CommandRunner;
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
          goal: "Introduce the deck narrative.",
          layout: "Title slide",
          visualDirection: "Use the approved Solutions purple title treatment."
        }
      ];
}

function createPackageJson(name: string): string {
  return `${JSON.stringify(
    {
      name: toPackageName(name),
      private: true,
      version: "0.0.0",
      type: "module",
      scripts: {
        dev: "open-slide dev",
        build: "open-slide build",
        preview: "open-slide preview"
      },
      dependencies: {
        "@open-slide/core": openSlideCoreVersion,
        react: "^18.3.1",
        "react-dom": "^18.3.1"
      },
      devDependencies: {
        "@types/react": "^18.3.12",
        "@types/react-dom": "^18.3.1",
        vite: "^5.4.10"
      }
    },
    null,
    2
  )}\n`;
}

function createOpenSlideConfig(): string {
  return [
    'import type { OpenSlideConfig } from "@open-slide/core";',
    "",
    "const openSlideConfig: OpenSlideConfig = {};",
    "",
    "export default openSlideConfig;",
    ""
  ].join("\n");
}

function createSlideSource(input: CreateProjectFromOutlineInput): string {
  const slides = normalizeSlides(input.outline.slides);

  return `import type { CSSProperties } from "react";
import type { DesignSystem, Page, SlideMeta } from "@open-slide/core";

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

export const design: DesignSystem = {
  palette: {
    bg: colors.air,
    text: colors.onyx,
    accent: colors.purple
  },
  fonts: {
    display: '"STCForward", "STC Forward", Arial, sans-serif',
    body: '"STCForward", "STC Forward", Arial, sans-serif'
  },
  typeScale: {
    hero: 108,
    body: 32
  },
  radius: 8
};

const slideSpecs = ${JSON.stringify(slides, null, 2)} as const;

const shell: CSSProperties = {
  width: "100%",
  height: "100%",
  boxSizing: "border-box",
  background: colors.air,
  color: colors.onyx,
  fontFamily: design.fonts.body,
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

function TitlePage() {
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
        <h1 style={{ fontSize: 112, lineHeight: 1, margin: 0, maxWidth: 1320 }}>
          ${JSON.stringify(input.outline.title)}
        </h1>
        <p style={{ fontSize: 38, lineHeight: 1.28, margin: "44px 0 0", maxWidth: 1180 }}>
          ${JSON.stringify(input.outline.summary)}
        </p>
      </div>
    </section>
  );
}

function ContentPage({ index, slide }: { index: number; slide: (typeof slideSpecs)[number] }) {
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
          <p style={{ fontSize: 36, lineHeight: 1.3, margin: "42px 0 0", color: colors.onyx }}>
            {slide.goal}
          </p>
        </div>
        <aside
          style={{
            borderLeft: \`12px solid \${colors.coral}\`,
            padding: "42px 0 42px 44px",
            minHeight: 360,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 28
          }}
        >
          <p style={{ color: colors.silver, fontSize: 24, margin: 0 }}>Visual direction</p>
          <p style={{ color: colors.onyx, fontSize: 32, lineHeight: 1.34, margin: 0 }}>
            {slide.visualDirection}
          </p>
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
  TitlePage,
  ...slideSpecs.map((slide, index) => {
    const GeneratedPage: Page = () => <ContentPage index={index} slide={slide} />;
    return GeneratedPage;
  })
];

export const meta: SlideMeta = {
  title: ${JSON.stringify(input.outline.title)}
};

export default pages satisfies Page[];
`;
}

async function writeOpenSlideWorkspace(input: CreateProjectFromOutlineInput & { deckPath: string }) {
  const deckId = kebabCase(input.outline.title);
  const slideDir = join(input.deckPath, "slides", deckId);

  await mkdir(slideDir, { recursive: true });
  await writeFile(join(input.deckPath, "package.json"), createPackageJson(input.outline.title), "utf8");
  await writeFile(join(input.deckPath, "open-slide.config.ts"), createOpenSlideConfig(), "utf8");
  await writeFile(join(slideDir, "index.tsx"), createSlideSource(input), "utf8");
}

export async function createProjectFromOutline(
  input: CreateProjectFromOutlineInput
): Promise<ProjectMetadata> {
  const project = await createProject({ name: input.outline.title, workspaceRoot: input.workspaceRoot });
  await writeOpenSlideWorkspace({ ...input, deckPath: project.deckPath });

  const root = join(input.workspaceRoot, project.id);
  return updateProject(root, (current) => ({
    ...current,
    sourcePrompt: input.prompt,
    outline: input.outline,
    slideCount: normalizeSlides(input.outline.slides).length
  }));
}

async function exportDeck(input: ExportDeckInput, kind: "pdf" | "html"): Promise<void> {
  await input.runner.run(
    "npm",
    ["exec", "--", "open-slide", "export", kind, "--out", input.outputPath],
    { cwd: input.deckPath }
  );
}

export async function exportDeckToPdf(input: ExportDeckInput): Promise<void> {
  await exportDeck(input, "pdf");
}

export async function exportDeckToHtml(input: ExportDeckInput): Promise<void> {
  await exportDeck(input, "html");
}
