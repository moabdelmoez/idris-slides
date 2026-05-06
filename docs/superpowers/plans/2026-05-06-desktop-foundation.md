# Desktop Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working slice of the Idris Slides desktop app: Electron shell, Solutions brand package, local project metadata, and open-slide preview/export orchestration.

**Architecture:** Use a pnpm monorepo with focused packages for desktop UI, brand tokens, and project orchestration. Electron owns file system, child process, and IPC boundaries; React renders the workspace UI; `@open-slide/core` remains the slide runtime for generated decks.

**Tech Stack:** pnpm workspaces, TypeScript, Electron, React, Vite, Vitest, Testing Library, `@open-slide/core`, `lucide-react`.

---

## Scope

This plan implements the foundation slice only. It intentionally excludes Gemini outline generation, AI chat editing, repair loops, and packaging builds. Those become separate implementation plans after this foundation works.

This slice produces working, testable software:

- The app opens as a desktop UI.
- Users can see a project sidebar, static preview pane, and disabled chat panel.
- The app can create a local project metadata folder.
- Brand tokens and fonts are available to generated decks.
- Project services can start preview/export commands through testable orchestration interfaces.

## File Structure

- `package.json`: root scripts and workspace metadata.
- `pnpm-workspace.yaml`: workspace package discovery.
- `tsconfig.base.json`: shared TypeScript settings.
- `vitest.config.ts`: root test discovery.
- `.gitignore`: Node, Electron, build, and local app data ignores.
- `apps/desktop/package.json`: desktop app dependencies and scripts.
- `apps/desktop/index.html`: renderer entry HTML.
- `apps/desktop/electron.vite.config.ts`: Electron main, preload, and renderer build config.
- `apps/desktop/tsconfig.json`: desktop TS config.
- `apps/desktop/src/main/main.ts`: Electron main process entry.
- `apps/desktop/src/main/ipc.ts`: IPC channel registration.
- `apps/desktop/src/main/project-handlers.ts`: project IPC handlers.
- `apps/desktop/src/preload/preload.ts`: safe renderer API bridge.
- `apps/desktop/src/renderer/App.tsx`: main workspace UI.
- `apps/desktop/src/renderer/components/*.tsx`: focused UI components.
- `apps/desktop/src/renderer/styles.css`: app theme and layout.
- `apps/desktop/src/renderer/vite-env.d.ts`: renderer type declarations.
- `packages/brand/package.json`: brand package metadata.
- `packages/brand/src/index.ts`: public brand exports.
- `packages/brand/src/tokens.ts`: color, font, and layout tokens.
- `packages/brand/src/validate.ts`: brand validation helpers.
- `packages/brand/src/components.tsx`: reusable slide primitives.
- `packages/brand/src/fonts/*.ttf`: copied Solutions font assets.
- `packages/project/package.json`: project package metadata.
- `packages/project/src/index.ts`: public project exports.
- `packages/project/src/types.ts`: project domain types.
- `packages/project/src/paths.ts`: app data and project path helpers.
- `packages/project/src/store.ts`: metadata read/write service.
- `packages/project/src/openSlide.ts`: preview/export command orchestration.
- `packages/*/src/*.test.ts`: package unit tests.

## Task 1: Root Workspace And Tooling

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Modify: `README.md`

- [ ] **Step 1: Write root package metadata**

Create `package.json`:

```json
{
  "name": "idris-slides",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "packageManager": "pnpm@10.17.0",
  "scripts": {
    "dev": "pnpm --filter @idris-slides/desktop dev",
    "build": "pnpm -r build",
    "typecheck": "pnpm -r typecheck",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "typescript": "^5.9.3",
    "vitest": "^3.2.0"
  }
}
```

- [ ] **Step 2: Add workspace discovery**

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 3: Add shared TypeScript config**

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "jsx": "react-jsx",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "noUncheckedIndexedAccess": true
  }
}
```

- [ ] **Step 4: Add Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts", "apps/**/*.test.tsx"]
  }
});
```

- [ ] **Step 5: Add ignores**

Create `.gitignore`:

```gitignore
node_modules/
dist/
dist-electron/
.vite/
coverage/
.DS_Store
*.log
local-projects/
```

- [ ] **Step 6: Expand README**

Replace `README.md` with:

