import type { CommandRunner } from "./types";

type ExportDeckInput = {
  deckPath: string;
  outPath: string;
  runner: CommandRunner;
};

async function exportDeck(input: ExportDeckInput, kind: "pdf" | "html"): Promise<void> {
  await input.runner.run(
    "npm",
    ["exec", "--", "open-slide", "export", kind, "--out", input.outPath],
    { cwd: input.deckPath }
  );
}

export async function exportDeckToPdf(input: ExportDeckInput): Promise<void> {
  await exportDeck(input, "pdf");
}

export async function exportDeckToHtml(input: ExportDeckInput): Promise<void> {
  await exportDeck(input, "html");
}
