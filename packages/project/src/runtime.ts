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
  diagram?: DeckOutlineSlide["diagram"];
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
    layout: slide.layout,
    diagram: slide.diagram
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

type GeneratedDiagramNode = {
  id: string;
  label: string;
  role?: "backend" | "external" | "focal" | "input" | "optional" | "store";
  sublabel?: string;
};

type GeneratedDiagramConnection = {
  from: string;
  to: string;
  label?: string;
  tone?: "accent" | "default" | "link";
};

type GeneratedDiagramSpec = {
  type: "architecture" | "flowchart" | "timeline" | "quadrant" | "pyramid";
  nodes: GeneratedDiagramNode[];
  connections?: GeneratedDiagramConnection[];
};

type GeneratedSlideSpec = {
  title: string;
  content: string;
  layout: string;
  diagram?: GeneratedDiagramSpec;
};

const slideSpecs = ${JSON.stringify(slides, null, 2)} as const satisfies readonly GeneratedSlideSpec[];

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

type DiagramNode = GeneratedDiagramNode;
type DiagramConnection = GeneratedDiagramConnection;
type PositionedDiagramNode = DiagramNode & { x: number; y: number };

function nodeFill(role: DiagramNode["role"]): string {
  if (role === "focal") {
    return "rgba(255, 55, 94, 0.08)";
  }

  if (role === "store") {
    return "rgba(29, 37, 45, 0.05)";
  }

  if (role === "input") {
    return "rgba(142, 154, 160, 0.14)";
  }

  return colors.air;
}

function nodeStroke(role: DiagramNode["role"]): string {
  if (role === "focal") {
    return colors.coral;
  }

  if (role === "store" || role === "input") {
    return colors.silver;
  }

  return colors.onyx;
}

function connectionStroke(tone: DiagramConnection["tone"]): string {
  if (tone === "accent") {
    return colors.coral;
  }

  if (tone === "link") {
    return colors.sea;
  }

  return colors.silver;
}

function markerFor(tone: DiagramConnection["tone"]): string {
  if (tone === "accent") {
    return "url(#arrow-accent)";
  }

  if (tone === "link") {
    return "url(#arrow-link)";
  }

  return "url(#arrow)";
}

function layoutDiagramNodes(diagram: GeneratedDiagramSpec): PositionedDiagramNode[] {
  const nodes = diagram.nodes.slice(0, 9);

  if (diagram.type === "flowchart" || diagram.type === "pyramid") {
    return nodes.map((node, index) => ({
      ...node,
      x: 520,
      y: 132 + index * 112
    }));
  }

  if (diagram.type === "timeline") {
    const gap = nodes.length > 1 ? 840 / (nodes.length - 1) : 0;
    return nodes.map((node, index) => ({
      ...node,
      x: 100 + gap * index,
      y: index % 2 === 0 ? 220 : 360
    }));
  }

  if (diagram.type === "quadrant") {
    const points = [
      [272, 204],
      [728, 204],
      [272, 440],
      [728, 440],
      [500, 320],
      [380, 252],
      [620, 388],
      [380, 388],
      [620, 252]
    ];

    return nodes.map((node, index) => ({
      ...node,
      x: points[index]?.[0] ?? 500,
      y: points[index]?.[1] ?? 320
    }));
  }

  const rows = nodes.length <= 3 ? 1 : nodes.length <= 6 ? 2 : 3;
  const columns = Math.ceil(nodes.length / rows);
  const xGap = columns > 1 ? 720 / (columns - 1) : 0;
  const yGap = rows > 1 ? 280 / (rows - 1) : 0;

  return nodes.map((node, index) => ({
    ...node,
    x: 140 + (index % columns) * xGap,
    y: 180 + Math.floor(index / columns) * yGap
  }));
}

function renderQuadrantItem(node: PositionedDiagramNode) {
  const fill = node.role === "focal" ? colors.coral : colors.onyx;
  const labelAnchor = node.x > 760 ? "end" : "start";
  const labelX = node.x > 760 ? node.x - 18 : node.x + 18;

  return (
    <g key={node.id}>
      <circle cx={node.x} cy={node.y} r="8" fill={fill} />
      <text
        x={labelX}
        y={node.y + 5}
        textAnchor={labelAnchor}
        fill={colors.onyx}
        fontFamily={fonts.body}
        fontSize="22"
        fontWeight={node.role === "focal" ? "700" : "500"}
      >
        {node.label}
      </text>
      {node.sublabel ? (
        <text
          x={labelX}
          y={node.y + 30}
          textAnchor={labelAnchor}
          fill={colors.silver}
          fontFamily={fonts.body}
          fontSize="16"
        >
          {node.sublabel}
        </text>
      ) : null}
    </g>
  );
}