```md
# idris-slides

Desktop app for creating Solutions-branded `open-slide` decks with AI-assisted authoring.

## Development

```bash
pnpm install
pnpm dev
pnpm test
pnpm typecheck
```
```

- [ ] **Step 7: Install dependencies**

Run:

```bash
pnpm install
```

Expected: `pnpm-lock.yaml` is created and install exits with code 0.

- [ ] **Step 8: Verify empty test command works**

Run:

```bash
pnpm test -- --passWithNoTests
```

Expected: Vitest exits successfully with no test failures.

- [ ] **Step 9: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json vitest.config.ts .gitignore README.md pnpm-lock.yaml
git commit -m "chore: set up workspace tooling"
```

## Task 2: Solutions Brand Package

**Files:**
- Create: `packages/brand/package.json`
- Create: `packages/brand/tsconfig.json`
- Create: `packages/brand/src/tokens.ts`
- Create: `packages/brand/src/validate.ts`
- Create: `packages/brand/src/components.tsx`
- Create: `packages/brand/src/index.ts`
- Copy: `packages/brand/src/fonts/STCForward-Regular.ttf`
- Copy: `packages/brand/src/fonts/STCForward-Bold.ttf`
- Copy: `packages/brand/src/fonts/STCForward-ExtraBold.ttf`
- Test: `packages/brand/src/validate.test.ts`

- [ ] **Step 1: Add brand package metadata**

Create `packages/brand/package.json`:

```json
{
  "name": "@idris-slides/brand",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "build": "tsc --noEmit",
    "typecheck": "tsc --noEmit",
    "test": "vitest run src"
  },
  "dependencies": {
    "react": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.12"
  }
}
```

- [ ] **Step 2: Add package TypeScript config**

Create `packages/brand/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Define brand tokens**

Create `packages/brand/src/tokens.ts`:

```ts
export const solutionsColors = {
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

export type SolutionsColorName = keyof typeof solutionsColors;

export const solutionsFonts = {
  body: "STCForward",
  heading: "STCForward"
} as const;

export const slideCanvas = {
  width: 1920,
  height: 1080,
  aspectRatio: "16 / 9"
} as const;

export const solutionsTheme = {
  colors: solutionsColors,
  fonts: solutionsFonts,
  canvas: slideCanvas
} as const;
```

- [ ] **Step 4: Write failing brand validation tests**

Create `packages/brand/src/validate.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { findForbiddenHexColors, isApprovedHexColor } from "./validate";

describe("brand color validation", () => {
  it("accepts approved Solutions palette colors", () => {
    expect(isApprovedHexColor("#ff6a39")).toBe(true);
    expect(isApprovedHexColor("#4F008C")).toBe(true);
  });

  it("rejects colors outside the Solutions palette", () => {
    expect(isApprovedHexColor("#123456")).toBe(false);
  });

  it("finds forbidden hex colors in generated source", () => {
    const source = "const style = { color: '#123456', background: '#ff6a39' };";
    expect(findForbiddenHexColors(source)).toEqual(["#123456"]);
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run:

```bash
pnpm test packages/brand/src/validate.test.ts
```

Expected: FAIL because `./validate` does not exist.

- [ ] **Step 6: Implement brand validation**

Create `packages/brand/src/validate.ts`:

```ts
import { solutionsColors } from "./tokens";

const approvedColors = new Set(
  Object.values(solutionsColors).map((color) => color.toLowerCase())
);

const hexColorPattern = /#[0-9a-fA-F]{6}\b/g;

export function isApprovedHexColor(color: string): boolean {
  return approvedColors.has(color.toLowerCase());
}

export function findForbiddenHexColors(source: string): string[] {
  const matches = source.match(hexColorPattern) ?? [];
  const forbidden = matches.filter((color) => !isApprovedHexColor(color));
  return Array.from(new Set(forbidden));
}
```

- [ ] **Step 7: Add slide primitives**

Create `packages/brand/src/components.tsx`:

```tsx
import type { CSSProperties, ReactNode } from "react";
import { solutionsTheme } from "./tokens";

type SlideProps = {
  children: ReactNode;
  background?: keyof typeof solutionsTheme.colors;
  foreground?: keyof typeof solutionsTheme.colors;
};

