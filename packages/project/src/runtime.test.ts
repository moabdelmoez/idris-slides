import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  createProjectFromOutline,
  exportDeckToHtml,
  installDeckDependencies,
  repairDeckRuntimeWorkspace,
  resolveWorkspacePackagePath,
  startDeckPreview
} from "./runtime";
import type { CommandRunner } from "./types";

function createRecordingRunner(): {
  calls: Array<{ command: string; args: string[]; options: { cwd: string } }>;
  runner: CommandRunner;
} {
  const calls: Array<{ command: string; args: string[]; options: { cwd: string } }> = [];

  return {
    calls,
    runner: {
      async run(command, args, options) {
        calls.push({ command, args, options });
      }
    }
  };
}

function requireDependency(dependencies: Record<string, string>, name: string): string {
  const dependency = dependencies[name];
  if (!dependency) {
    throw new Error(`Missing dependency ${name}`);
  }
  return dependency;
}

describe("Idris deck runtime orchestration", () => {
  it("resolves workspace package paths from a bundled Electron main location", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "idris-slides-workspace-"));
    const bundledMainDir = join(workspaceRoot, "apps", "desktop", "out", "main");
    const corePackagePath = join(workspaceRoot, "packages", "core");

    await stat(workspaceRoot);
    await import("node:fs/promises").then(async ({ mkdir, writeFile }) => {
      await mkdir(bundledMainDir, { recursive: true });
      await mkdir(corePackagePath, { recursive: true });
      await writeFile(join(corePackagePath, "package.json"), "{}\n", "utf8");
    });

    expect(resolveWorkspacePackagePath("core", [bundledMainDir])).toBe(corePackagePath);
  });

  it("creates a branded Idris deck workspace from an approved outline", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "idris-slides-"));

    const project = await createProjectFromOutline({
      workspaceRoot,
      prompt: "Create a deck about market expansion",
      outline: {
        title: "Market Expansion",
        summary: "A concise plan for expanding into priority markets.",
        slides: [
          {
            title: "Opportunity",
            content: "Priority markets create a clear expansion path.",
            goal: "Frame the growth opportunity.",
            layout: "Title slide",
            visualDirection: "Use purple with coral emphasis."
          },
          {
            title: "Operating Model",
            content: "Launch readiness depends on coordinated commercial and delivery workstreams.",
            goal: "Show the workstreams required to launch.",
            layout: "Two-column slide",
            visualDirection: "Use sea and oasis accents."
          }
        ]
      }
    });

    const packageJson = await readFile(join(project.deckPath, "package.json"), "utf8");
    const viteConfig = await readFile(join(project.deckPath, "vite.config.ts"), "utf8");
    const slideFile = await readFile(
      join(project.deckPath, "slides", "market-expansion", "index.tsx"),
      "utf8"
    );

    expect((await stat(join(project.deckPath, "slides", "market-expansion"))).isDirectory()).toBe(
      true
    );
    const dependencies = JSON.parse(packageJson).dependencies as Record<string, string>;
    const coreDependency = requireDependency(dependencies, "@idris-slides/core");
    const brandDependency = requireDependency(dependencies, "@idris-slides/brand");
    expect(coreDependency).toMatch(/^file:/);
    expect(brandDependency).toMatch(/^file:/);
    await expect(stat(fileURLToPath(coreDependency))).resolves.toMatchObject({
      isDirectory: expect.any(Function)
    });
    await expect(stat(fileURLToPath(brandDependency))).resolves.toMatchObject({
      isDirectory: expect.any(Function)
    });
    expect(packageJson).not.toContain("@vitejs/plugin-react");
    expect(viteConfig).not.toContain("@vitejs/plugin-react");
    expect(viteConfig).toContain('jsx: "automatic"');
    expect(viteConfig).toContain("hmr: false");
    expect(slideFile).toContain("#4f008c");
    expect(slideFile).toContain("STCForward");
    expect(slideFile).toContain("Market Expansion");
    expect(slideFile).toContain("Priority markets create a clear expansion path.");
    expect(slideFile).not.toContain("Frame the growth opportunity.");
    expect(slideFile).not.toContain("Use purple with coral emphasis.");
    expect(slideFile).not.toContain("Visual direction");
    expect(slideFile).toContain("satisfies Page[]");
    expect(slideFile).toContain('from "@idris-slides/core"');
    expect(project.sourcePrompt).toBe("Create a deck about market expansion");
    expect(project.slideCount).toBe(2);
    expect(project.slideDirName).toBe("market-expansion");
  });

  it("does not add an extra title page beyond the approved outline slides", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "idris-slides-"));

    const project = await createProjectFromOutline({
      workspaceRoot,
      prompt: "Create a 1 slide deck with hello in the middle",
      outline: {
        title: "Welcome Slide",
        summary: "A single slide with hello centered.",
        slides: [
          {
            title: "Hello",
            content: "Hello.",
            goal: "Show hello in the middle of the slide.",
            layout: "Title slide",
            visualDirection: "Use purple with the word hello centered."
          }
        ]
      }
    });

    const slideFile = await readFile(
      join(project.deckPath, "slides", "welcome-slide", "index.tsx"),
      "utf8"
    );

    expect(project.slideCount).toBe(1);
    expect(slideFile).not.toContain("TitlePage");
    expect(slideFile).toContain("...slideSpecs.map");
  });

  it("creates a native diagram slide from a diagram outline spec", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "idris-slides-"));

    const project = await createProjectFromOutline({
      workspaceRoot,
      prompt: "Create one architecture diagram slide for a client reporting system",
      outline: {
        title: "Reporting Architecture",
        summary: "A single architecture diagram for the reporting system.",
        slides: [
          {
            title: "Client Reporting Flow",
            content: "Requests move from client workspace to API, store, and executive dashboard.",
            goal: "Show the reporting system components.",
            layout: "Architecture diagram",
            visualDirection: "Use a native diagram slide with one focal API node.",
            diagram: {
              type: "architecture",
              nodes: [
                { id: "client", label: "Client Workspace", role: "input" },
                { id: "api", label: "Reporting API", role: "focal", sublabel: "REST" },
                { id: "store", label: "Report Store", role: "store" },
                { id: "dashboard", label: "Exec Dashboard", role: "backend" }
              ],
              connections: [
                { from: "client", to: "api", label: "REQUEST" },
                { from: "api", to: "store", label: "READ" },
                { from: "api", to: "dashboard", label: "RENDER", tone: "accent" }
              ]
            }
          }
        ]
      }
    });

    const slideFile = await readFile(
      join(project.deckPath, "slides", "reporting-architecture", "index.tsx"),
      "utf8"
    );

    expect(slideFile).toContain("function DiagramSlide");
    expect(slideFile).toContain("Client Reporting Flow");
    expect(slideFile).toContain("Reporting API");
    expect(slideFile).toContain("REQUEST");
    expect(slideFile).toContain("markerEnd");
    expect(slideFile).toContain("#ff375e");
    expect(slideFile).not.toContain("Use a native diagram slide");
  });

  it("recognizes every supported diagram type in generated slide data", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "idris-slides-"));
    const supportedTypes = [
      "architecture",
      "flowchart",
      "sequence",
      "state",
      "er",
      "timeline",
      "swimlane",
      "quadrant",
      "nested",
      "tree",
      "layers",
      "venn",
      "pyramid"
    ] as const;

    const project = await createProjectFromOutline({
      workspaceRoot,
      prompt: "Create diagram slides for supported types",
      outline: {
        title: "Diagram Types",
        summary: "A deck of supported diagram types.",
        slides: supportedTypes.map((type) => ({
          title: `${type} view`,
          content: `${type} content`,
          goal: `Show ${type}.`,
          layout: `${type} diagram`,
          visualDirection: "Render as native diagram.",
          diagram: {
            type,
            nodes: [
              { id: "a", label: "Start", role: "input" },
              { id: "b", label: "End", role: "focal" }
            ],
            connections: [{ from: "a", to: "b", label: "NEXT" }]
          }
        })) as any
      }
    });

    const slideFile = await readFile(join(project.deckPath, "slides", "diagram-types", "index.tsx"), "utf8");

    for (const type of supportedTypes) {
      expect(slideFile).toContain(`"type": "${type}"`);
    }
    expect(slideFile).toContain("renderDiagram");
  });

  it("emits native renderers for the remaining diagram grammars", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "idris-slides-"));

    const project = await createProjectFromOutline({
      workspaceRoot,
      prompt: "Create slides with all remaining diagram types",
      outline: {
        title: "Remaining Diagrams",
        summary: "A deck of remaining diagram types.",
        slides: [
          {
            title: "Sequence",
            content: "A request flow.",
            goal: "Show sequence grammar.",
            layout: "Sequence diagram",
            visualDirection: "Use lifelines.",
            diagram: {
              type: "sequence",
              nodes: [
                { id: "client", label: "Client" },
                { id: "api", label: "API" }
              ],
              connections: [{ from: "client", to: "api", label: "CALL", kind: "call" }]
            }
          },
          {
            title: "State",
            content: "A state flow.",
            goal: "Show state grammar.",
            layout: "State diagram",
            visualDirection: "Use start and end dots.",
            diagram: {
              type: "state",
              nodes: [
                { id: "draft", label: "Draft" },
                { id: "sent", label: "Sent", role: "focal" }
              ],
              connections: [{ from: "draft", to: "sent", label: "SUBMIT", kind: "transition" }]
            }
          },
          {
            title: "Data Model",
            content: "A data model.",
            goal: "Show ER grammar.",
            layout: "ER diagram",
            visualDirection: "Use entity boxes.",
            diagram: {
              type: "er",
              nodes: [
                { id: "user", label: "User", items: ["# id", "email"] },
                { id: "deck", label: "Deck", items: ["# id", "-> user_id"] }
              ],
              connections: [
                { from: "user", to: "deck", label: "owns", kind: "relationship", cardinalityFrom: "1", cardinalityTo: "N" }
              ]
            }
          },
          {
            title: "Swimlane",
            content: "A handoff flow.",
            goal: "Show swimlane grammar.",
            layout: "Swimlane diagram",
            visualDirection: "Use lanes.",
            diagram: {
              type: "swimlane",
              nodes: [
                { id: "brief", label: "Brief", lane: "Strategy" },
                { id: "ship", label: "Ship", lane: "Design" }
              ],
              connections: [{ from: "brief", to: "ship", label: "HANDOFF", kind: "handoff" }]
            }
          },
          {
            title: "Nested",
            content: "Containment levels.",
            goal: "Show nested grammar.",
            layout: "Nested diagram",
            visualDirection: "Use rings.",
            diagram: {
              type: "nested",
              nodes: [
                { id: "workspace", label: "Workspace", level: 0 },
                { id: "project", label: "Project", level: 1, role: "focal" }
              ]
            }
          },
          {
            title: "Tree",
            content: "Hierarchy.",
            goal: "Show tree grammar.",
            layout: "Tree diagram",
            visualDirection: "Use elbow connectors.",
            diagram: {
              type: "tree",
              nodes: [
                { id: "root", label: "Root", level: 0 },
                { id: "child", label: "Child", level: 1 }
              ],
              connections: [{ from: "root", to: "child" }]
            }
          },
          {
            title: "Layers",
            content: "Stacked layers.",
            goal: "Show layer grammar.",
            layout: "Layer stack diagram",
            visualDirection: "Use bands.",
            diagram: {
              type: "layers",
              nodes: [
                { id: "app", label: "Application", sublabel: "L3" },
                { id: "data", label: "Data", sublabel: "L2", role: "focal" }
              ]
            }
          },
          {
            title: "Venn",
            content: "Set overlap.",
            goal: "Show Venn grammar.",
            layout: "Venn diagram",
            visualDirection: "Use overlapping circles.",
            diagram: {
              type: "venn",
              nodes: [
                { id: "fruit", label: "Fruit" },
                { id: "single", label: "One seed", role: "focal" }
              ],
              connections: [{ from: "fruit", to: "single", label: "Sweet spot" }]
            }
          },
          {
            title: "Consultant Matrix",
            content: "Scenario map.",
            goal: "Show consultant quadrant.",
            layout: "Consultant quadrant diagram",
            visualDirection: "Use named regions.",
            diagram: {
              type: "quadrant",
              variant: "consultant",
              nodes: [{ id: "base", label: "Base case", role: "focal" }]
            }
          }
        ] as any
      }
    });

    const slideFile = await readFile(join(project.deckPath, "slides", "remaining-diagrams", "index.tsx"), "utf8");

    expect(slideFile).toContain("function renderSequenceDiagram");
    expect(slideFile).toContain("strokeDasharray");
    expect(slideFile).toContain("function renderStateDiagram");
    expect(slideFile).toContain("function renderErDiagram");
    expect(slideFile).toContain("cardinalityFrom");
    expect(slideFile).toContain("function renderSwimlaneDiagram");
    expect(slideFile).toContain("function renderNestedDiagram");
    expect(slideFile).toContain("function renderTreeDiagram");
    expect(slideFile).toContain("function renderLayersDiagram");
    expect(slideFile).toContain("function renderVennDiagram");
    expect(slideFile).toContain('"variant": "consultant"');
  });

  it("renders quadrant items as dot labels instead of boxed nodes", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "idris-slides-"));

    const project = await createProjectFromOutline({
      workspaceRoot,
      prompt: "Create a quadrant diagram for impact and effort",
      outline: {
        title: "Impact Effort",
        summary: "A quadrant diagram.",
        slides: [
          {
            title: "Content Ideas",
            content: "Prioritize content ideas by impact and effort.",
            goal: "Show quadrant item placement.",
            layout: "Quadrant diagram",
            visualDirection: "Render quadrant items as dot labels.",
            diagram: {
              type: "quadrant",
              nodes: [
                { id: "schematic", label: "Schematic skill v4", role: "focal" },
                { id: "refresh", label: "Design v4 refresh", role: "backend" }
              ]
            }
          }
        ]
      }
    });

    const slideFile = await readFile(join(project.deckPath, "slides", "impact-effort", "index.tsx"), "utf8");

    expect(slideFile).toContain("function renderQuadrantItem");
    expect(slideFile).toContain('diagram.type === "quadrant"');
    expect(slideFile).toContain('diagram.type !== "pyramid" && diagram.type !== "quadrant"');
  });

  it("repairs generated deck runtime package paths without rewriting slides", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "idris-slides-"));

    const project = await createProjectFromOutline({
      workspaceRoot,
      prompt: "Create a 1 slide deck with hello in the middle",
      outline: {
        title: "Repair Slide",
        summary: "A single slide.",
        slides: [
          {
            title: "Hello",
            content: "Hello.",
            goal: "Show hello in the middle of the slide.",
            layout: "Title slide",
            visualDirection: "Use purple with the word hello centered."
          }
        ]
      }
    });

    const packagePath = join(project.deckPath, "package.json");
    const slidePath = join(project.deckPath, "slides", "repair-slide", "index.tsx");
    const slideFileBefore = await readFile(slidePath, "utf8");
    await import("node:fs/promises").then(({ writeFile }) =>
      writeFile(
        packagePath,
        JSON.stringify({
          name: "repair-slide",
          type: "module",
          dependencies: {
            "@idris-slides/core": "file:/missing/apps/packages/core"
          }
        }),
        "utf8"
      )
    );

    await repairDeckRuntimeWorkspace(project);

    const packageJson = await readFile(packagePath, "utf8");
    const dependencies = JSON.parse(packageJson).dependencies as Record<string, string>;
    expect(fileURLToPath(requireDependency(dependencies, "@idris-slides/core"))).toBe(
      resolveWorkspacePackagePath("core")
    );
    expect(await readFile(slidePath, "utf8")).toBe(slideFileBefore);
  });

  it("installs deck dependencies through npm install", async () => {
    const { calls, runner } = createRecordingRunner();

    await installDeckDependencies({ deckPath: "/tmp/project/deck", runner });

    expect(calls).toEqual([
      {
        command: "npm",
        args: ["install"],
        options: { cwd: "/tmp/project/deck" }
      }
    ]);
  });

  it("starts Vite preview on a chosen localhost port", async () => {
    const { calls, runner } = createRecordingRunner();

    await startDeckPreview({
      deckPath: "/tmp/project/deck",
      port: 5317,
      runner
    });

    expect(calls).toEqual([
      {
        command: "npm",
        args: ["run", "dev", "--", "--port", "5317", "--host", "127.0.0.1"],
        options: { cwd: "/tmp/project/deck" }
      }
    ]);
  });

  it("exports a deck to static HTML through Vite build", async () => {
    const { calls, runner } = createRecordingRunner();

    await exportDeckToHtml({
      deckPath: "/tmp/project/deck",
      outputPath: "/tmp/out/site",
      runner
    });

    expect(calls).toEqual([
      {
        command: "npm",
        args: ["run", "build", "--", "--out-dir", "/tmp/out/site"],
        options: { cwd: "/tmp/project/deck" }
      }
    ]);
  });
});
