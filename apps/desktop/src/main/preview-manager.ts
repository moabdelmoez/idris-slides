import { spawn, type ChildProcess } from "node:child_process";
import { stat } from "node:fs/promises";
import { createServer } from "node:net";
import { join } from "node:path";
import type { ProjectMetadata } from "@idris-slides/project";
import { installDeckDependencies, repairDeckRuntimeWorkspace } from "@idris-slides/project";
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
  if (await pathExists(join(deckPath, "node_modules", "@idris-slides", "core", "package.json"))) {
    console.log(`[IDRIS-DEBUG preview-deps] dependencies already installed cwd=${deckPath}`);
    return;
  }

  console.log(`[IDRIS-DEBUG preview-deps] installing deck dependencies cwd=${deckPath}`);
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
      throw new Error("Deck preview exited before it became ready.");
    }

    try {
      const response = await fetch(url);
      if (response.status < 500) {
        console.log(`[IDRIS-DEBUG preview-ready] url=${url} status=${response.status}`);
        return;
      }
      console.warn(`[IDRIS-DEBUG preview-wait] url=${url} status=${response.status}`);
    } catch {
      console.log(`[IDRIS-DEBUG preview-wait] url=${url} server not ready yet`);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error("Timed out waiting for deck preview to start.");
}

function slideModulePath(project: ProjectMetadata): string {
  const slideDirName = project.slideDirName ?? project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `/slides/${encodeURIComponent(slideDirName)}/index.tsx`;
}

export async function startProjectPreview(project: ProjectMetadata): Promise<PreviewSessionInfo> {
  const existing = previews.get(project.id);
  if (existing && existing.process.exitCode === null) {
    console.log(`[IDRIS-DEBUG preview-reuse] project=${project.id} url=${existing.url}`);
    return { projectId: project.id, url: existing.url, slideModuleUrl: `${existing.url}${slideModulePath(project)}` };
  }

  await repairDeckRuntimeWorkspace(project);
  await ensureDeckDependencies(project.deckPath);

  const port = await findOpenPort();
  const url = `http://127.0.0.1:${port}`;
  const slideModuleUrl = `${url}${slideModulePath(project)}`;
  console.log(
    `[IDRIS-DEBUG preview-start] project=${project.id} cwd=${project.deckPath} url=${url} slideModuleUrl=${slideModuleUrl}`
  );
  const process = spawn(
    "npm",
    ["run", "dev", "--", "--port", String(port), "--host", "127.0.0.1"],
    {
      cwd: project.deckPath,
      stdio: ["ignore", "pipe", "pipe"]
    }
  );

  process.stdout?.on("data", (chunk: Buffer) => {
    console.log(`[IDRIS-DEBUG preview-stdout] ${chunk.toString().trimEnd()}`);
  });

  process.stderr?.on("data", (chunk: Buffer) => {
    console.error(`[IDRIS-DEBUG preview-stderr] ${chunk.toString().trimEnd()}`);
  });

  process.on("error", (error) => {
    console.error(`[IDRIS-DEBUG preview-process-error] ${error.message}`);
  });

  process.on("exit", (code, signal) => {
    console.log(`[IDRIS-DEBUG preview-exit] project=${project.id} code=${code} signal=${signal}`);
    const current = previews.get(project.id);
    if (current?.process === process) {
      previews.delete(project.id);
    }
  });

  previews.set(project.id, { process, url });

  try {
    await waitForServer(url, process);
  } catch (error) {
    console.error(
      `[IDRIS-DEBUG preview-start-failed] ${
        error instanceof Error ? error.stack ?? error.message : String(error)
      }`
    );
    process.kill();
    previews.delete(project.id);
    throw error;
  }

  return { projectId: project.id, url, slideModuleUrl };
}

export function stopAllPreviews(): void {
  for (const preview of previews.values()) {
    preview.process.kill();
  }
  previews.clear();
}
