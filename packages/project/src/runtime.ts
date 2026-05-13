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
  emphasis?: DeckOutlineSlide["emphasis"];
  visualSystem?: DeckOutlineSlide["visualSystem"];
  blocks?: Array<NonNullable<DeckOutlineSlide["blocks"]>[number] & {
    labelEditPath: string;
    valueEditPath?: string;
    detailEditPath?: string;
  }>;
  metrics?: Array<NonNullable<DeckOutlineSlide["metrics"]>[number] & {
    labelEditPath: string;
    valueEditPath?: string;
    detailEditPath?: string;
  }>;
  diagram?: DeckOutlineSlide["diagram"];
  titleEditPath: string;
  contentEditPath: string;
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

function sanitizeSlideText(value: string | undefined): string {
  return (value ?? "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeStructuredBlocks(
  blocks: DeckOutlineSlide["blocks"] | DeckOutlineSlide["metrics"] | undefined,
  editPath: string
): RenderableSlide["blocks"] {
  return blocks
    ?.filter((block) => sanitizeSlideText(block.label))
    .slice(0, 6)
    .map((block, blockIndex) => ({
      label: sanitizeSlideText(block.label),
      value: block.value ? sanitizeSlideText(block.value) : undefined,
      detail: block.detail ? sanitizeSlideText(block.detail) : undefined,
      tone: block.tone,
      labelEditPath: `${editPath}.${blockIndex}.label`,
      valueEditPath: block.value ? `${editPath}.${blockIndex}.value` : undefined,
      detailEditPath: block.detail ? `${editPath}.${blockIndex}.detail` : undefined
    }));
}

function toRenderableSlides(slides: DeckOutlineSlide[]): RenderableSlide[] {
  return normalizeSlides(slides).map((slide, index) => ({
    title: sanitizeSlideText(slide.title),
    content: sanitizeSlideText(slide.content),
    layout: slide.layout,
    emphasis: slide.emphasis,
    visualSystem: slide.visualSystem,
    blocks: sanitizeStructuredBlocks(slide.blocks, `slides.${index}.blocks`),
    metrics: sanitizeStructuredBlocks(slide.metrics, `slides.${index}.metrics`),
    diagram: slide.diagram
      ? {
          ...slide.diagram,
          nodes: slide.diagram.nodes.map((node, nodeIndex) => ({
            ...node,
            labelEditPath: `slides.${index}.diagram.nodes.${nodeIndex}.label`,
            sublabelEditPath: `slides.${index}.diagram.nodes.${nodeIndex}.sublabel`,
            itemEditPaths: node.items?.map(
              (_item, itemIndex) => `slides.${index}.diagram.nodes.${nodeIndex}.items.${itemIndex}`
            )
          }))
        }
      : undefined,
    titleEditPath: `slides.${index}.title`,
    contentEditPath: `slides.${index}.content`
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

const requestedSlide = Number(new URLSearchParams(window.location.search).get("slide"));
const initialIndex = Number.isInteger(requestedSlide) && requestedSlide >= 0 ? requestedSlide : 0;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SlideDeck initialIndex={initialIndex} pages={pages} presentMode />
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
  labelEditPath?: string;
  role?: "backend" | "external" | "focal" | "input" | "optional" | "store";
  sublabel?: string;
  sublabelEditPath?: string;
  items?: string[];
  itemEditPaths?: string[];
  lane?: string;
  level?: number;
  radius?: number;
  x?: number;
  y?: number;
};

type GeneratedDiagramConnection = {
  from: string;
  to: string;
  cardinalityFrom?: string;
  cardinalityTo?: string;
  kind?: "call" | "handoff" | "relationship" | "return" | "self" | "transition";
  label?: string;
  tone?: "accent" | "default" | "link";
};

type GeneratedDiagramSpec = {
  type:
    | "architecture"
    | "er"
    | "flowchart"
    | "layers"
    | "nested"
    | "pyramid"
    | "quadrant"
    | "sequence"
    | "state"
    | "swimlane"
    | "timeline"
    | "tree"
    | "venn";
  variant?: "consultant";
  nodes: GeneratedDiagramNode[];
  connections?: GeneratedDiagramConnection[];
};

type GeneratedContentTone = "coral" | "moon" | "oasis" | "purple" | "sea" | "silver" | "sunlight" | "sunset";

type GeneratedStructuredBlock = {
  label: string;
  labelEditPath: string;
  value?: string;
  valueEditPath?: string;
  detail?: string;
  detailEditPath?: string;
  tone?: GeneratedContentTone;
};

type GeneratedSlideSpec = {
  title: string;
  titleEditPath: string;
  content: string;
  contentEditPath: string;
  layout: string;
  emphasis?: "balanced" | "dense" | "hero";
  visualSystem?: "editorial" | "executive" | "technical";
  blocks?: GeneratedStructuredBlock[];
  metrics?: GeneratedStructuredBlock[];
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

function toneColor(tone: GeneratedContentTone | undefined, fallback = colors.coral): string {
  return tone ? colors[tone] : fallback;
}

function Folio({ index, variant = "light" }: { index: number; variant?: "dark" | "light" }) {
  const color = variant === "dark" ? "rgba(255,255,255,0.62)" : colors.silver;

  return (
    <footer
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        color,
        fontSize: 20,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        borderTop: "1px solid " + (variant === "dark" ? "rgba(255,255,255,0.18)" : "rgba(142,154,160,0.28)"),
        paddingTop: 18
      }}
    >
      <span>Solutions</span>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{String(index + 1).padStart(2, "0")}</span>
    </footer>
  );
}

function contentItems(content: string, maxItems = 4): string[] {
  return content
    .split(/(?:\\n+|\\.\\s+|;\\s+)/)
    .map((item) => item.trim().replace(/[.:;]+$/, ""))
    .filter(Boolean)
    .slice(0, maxItems);
}

function fallbackBlocks(slide: GeneratedSlideSpec, maxItems = 4): GeneratedStructuredBlock[] {
  return contentItems(slide.content, maxItems).map((item, index) => ({
    label: index === 0 ? "Signal" : "Point " + String(index + 1).padStart(2, "0"),
    labelEditPath: slide.contentEditPath,
    detail: item,
    detailEditPath: slide.contentEditPath,
    tone: (["coral", "sunlight", "oasis", "sea"] as const)[index] ?? "coral"
  }));
}

function slideBlocks(slide: GeneratedSlideSpec, maxItems = 4): GeneratedStructuredBlock[] {
  const structured = [...(slide.blocks ?? []), ...(slide.metrics ?? [])].slice(0, maxItems);
  return structured.length > 0 ? structured : fallbackBlocks(slide, maxItems);
}

function StructuredBlockGrid({
  blocks,
  columns = 3,
  variant = "light"
}: {
  blocks: GeneratedStructuredBlock[];
  columns?: 2 | 3 | 4;
  variant?: "dark" | "light";
}) {
  const dark = variant === "dark";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(" + columns + ", minmax(0, 1fr))", gap: 18 }}>
      {blocks.map((block, index) => {
        const accent = toneColor(block.tone, [colors.coral, colors.sunlight, colors.oasis, colors.sea][index] ?? colors.coral);
        return (
          <article
            key={block.label + String(index)}
            style={{
              minHeight: 220,
              border: "1px solid " + (dark ? "rgba(255,255,255,0.18)" : "rgba(142,154,160,0.28)"),
              borderTop: "8px solid " + accent,
              background: dark ? "rgba(255,255,255,0.06)" : "rgba(29,37,45,0.035)",
              padding: "26px 24px",
              display: "grid",
              alignContent: "space-between",
              boxSizing: "border-box"
            }}
          >
            <p
              data-idris-edit-path={block.labelEditPath}
              style={{ margin: 0, color: dark ? "rgba(255,255,255,0.66)" : colors.silver, fontSize: 18, letterSpacing: "0.12em", textTransform: "uppercase" }}
            >
              {block.label}
            </p>
            <div style={{ display: "grid", gap: 12 }}>
              {block.value ? (
                <strong
                  data-idris-edit-path={block.valueEditPath}
                  style={{ color: dark ? colors.air : colors.purple, fontSize: 58, lineHeight: 0.95, fontWeight: 800 }}
                >
                  {block.value}
                </strong>
              ) : null}
              {block.detail ? (
                <p
                  data-idris-edit-path={block.detailEditPath}
                  style={{ margin: 0, color: dark ? colors.air : colors.onyx, fontSize: block.value ? 23 : 28, lineHeight: 1.18 }}
                >
                  {block.detail}
                </p>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function layoutKind(layout: string): "metric" | "timeline" | "comparison" | "closing" | "section" | "default" {
  const normalized = layout.toLowerCase();

  if (normalized.includes("metric")) {
    return "metric";
  }

  if (normalized.includes("timeline")) {
    return "timeline";
  }

  if (normalized.includes("comparison")) {
    return "comparison";
  }

  if (normalized.includes("closing")) {
    return "closing";
  }

  if (normalized.includes("section")) {
    return "section";
  }

  return "default";
}

function BodyList({ content, editPath, color = colors.onyx }: { content: string; editPath: string; color?: string }) {
  const items = contentItems(content);

  if (items.length <= 1) {
    return (
      <p data-idris-edit-path={editPath} style={{ color, fontSize: 32, lineHeight: 1.28, margin: 0, maxWidth: 900 }}>
        {content}
      </p>
    );
  }

  return (
    <ul data-idris-edit-path={editPath} style={{ display: "grid", gap: 18, margin: 0, padding: 0, listStyle: "none" }}>
      {items.map((item, itemIndex) => (
        <li key={item} style={{ display: "grid", gridTemplateColumns: "34px 1fr", gap: 18, alignItems: "start", color, fontSize: 28, lineHeight: 1.24 }}>
          <span style={{ width: 12, height: 12, marginTop: 12, borderRadius: 999, background: itemIndex === 0 ? colors.coral : colors.sea }} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
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
        data-idris-edit-path={node.labelEditPath}
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
          data-idris-edit-path={node.sublabelEditPath}
        >
          {node.sublabel}
        </text>
      ) : null}
    </g>
  );
}

function isSpecializedDiagram(type: GeneratedDiagramSpec["type"]): boolean {
  return (
    type === "sequence" ||
    type === "state" ||
    type === "er" ||
    type === "swimlane" ||
    type === "nested" ||
    type === "tree" ||
    type === "layers" ||
    type === "venn"
  );
}

function renderSequenceDiagram(nodes: PositionedDiagramNode[], connections: DiagramConnection[]) {
  const actors = nodes.slice(0, 5).map((node, index, all) => ({
    ...node,
    x: 120 + (all.length > 1 ? (760 / (all.length - 1)) * index : 380)
  }));
  const actorById = new Map(actors.map((node) => [node.id, node]));

  return (
    <>
      {actors.map((actor) => (
        <g key={actor.id}>
          <rect x={actor.x - 72} y="76" width="144" height="48" rx="6" fill={nodeFill(actor.role)} stroke={nodeStroke(actor.role)} />
          <text x={actor.x} y="107" textAnchor="middle" fill={colors.onyx} fontFamily={fonts.body} fontSize="18" fontWeight="700">
            {actor.label}
          </text>
          <line x1={actor.x} y1="124" x2={actor.x} y2="540" stroke={colors.silver} strokeWidth="1" strokeDasharray="5,5" />
        </g>
      ))}
      {connections.slice(0, 12).map((connection, index) => {
        const from = actorById.get(connection.from);
        const to = actorById.get(connection.to);
        if (!from || !to) {
          return null;
        }
        const y = 176 + index * 44;
        const stroke = connectionStroke(connection.tone);
        return (
          <g key={connection.from + connection.to + String(index)}>
            <line
              x1={from.x}
              y1={y}
              x2={to.x}
              y2={y}
              stroke={stroke}
              strokeWidth="2"
              strokeDasharray={connection.kind === "return" ? "6,5" : undefined}
              markerEnd={markerFor(connection.tone)}
            />
            {connection.label ? (
              <text x={(from.x + to.x) / 2} y={y - 10} textAnchor="middle" fill={stroke} fontFamily={fonts.body} fontSize="15" fontWeight="700">
                {connection.label.slice(0, 18).toUpperCase()}
              </text>
            ) : null}
          </g>
        );
      })}
    </>
  );
}

function renderStateDiagram(nodes: PositionedDiagramNode[], connections: DiagramConnection[]) {
  const stateNodes = nodes.slice(0, 8);
  const nodeById = new Map(stateNodes.map((node) => [node.id, node]));

  return (
    <>
      <circle cx="68" cy="316" r="10" fill={colors.onyx} />
      <circle cx="932" cy="316" r="14" fill="none" stroke={colors.onyx} strokeWidth="2" />
      <circle cx="932" cy="316" r="8" fill={colors.onyx} />
      {connections.slice(0, 12).map((connection, index) => {
        const from = nodeById.get(connection.from);
        const to = nodeById.get(connection.to);
        if (!from || !to) {
          return null;
        }
        const stroke = connectionStroke(connection.tone);
        return (
          <g key={connection.from + connection.to + String(index)}>
            <path d={"M " + from.x + " " + from.y + " C " + ((from.x + to.x) / 2) + " " + (from.y - 80) + ", " + ((from.x + to.x) / 2) + " " + (to.y - 80) + ", " + to.x + " " + to.y} fill="none" stroke={stroke} strokeWidth="2" markerEnd={markerFor(connection.tone)} />
            {connection.label ? (
              <text x={(from.x + to.x) / 2} y={Math.min(from.y, to.y) - 54} textAnchor="middle" fill={stroke} fontFamily={fonts.body} fontSize="15" fontWeight="700">
                {connection.label.slice(0, 22)}
              </text>
            ) : null}
          </g>
        );
      })}
      {stateNodes.map((node) => (
        <g key={node.id}>
          <rect x={node.x - 84} y={node.y - 38} width="168" height="76" rx="10" fill={nodeFill(node.role)} stroke={nodeStroke(node.role)} strokeWidth="1.4" />
          <text x={node.x} y={node.y + 6} textAnchor="middle" fill={colors.onyx} fontFamily={fonts.body} fontSize="22" fontWeight="700" data-idris-edit-path={node.labelEditPath}>
            {node.label}
          </text>
        </g>
      ))}
    </>
  );
}

function renderErDiagram(nodes: PositionedDiagramNode[], connections: DiagramConnection[]) {
  const entities = nodes.slice(0, 8);
  const nodeById = new Map(entities.map((node) => [node.id, node]));

  return (
    <>
      {connections.slice(0, 12).map((connection, index) => {
        const from = nodeById.get(connection.from);
        const to = nodeById.get(connection.to);
        if (!from || !to) {
          return null;
        }
        return (
          <g key={connection.from + connection.to + String(index)}>
            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={colors.silver} strokeWidth="1.4" />
            <text x={(from.x * 3 + to.x) / 4} y={(from.y * 3 + to.y) / 4 - 10} textAnchor="middle" fill={colors.onyx} fontFamily={fonts.body} fontSize="15">
              {connection.cardinalityFrom}
            </text>
            <text x={(from.x + to.x * 3) / 4} y={(from.y + to.y * 3) / 4 - 10} textAnchor="middle" fill={colors.onyx} fontFamily={fonts.body} fontSize="15">
              {connection.cardinalityTo}
            </text>
          </g>
        );
      })}
      {entities.map((node) => (
        <g key={node.id}>
          <rect x={node.x - 96} y={node.y - 64} width="192" height="128" rx="8" fill={colors.air} stroke={nodeStroke(node.role)} strokeWidth="1.4" />
          <rect x={node.x - 96} y={node.y - 64} width="192" height="36" rx="8" fill={nodeFill(node.role)} stroke={nodeStroke(node.role)} strokeWidth="1.4" />
          <text x={node.x} y={node.y - 40} textAnchor="middle" fill={colors.onyx} fontFamily={fonts.body} fontSize="18" fontWeight="700" data-idris-edit-path={node.labelEditPath}>
            {node.label}
          </text>
          {(node.items ?? []).slice(0, 4).map((item, index) => (
            <text key={item} x={node.x - 78} y={node.y - 4 + index * 22} fill={colors.onyx} fontFamily={fonts.body} fontSize="15" data-idris-edit-path={node.itemEditPaths?.[index]}>
              {item}
            </text>
          ))}
        </g>
      ))}
    </>
  );
}

function renderSwimlaneDiagram(nodes: PositionedDiagramNode[], connections: DiagramConnection[]) {
  const lanes = Array.from(new Set(nodes.map((node) => node.lane ?? "Team"))).slice(0, 5);
  const laneHeight = 420 / Math.max(lanes.length, 1);
  const laneY = (lane: string) => 112 + lanes.indexOf(lane) * laneHeight + laneHeight / 2;
  const stepNodes = nodes.slice(0, 9).map((node, index) => ({
    ...node,
    x: 220 + index * 86,
    y: laneY(node.lane ?? "Team")
  }));
  const nodeById = new Map(stepNodes.map((node) => [node.id, node]));

  return (
    <>
      {lanes.map((lane, index) => (
        <g key={lane}>
          <line x1="56" y1={112 + index * laneHeight} x2="944" y2={112 + index * laneHeight} stroke={colors.silver} strokeWidth="1" />
          <text x="76" y={laneY(lane) + 5} fill={colors.silver} fontFamily={fonts.body} fontSize="16" fontWeight="700">
            {lane.toUpperCase()}
          </text>
        </g>
      ))}
      <line x1="56" y1="532" x2="944" y2="532" stroke={colors.silver} strokeWidth="1" />
      {connections.slice(0, 12).map((connection, index) => {
        const from = nodeById.get(connection.from);
        const to = nodeById.get(connection.to);
        if (!from || !to) {
          return null;
        }
        const stroke = connection.kind === "handoff" ? colors.coral : connectionStroke(connection.tone);
        return <line key={String(index)} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={stroke} strokeWidth="2" markerEnd={markerFor(connection.kind === "handoff" ? "accent" : connection.tone)} />;
      })}
      {stepNodes.map((node) => (
        <g key={node.id}>
          <rect x={node.x - 70} y={node.y - 30} width="140" height="60" rx="8" fill={nodeFill(node.role)} stroke={nodeStroke(node.role)} strokeWidth="1.2" />
          <text x={node.x} y={node.y + 6} textAnchor="middle" fill={colors.onyx} fontFamily={fonts.body} fontSize="17" fontWeight="700" data-idris-edit-path={node.labelEditPath}>
            {node.label}
          </text>
        </g>
      ))}
    </>
  );
}

function renderNestedDiagram(nodes: PositionedDiagramNode[]) {
  return (
    <>
      {nodes.slice(0, 6).map((node, index) => {
        const inset = 48 + index * 52;
        return (
          <g key={node.id}>
            <rect x={inset} y={92 + index * 28} width={1000 - inset * 2} height={440 - index * 56} rx="12" fill={node.role === "focal" ? "rgba(255,55,94,0.08)" : "rgba(29,37,45,0.02)"} stroke={nodeStroke(node.role)} strokeWidth="1.4" />
            <rect x={inset + 20} y={84 + index * 28} width={Math.max(112, node.label.length * 10)} height="24" fill={colors.air} />
            <text x={inset + 28} y={102 + index * 28} fill={nodeStroke(node.role)} fontFamily={fonts.body} fontSize="15" fontWeight="700" data-idris-edit-path={node.labelEditPath}>
              {node.label.toUpperCase()}
            </text>
          </g>
        );
      })}
    </>
  );
}

function renderTreeDiagram(nodes: PositionedDiagramNode[], connections: DiagramConnection[]) {
  const treeNodes = nodes.slice(0, 9).map((node, index) => ({
    ...node,
    x: node.level === 0 ? 500 : 160 + (index - 1) * 170,
    y: 132 + (node.level ?? (index === 0 ? 0 : 1)) * 150
  }));
  const nodeById = new Map(treeNodes.map((node) => [node.id, node]));

  return (
    <>
      {connections.slice(0, 12).map((connection, index) => {
        const from = nodeById.get(connection.from);
        const to = nodeById.get(connection.to);
        if (!from || !to) {
          return null;
        }
        const midY = (from.y + to.y) / 2;
        return <path key={String(index)} d={"M " + from.x + " " + (from.y + 32) + " V " + midY + " H " + to.x + " V " + (to.y - 32)} fill="none" stroke={colors.silver} strokeWidth="1.4" />;
      })}
      {treeNodes.map((node) => (
        <g key={node.id}>
          <rect x={node.x - 72} y={node.y - 30} width="144" height="60" rx="8" fill={nodeFill(node.role)} stroke={nodeStroke(node.role)} strokeWidth="1.2" />
          <text x={node.x} y={node.y + 5} textAnchor="middle" fill={colors.onyx} fontFamily={fonts.body} fontSize="18" fontWeight="700" data-idris-edit-path={node.labelEditPath}>
            {node.label}
          </text>
        </g>
      ))}
    </>
  );
}

function renderLayersDiagram(nodes: PositionedDiagramNode[]) {
  return (
    <>
      {nodes.slice(0, 6).map((node, index) => {
        const y = 112 + index * 72;
        return (
          <g key={node.id}>
            <rect x="108" y={y} width="784" height="72" fill={nodeFill(node.role)} stroke={nodeStroke(node.role)} strokeWidth="1.2" />
            <text x="136" y={y + 43} fill={colors.silver} fontFamily={fonts.body} fontSize="15" fontWeight="700" data-idris-edit-path={node.sublabelEditPath}>
              {node.sublabel ?? "L" + String(index + 1)}
            </text>
            <text x="300" y={y + 43} fill={colors.onyx} fontFamily={fonts.body} fontSize="22" fontWeight="700" data-idris-edit-path={node.labelEditPath}>
              {node.label}
            </text>
          </g>
        );
      })}
    </>
  );
}

function renderVennDiagram(nodes: PositionedDiagramNode[], connections: DiagramConnection[]) {
  const circles = nodes.slice(0, 3);
  const defaults = [
    { x: 400, y: 300, radius: 176 },
    { x: 600, y: 300, radius: 176 },
    { x: 500, y: 420, radius: 176 }
  ];
  const focalLabel = connections[0]?.label ?? "Overlap";

  return (
    <>
      {circles.map((node, index) => {
        const fallback = defaults[index] ?? defaults[0];
        const cx = node.x ?? fallback.x;
        const cy = node.y ?? fallback.y;
        const radius = node.radius ?? fallback.radius;
        return (
          <g key={node.id}>
            <circle cx={cx} cy={cy} r={radius} fill={node.role === "focal" ? "rgba(255,55,94,0.10)" : "rgba(29,37,45,0.04)"} stroke={nodeStroke(node.role)} strokeWidth="1.4" />
            <text x={cx} y={cy - radius - 20} textAnchor="middle" fill={colors.onyx} fontFamily={fonts.body} fontSize="22" fontWeight="700" data-idris-edit-path={node.labelEditPath}>
              {node.label}
            </text>
          </g>
        );
      })}
      <text x="500" y="312" textAnchor="middle" fill={colors.coral} fontFamily={fonts.body} fontSize="24" fontWeight="700">
        {focalLabel}
      </text>
    </>
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
      {diagram.type === "sequence" ? renderSequenceDiagram(nodes, connections) : null}
      {diagram.type === "state" ? renderStateDiagram(nodes, connections) : null}
      {diagram.type === "er" ? renderErDiagram(nodes, connections) : null}
      {diagram.type === "swimlane" ? renderSwimlaneDiagram(nodes, connections) : null}
      {diagram.type === "nested" ? renderNestedDiagram(nodes) : null}
      {diagram.type === "tree" ? renderTreeDiagram(nodes, connections) : null}
      {diagram.type === "layers" ? renderLayersDiagram(nodes) : null}
      {diagram.type === "venn" ? renderVennDiagram(nodes, connections) : null}
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
          {diagram.variant === "consultant" ? (
            <>
              <text x="132" y="148" fill={colors.coral} fontFamily={fonts.body} fontSize="16" fontWeight="700">DO FIRST</text>
              <text x="760" y="148" fill={colors.silver} fontFamily={fonts.body} fontSize="16" fontWeight="700">MAJOR PROJECTS</text>
              <text x="132" y="512" fill={colors.silver} fontFamily={fonts.body} fontSize="16" fontWeight="700">QUICK WINS</text>
              <text x="820" y="512" fill={colors.silver} fontFamily={fonts.body} fontSize="16" fontWeight="700">AVOID</text>
            </>
          ) : null}
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
                  data-idris-edit-path={node.labelEditPath}
                >
                  {node.label}
                </text>
              </g>
            );
          })
        : diagram.type === "quadrant" || isSpecializedDiagram(diagram.type)
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
      {diagram.type !== "pyramid" && diagram.type !== "quadrant" && !isSpecializedDiagram(diagram.type)
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
                data-idris-edit-path={node.labelEditPath}
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
                  data-idris-edit-path={node.sublabelEditPath}
                >
                  {node.sublabel}
                </text>
              ) : null}
            </g>
          ))
        : null}
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
          <h2 data-idris-edit-path={slide.titleEditPath} style={{ fontSize: 64, lineHeight: 1.02, margin: 0, maxWidth: 1200 }}>{slide.title}</h2>
          {slide.content ? (
            <p data-idris-edit-path={slide.contentEditPath} style={{ color: colors.onyx, fontSize: 26, lineHeight: 1.28, margin: "22px 0 0", maxWidth: 1180 }}>
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

function MetricPage({ index, slide }: { index: number; slide: (typeof slideSpecs)[number] }) {
  const items = contentItems(slide.content, 3);
  const lead = items[0] ?? slide.content;
  const blocks = slideBlocks(slide, 4);

  return (
    <section style={{ ...shell, background: colors.air, padding: "76px 96px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <BrandMark />
        <span style={{ color: colors.silver, fontSize: 24 }}>{String(index + 1).padStart(2, "0")}</span>
      </header>
      <main style={{ display: "grid", gridTemplateColumns: "0.86fr 1.14fr", gap: 72, alignItems: "center" }}>
        <div>
          <div style={{ width: 92, height: 12, background: colors.coral, marginBottom: 34 }} />
          <h2 data-idris-edit-path={slide.titleEditPath} style={{ fontSize: slide.emphasis === "hero" ? 92 : 78, lineHeight: 1.02, margin: 0, maxWidth: 820 }}>{slide.title}</h2>
          <p data-idris-edit-path={slide.contentEditPath} style={{ color: colors.onyx, fontSize: 28, lineHeight: 1.24, margin: "34px 0 0", maxWidth: 720 }}>
            {slide.content}
          </p>
        </div>
        <div style={{ display: "grid", gap: 28 }}>
          {blocks.length > 0 ? (
            <StructuredBlockGrid blocks={blocks} columns={blocks.length >= 3 ? 3 : 2} />
          ) : (
            <p data-idris-edit-path={slide.contentEditPath} style={{ color: colors.purple, fontSize: 48, lineHeight: 1.08, margin: 0 }}>
              {lead}
            </p>
          )}
          {blocks.length === 0 && items.length > 1 ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
              {items.slice(1).map((item, itemIndex) => (
                <div key={item} style={{ borderTop: "6px solid " + (itemIndex === 0 ? colors.sunlight : colors.sea), paddingTop: 18 }}>
                  <p style={{ color: colors.onyx, fontSize: 25, lineHeight: 1.24, margin: 0 }}>{item}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </main>
      <Folio index={index} />
    </section>
  );
}

function TimelinePage({ index, slide }: { index: number; slide: (typeof slideSpecs)[number] }) {
  const items = contentItems(slide.content, 4);
  const blocks = slideBlocks(slide, 4);

  return (
    <section style={{ ...shell, padding: "84px 104px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <BrandMark />
        <span style={{ color: colors.silver, fontSize: 24 }}>{String(index + 1).padStart(2, "0")}</span>
      </header>
      <main style={{ display: "grid", gap: 62 }}>
        <h2 data-idris-edit-path={slide.titleEditPath} style={{ fontSize: 76, lineHeight: 1.02, margin: 0, maxWidth: 1100 }}>{slide.title}</h2>
        <ol data-idris-edit-path={slide.contentEditPath} style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 22, margin: 0, padding: 0, listStyle: "none" }}>
          {blocks.map((block, itemIndex) => (
            <li key={block.label + String(itemIndex)} style={{ display: "grid", gap: 20, borderTop: "8px solid " + toneColor(block.tone, [colors.coral, colors.sunlight, colors.oasis, colors.sea][itemIndex] ?? colors.coral), paddingTop: 24 }}>
              <span style={{ color: colors.silver, fontSize: 24 }}>{String(itemIndex + 1).padStart(2, "0")}</span>
              <span style={{ color: colors.onyx, fontSize: 26, lineHeight: 1.22 }}>{block.value ? block.value + " " : ""}{block.detail ?? block.label}</span>
            </li>
          ))}
        </ol>
      </main>
      <Folio index={index} />
    </section>
  );
}

function ComparisonPage({ index, slide }: { index: number; slide: (typeof slideSpecs)[number] }) {
  const blocks = slideBlocks(slide, 4);
  const blockMidpoint = Math.ceil(blocks.length / 2);

  return (
    <section style={{ ...shell, padding: "86px 104px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <BrandMark />
        <span style={{ color: colors.silver, fontSize: 24 }}>{String(index + 1).padStart(2, "0")}</span>
      </header>
      <main style={{ display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: 68, alignItems: "center" }}>
        <h2 data-idris-edit-path={slide.titleEditPath} style={{ fontSize: 72, lineHeight: 1.04, margin: 0 }}>{slide.title}</h2>
        <div data-idris-edit-path={slide.contentEditPath} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
          {[blocks.slice(0, blockMidpoint), blocks.slice(blockMidpoint)].map((group, groupIndex) => (
            <div key={String(groupIndex)} style={{ background: groupIndex === 0 ? colors.purple : "rgba(29,37,45,0.04)", color: groupIndex === 0 ? colors.air : colors.onyx, padding: 38, minHeight: 320, display: "grid", alignContent: "center", gap: 20 }}>
              {group.map((block, blockIndex) => (
                <p key={block.label + String(blockIndex)} style={{ fontSize: 25, lineHeight: 1.25, margin: 0 }}>
                  <strong style={{ display: "block", color: groupIndex === 0 ? colors.sunlight : toneColor(block.tone), fontSize: 20, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>{block.label}</strong>
                  {block.value ? block.value + " " : ""}{block.detail ?? ""}
                </p>
              ))}
            </div>
          ))}
        </div>
      </main>
      <Folio index={index} />
    </section>
  );
}

function ClosingPage({ index, slide }: { index: number; slide: (typeof slideSpecs)[number] }) {
  const blocks = slideBlocks(slide, 3);

  return (
    <section style={{ ...shell, background: colors.purple, color: colors.air, padding: "92px 116px", justifyContent: "center", gap: 58 }}>
      <BrandMark />
      <div style={{ display: "grid", gap: 38 }}>
        <h2 data-idris-edit-path={slide.titleEditPath} style={{ fontSize: 96, lineHeight: 0.98, margin: 0, maxWidth: 1180 }}>{slide.title}</h2>
        {blocks.length > 0 ? <StructuredBlockGrid blocks={blocks} columns={blocks.length >= 3 ? 3 : 2} variant="dark" /> : <BodyList content={slide.content} editPath={slide.contentEditPath} color={colors.air} />}
      </div>
      <Folio index={index} variant="dark" />
    </section>
  );
}

function ContentPage({ index, slide }: { index: number; slide: (typeof slideSpecs)[number] }) {
  if (slide.diagram) {
    return <DiagramSlide index={index} slide={slide} />;
  }

  const isTitleLayout = slide.layout.toLowerCase().includes("title");
  const kind = layoutKind(slide.layout);
  const blocks = slideBlocks(slide, slide.emphasis === "dense" ? 6 : 4);

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
          <h1 data-idris-edit-path={slide.titleEditPath} style={{ fontSize: 112, lineHeight: 1, margin: 0, maxWidth: 1320 }}>{slide.title}</h1>
          <p data-idris-edit-path={slide.contentEditPath} style={{ fontSize: 38, lineHeight: 1.28, margin: "44px 0 0", maxWidth: 1180 }}>
            {slide.content}
          </p>
        </div>
      </section>
    );
  }

  if (kind === "metric") {
    return <MetricPage index={index} slide={slide} />;
  }

  if (kind === "timeline") {
    return <TimelinePage index={index} slide={slide} />;
  }

  if (kind === "comparison") {
    return <ComparisonPage index={index} slide={slide} />;
  }

  if (kind === "closing" || kind === "section") {
    return <ClosingPage index={index} slide={slide} />;
  }

  return (
    <section style={shell}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <BrandMark />
        <span style={{ color: colors.silver, fontSize: 26 }}>{String(index + 1).padStart(2, "0")}</span>
      </header>
      <main style={{ display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 78, alignItems: "center" }}>
        <div>
          <div style={{ width: 84, height: 10, background: colors.coral, marginBottom: 30 }} />
          <h2 data-idris-edit-path={slide.titleEditPath} style={{ fontSize: 82, lineHeight: 1.04, margin: 0 }}>{slide.title}</h2>
        </div>
        <aside
          style={{
            borderTop: "10px solid " + colors.purple,
            padding: "42px 0 0",
            minHeight: 300,
            display: "grid",
            alignContent: "center",
            boxSizing: "border-box"
          }}
        >
          <BodyList content={slide.content} editPath={slide.contentEditPath} />
          {blocks.length > 1 ? (
            <div style={{ marginTop: 32 }}>
              <StructuredBlockGrid blocks={blocks.slice(0, 4)} columns={2} />
            </div>
          ) : null}
        </aside>
      </main>
      <Folio index={index} />
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