const baseSlideStyle: CSSProperties = {
  width: solutionsTheme.canvas.width,
  height: solutionsTheme.canvas.height,
  fontFamily: solutionsTheme.fonts.body,
  boxSizing: "border-box"
};

export function SolutionsSlide({
  children,
  background = "air",
  foreground = "onyx"
}: SlideProps) {
  return (
    <section
      style={{
        ...baseSlideStyle,
        background: solutionsTheme.colors[background],
        color: solutionsTheme.colors[foreground],
        padding: 96,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 40
      }}
    >
      {children}
    </section>
  );
}

export function TitleSlide({
  title,
  subtitle
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <SolutionsSlide background="purple" foreground="air">
      <h1 style={{ fontSize: 112, lineHeight: 1, margin: 0 }}>{title}</h1>
      {subtitle ? <p style={{ fontSize: 38, margin: 0 }}>{subtitle}</p> : null}
    </SolutionsSlide>
  );
}

export function TwoColumnSlide({
  title,
  left,
  right
}: {
  title: string;
  left: ReactNode;
  right: ReactNode;
}) {
  return (
    <SolutionsSlide>
      <h2 style={{ fontSize: 72, margin: 0 }}>{title}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64 }}>
        <div>{left}</div>
        <div>{right}</div>
      </div>
    </SolutionsSlide>
  );
}
```

- [ ] **Step 8: Export public API**

Create `packages/brand/src/index.ts`:

```ts
export * from "./components";
export * from "./tokens";
export * from "./validate";
```

- [ ] **Step 9: Copy font assets**

Run:

```bash
mkdir -p packages/brand/src/fonts
cp "/Users/mostafa/Downloads/Solutions/Solutions branding/Solutions Fonts/STCForward-Regular.ttf" packages/brand/src/fonts/STCForward-Regular.ttf
cp "/Users/mostafa/Downloads/Solutions/Solutions branding/Solutions Fonts/STCForward-Bold.ttf" packages/brand/src/fonts/STCForward-Bold.ttf
cp "/Users/mostafa/Downloads/Solutions/Solutions branding/Solutions Fonts/STCForward-ExtraBold.ttf" packages/brand/src/fonts/STCForward-ExtraBold.ttf
```

Expected: the three `.ttf` files exist in `packages/brand/src/fonts/`.

- [ ] **Step 10: Run package tests**

Run:

```bash
pnpm test packages/brand/src/validate.test.ts
pnpm --filter @idris-slides/brand typecheck
```

Expected: both commands pass.

- [ ] **Step 11: Commit**

```bash
git add packages/brand package.json pnpm-lock.yaml
git commit -m "feat: add Solutions brand package"
```

## Task 3: Local Project Package

**Files:**
- Create: `packages/project/package.json`
- Create: `packages/project/tsconfig.json`
- Create: `packages/project/src/types.ts`
- Create: `packages/project/src/paths.ts`
- Create: `packages/project/src/store.ts`
- Create: `packages/project/src/index.ts`
- Test: `packages/project/src/store.test.ts`

- [ ] **Step 1: Add project package metadata**

Create `packages/project/package.json`:

```json
{
  "name": "@idris-slides/project",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "build": "tsc --noEmit",
    "typecheck": "tsc --noEmit",
    "test": "vitest run src"
  },
  "dependencies": {
    "nanoid": "^5.0.9"
  },
  "devDependencies": {
    "@types/node": "^22.19.17"
  }
}
```

- [ ] **Step 2: Add package TypeScript config**

Create `packages/project/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true,
    "types": ["node", "vitest"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Define project types**

Create `packages/project/src/types.ts`:

```ts
export type ProjectId = string;

export type ProjectMetadata = {
  id: ProjectId;
  name: string;
  createdAt: string;
  updatedAt: string;
  deckPath: string;
  exports: ProjectExport[];
};

export type ProjectExport = {
  id: string;
  kind: "pdf" | "html";
  path: string;
  createdAt: string;
};

export type CreateProjectInput = {
  name: string;
  workspaceRoot: string;
};
```

- [ ] **Step 4: Write failing store tests**

Create `packages/project/src/store.test.ts`:

```ts
import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
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
```

- [ ] **Step 5: Run test to verify it fails**

Run:

```bash
pnpm test packages/project/src/store.test.ts
```

Expected: FAIL because `./store` does not exist.

- [ ] **Step 6: Add path helpers**

Create `packages/project/src/paths.ts`:

```ts
import { join } from "node:path";

export function projectRoot(workspaceRoot: string, projectId: string): string {
  return join(workspaceRoot, projectId);
}

export function projectMetadataPath(root: string): string {
  return join(root, "project.json");
}

export function projectDeckPath(root: string): string {
  return join(root, "deck");
}

export function projectAssetsPath(root: string): string {
  return join(root, "assets");
}
```

- [ ] **Step 7: Implement project store**

Create `packages/project/src/store.ts`:

```ts
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { nanoid } from "nanoid";
import {
  projectAssetsPath,
  projectDeckPath,
  projectMetadataPath,
  projectRoot
} from "./paths";
import type { CreateProjectInput, ProjectMetadata } from "./types";

function nowIso(): string {
  return new Date().toISOString();
}

async function writeJsonAtomic(path: string, value: unknown): Promise<void> {
  const tmpPath = `${path}.tmp`;
  await writeFile(tmpPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tmpPath, path);
}

export async function createProject(input: CreateProjectInput): Promise<ProjectMetadata> {
  const id = nanoid(10);
  const root = projectRoot(input.workspaceRoot, id);
  const deckPath = projectDeckPath(root);
  const createdAt = nowIso();

  await mkdir(deckPath, { recursive: true });
  await mkdir(projectAssetsPath(root), { recursive: true });

  const project: ProjectMetadata = {
    id,
    name: input.name,
    createdAt,
    updatedAt: createdAt,
    deckPath,
    exports: []
  };

  await writeJsonAtomic(projectMetadataPath(root), project);
  return project;
}

export async function readProject(root: string): Promise<ProjectMetadata> {
  const raw = await readFile(projectMetadataPath(root), "utf8");
  return JSON.parse(raw) as ProjectMetadata;
}

export async function updateProject(
  root: string,
  updater: (project: ProjectMetadata) => ProjectMetadata
): Promise<ProjectMetadata> {
  const current = await readProject(root);
  const next = updater({ ...current, updatedAt: nowIso() });
  await writeJsonAtomic(join(root, "project.json"), next);
  return next;
}
```

- [ ] **Step 8: Export public API**

Create `packages/project/src/index.ts`:

```ts
export * from "./paths";
export * from "./store";
export * from "./types";
```

- [ ] **Step 9: Run package tests**

Run:

```bash
pnpm test packages/project/src/store.test.ts
pnpm --filter @idris-slides/project typecheck
```

Expected: both commands pass.

- [ ] **Step 10: Commit**

```bash
git add packages/project package.json pnpm-lock.yaml
git commit -m "feat: add local project store"
```

## Task 4: open-slide Command Orchestration

**Files:**
- Modify: `packages/project/src/types.ts`
- Create: `packages/project/src/openSlide.ts`
- Test: `packages/project/src/openSlide.test.ts`
- Modify: `packages/project/src/index.ts`

- [ ] **Step 1: Extend command types**

Append to `packages/project/src/types.ts`:

```ts
export type CommandRunner = {
  run(command: string, args: string[], options: { cwd: string }): Promise<void>;
};

export type PreviewSession = {
  projectId: ProjectId;
  url: string;
  stop(): Promise<void>;
};
```

- [ ] **Step 2: Write failing orchestration tests**

Create `packages/project/src/openSlide.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { exportDeckToHtml, exportDeckToPdf } from "./openSlide";
import type { CommandRunner } from "./types";

function createRunner(): CommandRunner & { calls: Array<{ command: string; args: string[]; cwd: string }> } {
  const calls: Array<{ command: string; args: string[]; cwd: string }> = [];
  return {
    calls,
    async run(command, args, options) {
      calls.push({ command, args, cwd: options.cwd });
    }
  };
}

describe("open-slide orchestration", () => {
  it("exports PDF from the deck working directory", async () => {
    const runner = createRunner();

    await exportDeckToPdf({ deckPath: "/tmp/project/deck", outputPath: "/tmp/out/deck.pdf", runner });

    expect(runner.calls).toEqual([
      {
        command: "pnpm",
        args: ["open-slide", "export", "pdf", "--out", "/tmp/out/deck.pdf"],
        cwd: "/tmp/project/deck"
      }
    ]);
  });

  it("exports HTML from the deck working directory", async () => {
    const runner = createRunner();

    await exportDeckToHtml({ deckPath: "/tmp/project/deck", outputPath: "/tmp/out/site", runner });

    expect(runner.calls).toEqual([
      {
        command: "pnpm",
        args: ["open-slide", "export", "html", "--out", "/tmp/out/site"],
        cwd: "/tmp/project/deck"
      }
    ]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run:

```bash
pnpm test packages/project/src/openSlide.test.ts
```

Expected: FAIL because `./openSlide` does not exist.

- [ ] **Step 4: Implement open-slide orchestration**

Create `packages/project/src/openSlide.ts`:

```ts
import type { CommandRunner } from "./types";

type ExportInput = {
  deckPath: string;
  outputPath: string;
  runner: CommandRunner;
};

export async function exportDeckToPdf(input: ExportInput): Promise<void> {
  await input.runner.run(
    "pnpm",
    ["open-slide", "export", "pdf", "--out", input.outputPath],
    { cwd: input.deckPath }
  );
}

export async function exportDeckToHtml(input: ExportInput): Promise<void> {
  await input.runner.run(
    "pnpm",
    ["open-slide", "export", "html", "--out", input.outputPath],
    { cwd: input.deckPath }
  );
}
```

- [ ] **Step 5: Export orchestration API**

Append to `packages/project/src/index.ts`:

```ts
export * from "./openSlide";
```

- [ ] **Step 6: Run package tests**

Run:

```bash
pnpm test packages/project/src/openSlide.test.ts packages/project/src/store.test.ts
pnpm --filter @idris-slides/project typecheck
```

Expected: both commands pass.

- [ ] **Step 7: Commit**

```bash
git add packages/project
git commit -m "feat: add open-slide command orchestration"
```

## Task 5: Electron Desktop Shell

**Files:**
- Create: `apps/desktop/package.json`
- Create: `apps/desktop/tsconfig.json`
- Create: `apps/desktop/index.html`
- Create: `apps/desktop/electron.vite.config.ts`
- Create: `apps/desktop/src/main/main.ts`
- Create: `apps/desktop/src/main/ipc.ts`
- Create: `apps/desktop/src/main/project-handlers.ts`
- Create: `apps/desktop/src/preload/preload.ts`
- Create: `apps/desktop/src/renderer/vite-env.d.ts`
- Create: `apps/desktop/src/renderer/main.tsx`
- Create: `apps/desktop/src/renderer/App.tsx`
- Create: `apps/desktop/src/renderer/components/ProjectSidebar.tsx`
- Create: `apps/desktop/src/renderer/components/PreviewPane.tsx`
- Create: `apps/desktop/src/renderer/components/ChatPanel.tsx`
- Create: `apps/desktop/src/renderer/styles.css`
- Test: `apps/desktop/src/renderer/App.test.tsx`

- [ ] **Step 1: Add desktop package metadata**

Create `apps/desktop/package.json`:

```json
{
  "name": "@idris-slides/desktop",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "out/main/main.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build && tsc -p tsconfig.json --noEmit",
    "typecheck": "tsc --noEmit",
    "test": "vitest run src"
  },
  "dependencies": {
    "@idris-slides/brand": "workspace:*",
    "@idris-slides/project": "workspace:*",
    "lucide-react": "^0.468.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@types/node": "^22.19.17",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^5.0.0",
    "electron": "^39.0.0",
    "electron-vite": "^4.0.0",
    "jsdom": "^25.0.1",
    "typescript": "^5.9.3",
    "vite": "^7.0.0",
    "vitest": "^3.2.0"
  }
}
```

- [ ] **Step 2: Add desktop TypeScript config**

Create `apps/desktop/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["node", "vitest", "@testing-library/jest-dom"],
    "outDir": "dist"
  },
  "include": ["src", "electron.vite.config.ts"]
}
```

- [ ] **Step 3: Add renderer HTML and Electron Vite config**

Create `apps/desktop/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Idris Slides</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/renderer/main.tsx"></script>
  </body>
