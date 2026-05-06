import { describe, expect, it } from "vitest";
import { exportDeckToHtml, exportDeckToPdf } from "./openSlide";
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
  it("exports a deck to PDF through npm exec", async () => {
    const { calls, runner } = createRecordingRunner();

    await exportDeckToPdf({
      deckPath: "/tmp/project/deck",
      outputPath: "/tmp/out/deck.pdf",
      runner
    });

    expect(calls).toEqual([
      {
        command: "npm",
        args: ["exec", "--", "open-slide", "export", "pdf", "--out", "/tmp/out/deck.pdf"],
        options: { cwd: "/tmp/project/deck" }
      }
    ]);
  });

  it("exports a deck to HTML through npm exec", async () => {
    const { calls, runner } = createRecordingRunner();

    await exportDeckToHtml({
      deckPath: "/tmp/project/deck",
      outputPath: "/tmp/out/site",
      runner
    });

    expect(calls).toEqual([
      {
        command: "npm",
        args: ["exec", "--", "open-slide", "export", "html", "--out", "/tmp/out/site"],
        options: { cwd: "/tmp/project/deck" }
      }
    ]);
  });
});
