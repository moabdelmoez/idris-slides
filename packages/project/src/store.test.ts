import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createProject, readProject } from "./store";

describe("project store", () => {
  it("creates project metadata and deck folders", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "idris-slides-"));

    const project = await createProject({ name: "Quarterly Update", workspaceRoot });

    expect(project.name).toBe("Quarterly Update");
    expect(project.deckPath.endsWith("/deck")).toBe(true);

    const saved = await readProject(join(workspaceRoot, project.id));
    expect(saved).toEqual(project);
  });

  it("writes readable JSON metadata", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "idris-slides-"));

    const project = await createProject({ name: "Brand Plan", workspaceRoot });
    const raw = await readFile(join(workspaceRoot, project.id, "project.json"), "utf8");

    expect(JSON.parse(raw).id).toBe(project.id);
  });
});