</html>
```

Create `apps/desktop/electron.vite.config.ts`:

```ts
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";

const currentDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: resolve(currentDir, "src/main/main.ts")
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: resolve(currentDir, "src/preload/preload.ts")
      }
    }
  },
  renderer: {
    plugins: [react()],
    build: {
      rollupOptions: {
        input: resolve(currentDir, "index.html")
      }
    }
  }
});
```

- [ ] **Step 4: Add Electron main process**

Create `apps/desktop/src/main/main.ts`:

```ts
import { app, BrowserWindow } from "electron";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { registerIpcHandlers } from "./ipc";

const currentDir = dirname(fileURLToPath(import.meta.url));

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1120,
    minHeight: 720,
    webPreferences: {
      preload: join(currentDir, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void window.loadFile(join(currentDir, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
```

- [ ] **Step 5: Add IPC handlers**

Create `apps/desktop/src/main/project-handlers.ts`:

```ts
import { app } from "electron";
import { join } from "node:path";
import { createProject } from "@idris-slides/project";

export async function createLocalProject(name: string) {
  const workspaceRoot = join(app.getPath("userData"), "projects");
  return createProject({ name, workspaceRoot });
}
```

Create `apps/desktop/src/main/ipc.ts`:

```ts
import { ipcMain } from "electron";
import { createLocalProject } from "./project-handlers";

export function registerIpcHandlers(): void {
  ipcMain.handle("projects:create", async (_event, name: string) => {
    return createLocalProject(name);
  });
}
```

- [ ] **Step 6: Add preload bridge**

Create `apps/desktop/src/preload/preload.ts`:

```ts
import { contextBridge, ipcRenderer } from "electron";
import type { ProjectMetadata } from "@idris-slides/project";

export type IdrisSlidesApi = {
  createProject(name: string): Promise<ProjectMetadata>;
};

const api: IdrisSlidesApi = {
  createProject(name) {
    return ipcRenderer.invoke("projects:create", name) as Promise<ProjectMetadata>;
  }
};

contextBridge.exposeInMainWorld("idrisSlides", api);
```

- [ ] **Step 7: Add renderer type declarations**

Create `apps/desktop/src/renderer/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />

import type { IdrisSlidesApi } from "../preload/preload";

declare global {
  interface Window {
    idrisSlides?: IdrisSlidesApi;
  }
}
```

- [ ] **Step 8: Write failing UI smoke test**

Create `apps/desktop/src/renderer/App.test.tsx`:

```tsx
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the desktop workspace shell", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Idris Slides" })).toBeInTheDocument();
    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.getByText("Live Preview")).toBeInTheDocument();
    expect(screen.getByText("AI Chat")).toBeInTheDocument();
  });
});
```

- [ ] **Step 9: Run test to verify it fails**

Run:

```bash
pnpm test apps/desktop/src/renderer/App.test.tsx
```

Expected: FAIL because `./App` does not exist.

- [ ] **Step 10: Add renderer components**

Create `apps/desktop/src/renderer/components/ProjectSidebar.tsx`:

```tsx
import { Plus } from "lucide-react";

