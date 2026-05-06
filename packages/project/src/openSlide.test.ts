import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createProjectFromOutline,
  exportDeckToHtml,
  installDeckDependencies,
  startDeckPreview
} from "./openSlide";
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

describe("open-slide command orchestration", () => {
  it("creates a branded open-slide workspace from an approved outline", async () => {
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
    const config = await readFile(join(project.deckPath, "open-slide.config.ts"), "utf8");
    const slideFile = await readFile(
      join(project.deckPath, "slides", "market-expansion", "index.tsx"),
      "utf8"
    );

    expect((await stat(join(project.deckPath, "slides", "market-expansion"))).isDirectory()).toBe(
      true
    );
    expect(JSON.parse(packageJson).dependencies["@open-slide/core"]).toBe("^1.0.6");
    expect(config).toContain("OpenSlideConfig");
    expect(slideFile).toContain("export const design");
    expect(slideFile).toContain("#4f008c");
    expect(slideFile).toContain("STCForward");
    expect(slideFile).toContain("Market Expansion");
    expect(slideFile).toContain("satisfies Page[]");
    expect(project.sourcePrompt).toBe("Create a deck about market expansion");
    expect(project.slideCount).toBe(2);
    expect(project.slideDirName).toBe("market-expansion");
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

  it("starts open-slide preview on a chosen localhost port", async () => {
    const { calls, runner } = createRecordingRunner();

    await startDeckPreview({
      deckPath: "/tmp/project/deck",
      port: 5317,
      runner
    });

    expect(calls).toEqual([
      {
        command: "npm",
        args: ["run", "dev", "--", "--port", "5317", "--host", "127.0.0.1", "--no-skills-check"],
        options: { cwd: "/tmp/project/deck" }
      }
    ]);
  });

  it("exports a deck to static HTML through open-slide build", async () => {
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
