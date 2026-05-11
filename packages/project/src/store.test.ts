import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createProject, listProjects, readProject, updateProject } from "./store";

describe("project store", () => {
  it("creates project metadata and deck folders", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "idris-slides-"));

    const project = await createProject({ name: "Quarterly Update", workspaceRoot });

    expect(project.name).toBe("Quarterly Update");
    expect(project.deckPath.endsWith("/deck")).toBe(true);
    expect((await stat(project.deckPath)).isDirectory()).toBe(true);

    const saved = await readProject(join(workspaceRoot, project.id));
    expect(saved).toEqual(project);
  });

  it("writes readable JSON metadata", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "idris-slides-"));

    const project = await createProject({ name: "Brand Plan", workspaceRoot });
    const raw = await readFile(join(workspaceRoot, project.id, "project.json"), "utf8");

    expect(JSON.parse(raw).id).toBe(project.id);
  });

  it("lists valid projects by most recently updated and ignores invalid folders", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "idris-slides-"));

    const older = await createProject({ name: "Older Deck", workspaceRoot });
    const newer = await createProject({ name: "Newer Deck", workspaceRoot });
    await updateProject(join(workspaceRoot, older.id), (project) => ({
      ...project,
      updatedAt: "2026-05-06T00:00:00.000Z"
    }));
    await updateProject(join(workspaceRoot, newer.id), (project) => ({
      ...project,
      updatedAt: "2026-05-07T00:00:00.000Z"
    }));
    await mkdir(join(workspaceRoot, "not-a-project"), { recursive: true });
    await writeFile(join(workspaceRoot, "not-a-project", "project.json"), "{bad json", "utf8");

    const projects = await listProjects(workspaceRoot);

    expect(projects.map((project) => project.name)).toEqual(["Newer Deck", "Older Deck"]);
  });
});