export function ProjectSidebar() {
  return (
    <aside className="sidebar" aria-label="Projects">
      <div className="sidebarHeader">
        <h2>Projects</h2>
        <button className="iconButton" type="button" aria-label="New project">
          <Plus size={18} />
        </button>
      </div>
      <div className="emptyState">No projects yet</div>
    </aside>
  );
}
```

Create `apps/desktop/src/renderer/components/PreviewPane.tsx`:

```tsx
export function PreviewPane() {
  return (
    <main className="previewPane">
      <div className="previewHeader">
        <h2>Live Preview</h2>
        <div className="previewActions">
          <button type="button" disabled>
            Export PDF
          </button>
          <button type="button" disabled>
            Export HTML
          </button>
        </div>
      </div>
      <div className="slideFrame">
        <div className="slideCanvas">Create a project to preview branded slides.</div>
      </div>
    </main>
  );
}
```

Create `apps/desktop/src/renderer/components/ChatPanel.tsx`:

```tsx
export function ChatPanel() {
  return (
    <aside className="chatPanel" aria-label="AI Chat">
      <h2>AI Chat</h2>
      <div className="chatBody">Gemini outline and editing will appear in the next slice.</div>
      <form className="chatInput">
        <input aria-label="Message" disabled />
        <button type="submit" disabled>
          Send
        </button>
      </form>
    </aside>
  );
}
```

- [ ] **Step 11: Add App and renderer entry**

Create `apps/desktop/src/renderer/App.tsx`:

```tsx
import { ChatPanel } from "./components/ChatPanel";
import { PreviewPane } from "./components/PreviewPane";
import { ProjectSidebar } from "./components/ProjectSidebar";
import "./styles.css";

