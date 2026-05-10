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
            goal: "Frame the growth opportunity.",
            layout: "Title slide",
            visualDirection: "Use purple with coral emphasis."
          },
          {
            title: "Operating Model",
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
