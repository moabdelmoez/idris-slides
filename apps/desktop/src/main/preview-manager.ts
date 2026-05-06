import { spawn, type ChildProcess } from "node:child_process";
import { stat } from "node:fs/promises";
import { createServer } from "node:net";
import { join } from "node:path";
import type { ProjectMetadata } from "@idris-slides/project";
import { installDeckDependencies } from "@idris-slides/project";
import type { PreviewSessionInfo } from "../shared/types";
import { commandRunner } from "./command-runner";

type RunningPreview = {
  process: ChildProcess;
  url: string;
};

const previews = new Map<string, RunningPreview>();

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function ensureDeckDependencies(deckPath: string): Promise<void> {
  if (await pathExists(join(deckPath, "node_modules", "@open-slide", "core", "package.json"))) {
    return;
  }

  await installDeckDependencies({ deckPath, runner: commandRunner });
}

async function findOpenPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Unable to allocate a preview port.")));
        return;
      }

      const { port } = address;
      server.close(() => resolve(port));
    });
  });
}

async function waitForServer(url: string, process: ChildProcess): Promise<void> {
  const deadline = Date.now() + 45_000;

  while (Date.now() < deadline) {
    if (process.exitCode !== null) {
      throw new Error("open-slide preview exited before it became ready.");
    }

    try {
      const response = await fetch(url);
      if (response.status < 500) {
        return;
      }
    } catch {
      // Vite is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error("Timed out waiting for open-slide preview to start.");
}

export async function startProjectPreview(project: ProjectMetadata): Promise<PreviewSessionInfo> {
  const existing = previews.get(project.id);
  if (existing && existing.process.exitCode === null) {
    return { projectId: project.id, url: existing.url };
  }

  await ensureDeckDependencies(project.deckPath);

  const port = await findOpenPort();
  const url = `http://127.0.0.1:${port}`;
  const process = spawn(
    "npm",
    ["run", "dev", "--", "--port", String(port), "--host", "127.0.0.1", "--no-skills-check"],
    {
      cwd: project.deckPath,
      stdio: ["ignore", "pipe", "pipe"]
    }
  );

  process.on("exit", () => {
    const current = previews.get(project.id);
    if (current?.process === process) {
      previews.delete(project.id);
    }
  });

  previews.set(project.id, { process, url });

  try {
    await waitForServer(url, process);
  } catch (error) {
    process.kill();
    previews.delete(project.id);
    throw error;
  }

  return { projectId: project.id, url };
}

export function stopAllPreviews(): void {
  for (const preview of previews.values()) {
    preview.process.kill();
  }
  previews.clear();
}