export function App() {
  return (
    <div className="appShell">
      <header className="topBar">
        <h1>Idris Slides</h1>
        <button type="button">Light</button>
      </header>
      <div className="workspace">
        <ProjectSidebar />
        <PreviewPane />
        <ChatPanel />
      </div>
    </div>
  );
}
```

Create `apps/desktop/src/renderer/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing root element");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 12: Add app styles**

Create `apps/desktop/src/renderer/styles.css`:

```css
:root {
  color-scheme: light;
  font-family: STCForward, Inter, system-ui, sans-serif;
  background: #f5f7f8;
  color: #1d252d;
}

body {
  margin: 0;
}

button,
input {
  font: inherit;
}

.appShell {
  min-height: 100vh;
  display: grid;
  grid-template-rows: 56px 1fr;
}

.topBar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 18px;
  border-bottom: 1px solid #d8dee2;
  background: #ffffff;
}

.topBar h1,
.sidebar h2,
.previewHeader h2,
.chatPanel h2 {
  margin: 0;
  font-size: 16px;
}

.workspace {
  display: grid;
  grid-template-columns: 260px minmax(520px, 1fr) 340px;
  min-height: 0;
}

.sidebar,
.chatPanel {
  padding: 16px;
  background: #ffffff;
}

.sidebar {
  border-right: 1px solid #d8dee2;
}

.chatPanel {
  border-left: 1px solid #d8dee2;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 16px;
}

.sidebarHeader,
.previewHeader,
.previewActions,
.chatInput {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sidebarHeader,
.previewHeader {
  justify-content: space-between;
}

.iconButton {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.emptyState,
.chatBody {
  color: #6b767c;
  font-size: 14px;
  margin-top: 18px;
}

.previewPane {
  min-width: 0;
  padding: 16px;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 16px;
}

.slideFrame {
  min-height: 0;
  display: grid;
  place-items: center;
  background: #e9eef1;
  border: 1px solid #d8dee2;
}

.slideCanvas {
  width: min(100%, 960px);
  aspect-ratio: 16 / 9;
  display: grid;
  place-items: center;
  background: #ffffff;
  color: #1d252d;
  box-shadow: 0 16px 50px rgb(29 37 45 / 12%);
}

.chatInput input {
  min-width: 0;
  flex: 1;
}
```

