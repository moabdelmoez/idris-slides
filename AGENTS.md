# Repository Guidelines

## Project Structure & Module Organization

This repository is an npm workspace monorepo for the Idris Slides desktop app. The Electron/Vite app lives in `apps/desktop`, with main-process code in `src/main`, preload bridge code in `src/preload`, shared app types in `src/shared`, and React renderer code in `src/renderer`. Reusable packages live in `packages`: `packages/project` handles project/deck storage and generated deck runtime files, `packages/core` contains the slide deck runtime, and `packages/brand` contains Solutions brand tokens, components, font assets, and validation helpers. Tests are colocated with source as `*.test.ts` or `*.test.tsx`.

## Build, Test, and Development Commands

- `npm install`: install root and workspace dependencies.
- `npm run dev`: start the Electron desktop app through `@idris-slides/desktop`.
- `npm run build`: run build scripts across workspaces that define one.
- `npm run typecheck`: run TypeScript checks across workspaces.
- `npm test`: run the full Vitest suite once.
- `npm run test:watch`: run Vitest in watch mode.
- `npm test --workspace @idris-slides/project`: run tests for one workspace.

Use Node `24.15.0` and npm `11.12.1`, as declared in `package.json`.

## Coding Style & Naming Conventions

Write TypeScript as ES modules with strict typing. Follow the existing style: two-space indentation, double quotes, semicolons, named exports for shared utilities, and `type` imports where possible. Use PascalCase for React components, camelCase for functions and variables, and kebab-case for generated deck or package identifiers. Keep Electron IPC and filesystem behavior in `src/main`; keep renderer components focused on UI state and presentation.

## Testing Guidelines

Vitest is the test runner. Add focused tests beside the code they cover using `*.test.ts` for package/main logic and `*.test.tsx` for React renderer tests. The root config includes `packages/**/*.test.ts`, `apps/**/*.test.ts`, and `apps/**/*.test.tsx`; `passWithNoTests` is enabled, so verify the expected tests actually ran when changing coverage-sensitive code. Run `npm test` and `npm run typecheck` before handing off changes.

## Commit & Pull Request Guidelines

Recent history uses Conventional Commit prefixes such as `feat:` and `fix:`. Keep commits small and imperative, for example `fix: load Electron preload bridge`. Pull requests should describe the user-facing change, list validation commands run, link relevant issues or specs, and include screenshots or recordings for renderer UI changes.

## Security & Configuration Tips

Do not commit local Gemini API keys, generated secrets, or machine-specific project output. Keep credential handling in the Electron main process and expose only typed, minimal APIs through the preload bridge.