function renderDiagram(diagram: GeneratedDiagramSpec) {
  const nodes = layoutDiagramNodes(diagram);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const connections = (diagram.connections ?? []).slice(0, 12);

  return (
    <svg
      aria-label={diagram.type + " diagram"}
      role="img"
      viewBox="0 0 1000 620"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill={colors.silver} />
        </marker>
        <marker id="arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill={colors.coral} />
        </marker>
        <marker id="arrow-link" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill={colors.sea} />
        </marker>
      </defs>
      <rect width="100%" height="100%" fill={colors.air} />
      {diagram.type === "quadrant" ? (
        <>
          <line x1="500" y1="112" x2="500" y2="520" stroke={colors.silver} strokeWidth="1.2" />
          <line x1="92" y1="316" x2="908" y2="316" stroke={colors.silver} strokeWidth="1.2" />
          <text x="500" y="92" textAnchor="middle" fill={colors.silver} fontFamily={fonts.body} fontSize="18">
            Higher impact
          </text>
          <text x="500" y="568" textAnchor="middle" fill={colors.silver} fontFamily={fonts.body} fontSize="18">
            Lower impact
          </text>
        </>
      ) : null}
      {diagram.type === "timeline" ? (
        <line x1="92" y1="316" x2="908" y2="316" stroke={colors.silver} strokeWidth="1.2" />
      ) : null}
      {diagram.type === "pyramid"
        ? nodes.map((node, index) => {
            const width = 680 - index * 96;
            const x = 500 - width / 2;
            return (
              <g key={node.id}>
                <rect
                  x={x}
                  y={node.y - 42}
                  width={width}
                  height="84"
                  fill={nodeFill(node.role)}
                  stroke={nodeStroke(node.role)}
                  strokeWidth="1"
                />
                <text
                  x="500"
                  y={node.y + 4}
                  textAnchor="middle"
                  fill={colors.onyx}
                  fontFamily={fonts.body}
                  fontSize="28"
                  fontWeight="700"
                >
                  {node.label}
                </text>
              </g>
            );
          })
        : diagram.type === "quadrant"
          ? null
        : connections.map((connection) => {
            const from = nodeById.get(connection.from);
            const to = nodeById.get(connection.to);

            if (!from || !to) {
              return null;
            }

            const midX = (from.x + to.x) / 2;
            const midY = (from.y + to.y) / 2;
            const stroke = connectionStroke(connection.tone);

            return (
              <g key={connection.from + "-" + connection.to + "-" + (connection.label ?? "")}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={stroke}
                  strokeWidth="2"
                  markerEnd={markerFor(connection.tone)}
                />
                {connection.label ? (
                  <>
                    <rect x={midX - 44} y={midY - 23} width="88" height="24" fill={colors.air} />
                    <text
                      x={midX}
                      y={midY - 6}
                      textAnchor="middle"
                      fill={stroke}
                      fontFamily={fonts.body}
                      fontSize="16"
                      fontWeight="700"
                    >
                      {connection.label.slice(0, 14).toUpperCase()}
                    </text>
                  </>
                ) : null}
              </g>
            );
          })}
      {diagram.type === "quadrant" ? nodes.map((node) => renderQuadrantItem(node)) : null}
      {diagram.type !== "pyramid" && diagram.type !== "quadrant"
        ? nodes.map((node) => (
            <g key={node.id}>
              <rect
                x={node.x - 92}
                y={node.y - 44}
                width="184"
                height="88"
                rx="8"
                fill={colors.air}
              />
              <rect
                x={node.x - 92}
                y={node.y - 44}
                width="184"
                height="88"
                rx="8"
                fill={nodeFill(node.role)}
                stroke={nodeStroke(node.role)}
                strokeWidth="1.4"
              />
              <text
                x={node.x}
                y={node.y - (node.sublabel ? 3 : -6)}
                textAnchor="middle"
                fill={colors.onyx}
                fontFamily={fonts.body}
                fontSize="22"
                fontWeight="700"
              >
                {node.label}
              </text>
              {node.sublabel ? (
                <text
                  x={node.x}
                  y={node.y + 24}
                  textAnchor="middle"
                  fill={colors.silver}
                  fontFamily={fonts.body}
                  fontSize="16"
                >
                  {node.sublabel}
                </text>
              ) : null}
            </g>
          ))
        : null}
      <line x1="52" y1="568" x2="948" y2="568" stroke="rgba(29,37,45,0.14)" strokeWidth="1" />
      <text x="52" y="596" fill={colors.silver} fontFamily={fonts.body} fontSize="16">
        {diagram.type.toUpperCase()} - Native Idris diagram
      </text>
    </svg>
  );
}

function DiagramSlide({ index, slide }: { index: number; slide: (typeof slideSpecs)[number] }) {
  if (!slide.diagram) {
    return null;
  }

  return (
    <section style={{ ...shell, padding: "72px 92px", gap: 34 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ color: colors.purple, fontSize: 24, margin: "0 0 18px" }}>{slide.layout}</p>
          <h2 style={{ fontSize: 64, lineHeight: 1.02, margin: 0, maxWidth: 1200 }}>{slide.title}</h2>
          {slide.content ? (
            <p style={{ color: colors.onyx, fontSize: 26, lineHeight: 1.28, margin: "22px 0 0", maxWidth: 1180 }}>
              {slide.content}
            </p>
          ) : null}
        </div>
        <span style={{ color: colors.silver, fontSize: 24 }}>{String(index + 1).padStart(2, "0")}</span>
      </header>
      <div style={{ flex: 1, minHeight: 0 }}>{renderDiagram(slide.diagram)}</div>
    </section>
  );
}

function ContentPage({ index, slide }: { index: number; slide: (typeof slideSpecs)[number] }) {
  if (slide.diagram) {
    return <DiagramSlide index={index} slide={slide} />;
  }

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