- [ ] **Step 13: Run UI test and typecheck**

Run:

```bash
pnpm test apps/desktop/src/renderer/App.test.tsx
pnpm --filter @idris-slides/desktop typecheck
```

Expected: both commands pass.

- [ ] **Step 14: Commit**

```bash
git add apps/desktop package.json pnpm-lock.yaml
git commit -m "feat: add desktop workspace shell"
```

## Task 6: Final Verification

**Files:**
- Modify only if verification reveals a defect in files created by Tasks 1-5.

- [ ] **Step 1: Run all tests**

Run:

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 2: Run all typechecks**

Run:

```bash
pnpm typecheck
```

Expected: all package typechecks pass.

- [ ] **Step 3: Build all packages**

Run:

```bash
pnpm build
```

Expected: all packages build or typecheck successfully. If Electron main/preload output configuration needs adjustment, fix the package scripts and rerun this command before continuing.

- [ ] **Step 4: Inspect git status**

Run:

```bash
git status --short
```

Expected: no uncommitted changes.

- [ ] **Step 5: Push the foundation branch**

Run:

```bash
git push
```

Expected: all foundation commits are pushed to `origin/main`.

## Plan Self-Review

- Spec coverage: This foundation plan covers the desktop shell, brand system, local project storage, preview/export orchestration interfaces, dark/light-ready UI structure, and testing setup. It intentionally defers Gemini outline generation, deck generation, iterative AI editing, repair loops, and packaging to later plans.
- Red-flag scan: No incomplete markers or vague implementation-only steps are required for this plan.
- Type consistency: `ProjectMetadata`, `CommandRunner`, project store functions, and renderer API names are defined before use and reused consistently.
