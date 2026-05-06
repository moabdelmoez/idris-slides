# Idris Slide Desktop Design

Date: 2026-05-06

## Purpose

Build a local-first desktop app for creating Solutions-branded slide decks with AI. The app should feel like an approachable desktop wrapper around `open-slide`: users describe the deck they want, approve an outline, and continue editing through chat while the app writes and previews the underlying `open-slide` project.

The first version focuses on new decks created by this app. Importing arbitrary existing `open-slide` projects is out of scope for v1.

## Product Flow

The first screen is the working app, not a landing page. It contains:

- A project sidebar for local decks.
- A central live slide preview.
- A right-side AI chat panel.
- Simple actions for new project, export PDF, export HTML, and app theme.

A new deck starts from a natural-language prompt. Gemini returns a structured outline first: slide titles, slide goals, suggested layouts, and visual direction. The user approves the outline or asks for revisions in chat. After approval, Gemini generates the branded `open-slide` deck files.

After generation, all modifications happen through chat. The user can ask whole-deck requests such as "make this more executive" or targeted requests such as "make slide 4 more visual." The app applies changes to local files, refreshes the preview, and auto-saves.

## Recommended Architecture

Use Electron as the desktop shell and `open-slide` as the slide runtime.

The app should use a small monorepo:

- `apps/desktop`: Electron main process, preload bridge, and React renderer UI.
- `packages/brand`: Solutions brand tokens, fonts, slide primitives, layout presets, and AI rules.
- `packages/ai`: Gemini client, prompt templates, outline generation, edit planning, and response validation.
- `packages/project`: project metadata, local storage, deck creation, auto-save, preview process management, and exports.

Each user project contains a generated `open-slide` workspace. The Electron main process handles trusted operations: file access, secure settings storage, child processes, and export commands. The renderer handles user-facing UI: project list, outline approval, chat, preview, export controls, and dark/light mode.

Live preview runs by starting the active project's `open-slide` dev server in the background and loading it inside the desktop app preview. The app watches process state and project files so the preview can refresh after AI edits.

## Brand System

All generated slides must follow the provided Solutions branding assets. The brand package should include the STC and STCForward fonts from `Solutions Fonts.zip` and expose a locked palette from `brand-color_Scheme_digital_EN.pdf`:

- `air`: `#ffffff`
- `purple`: `#4f008c`
- `coral`: `#ff375e`
- `sunlight`: `#ffdd40`
- `sunset`: `#ff6a39`
- `oasis`: `#00c48c`
- `sea`: `#1bcad8`
- `moon`: `#a54ee1`
- `silver`: `#8e9aa0`
- `onyx`: `#1d252d`

Generated decks import the brand package and compose slides from approved primitives:

- Title slide
- Section divider
- Two-column slide
- Metric slide
- Timeline slide
- Comparison slide
- Image slide
- Closing slide

Gemini should be instructed to use these primitives and tokens instead of inventing arbitrary colors or font choices. Brand validation should run after each AI write and flag forbidden colors, missing brand imports, invalid TypeScript, or broken exports. If validation fails, the app asks Gemini for a repair patch before reporting success.

## AI Workflow

The AI workflow has three stages.

1. Outline generation: the user's prompt and brand rules are sent to Gemini. Gemini returns structured JSON with deck title, slide list, slide goals, layout suggestions, and visual direction. The app validates the JSON before showing it.
2. Deck generation: after outline approval, Gemini generates React files for an `open-slide` deck using the brand package. The app writes files locally, runs checks, and starts or refreshes preview.
3. Iterative editing: chat messages are classified as whole-deck or slide-specific. Gemini returns a file patch plan. The app applies the patch, validates the deck, and refreshes preview.

The v1 editor is text-only. Click-to-comment or visual inspector workflows are intentionally deferred.

## Local Storage

Projects live in the user's app data directory by default. A future version may allow choosing a custom workspace folder.

Each project should contain:

- `project.json`: app metadata, prompt history references, model settings, timestamps, active deck state, and export history.
- `deck/`: the generated `open-slide` workspace.
- `assets/`: images, fonts, logos, and other imported media.
- `chat.jsonl`: append-only conversation events and edit requests.

Auto-save should run after every meaningful operation: prompt submitted, outline generated, outline approved, deck files written, AI edit applied, and export completed. Metadata writes should be atomic. Deck source files remain normal files so `open-slide` can reload naturally.

Gemini API keys are stored locally through Electron-safe secure storage and are never written into project folders.

## Export

V1 supports:

- Export to PDF.
- Export to static HTML.

Exports should call the underlying `open-slide` export flow for the active project. Export results are stored in the local project export history and surfaced in the UI.

## Dark And Light Mode

The app shell supports dark and light mode. This affects desktop UI chrome, sidebars, chat, and controls.

Generated slides remain governed by the Solutions brand system. Dark or light slide layouts may exist only as approved brand templates, not as arbitrary app theme inversions.

## Error Handling

Errors should be handled as visible but friendly recovery states:

- Invalid Gemini settings: prompt the user to update the API key.
- Invalid outline JSON: ask Gemini to repair the JSON response.
- TypeScript or build failure: send the failure summary to Gemini for a repair patch.
- Preview server failure: show a retry action and a compact technical summary.
- Export failure: keep the project intact, show the failure, and allow retry.

The chat should show plain progress states such as "generating outline," "writing slides," "repairing slide 4," and "exporting PDF" instead of raw logs.

## Testing Strategy

Tests should focus on the highest-risk boundaries:

- Project metadata read/write and atomic save behavior.
- Gemini response parsing and schema validation.
- Brand token validation.
- Prompt-template output contracts.
- Export command orchestration.
- Electron IPC boundaries.
- UI smoke tests for project creation, outline approval, preview loading, auto-save, and export actions.

## Milestones

1. Desktop shell: project list, Gemini key settings, app theme toggle, and static preview pane.
2. `open-slide` integration: project creation, branded theme package, live preview, PDF export, and HTML export.
3. AI creation: Gemini outline generation and deck generation.
4. AI editing: text-based whole-deck and slide-specific edits with validation and repair loops.
5. Packaging: macOS and Windows builds.

## Deferred From V1

- Importing arbitrary existing `open-slide` projects.
- Click-to-comment slide inspector.
- Multi-provider AI beyond Gemini.
- Cloud sync or collaboration.
- Custom workspace selection.
- Template marketplace or template editor.
