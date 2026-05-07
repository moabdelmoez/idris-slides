---
name: Idris Slides
description: A structured desktop workspace for generating professional presentation decks from chat-guided source material.
colors:
  solutions-air: "#ffffff"
  solutions-purple: "#4f008c"
  solutions-coral: "#ff375e"
  solutions-sunlight: "#ffdd40"
  solutions-sunset: "#ff6a39"
  solutions-oasis: "#00c48c"
  solutions-sea: "#1bcad8"
  solutions-moon: "#a54ee1"
  solutions-silver: "#8e9aa0"
  solutions-onyx: "#1d252d"
  app-background: "#f5f7f8"
  app-panel: "#ffffff"
  app-panel-muted: "#e9eef1"
  app-border: "#d8dee2"
  app-border-soft: "#e3e8eb"
  app-text-muted: "#6b767c"
  app-success: "#007f5f"
  app-error: "#b42318"
  app-warning-bg: "#fff3cd"
  app-warning-border: "#f0d47a"
  app-warning-text: "#5f4700"
typography:
  display:
    fontFamily: "STCForward, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "52px"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "normal"
  headline:
    fontFamily: "STCForward, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "normal"
  title:
    fontFamily: "STCForward, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "normal"
  body:
    fontFamily: "STCForward, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.35
    letterSpacing: "normal"
  label:
    fontFamily: "STCForward, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "normal"
rounded:
  none: "0"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "18px"
  xl: "20px"
  slide-pad: "52px"
  brand-slide-pad: "96px"
components:
  button-primary:
    backgroundColor: "{colors.solutions-purple}"
    textColor: "{colors.solutions-air}"
    rounded: "{rounded.none}"
    padding: "7px 10px"
  button-icon:
    backgroundColor: "{colors.app-panel}"
    textColor: "{colors.solutions-onyx}"
    rounded: "{rounded.none}"
    width: "32px"
    height: "32px"
  project-item:
    backgroundColor: "{colors.app-panel}"
    textColor: "{colors.solutions-onyx}"
    rounded: "{rounded.none}"
    padding: "10px"
  slide-canvas:
    backgroundColor: "{colors.solutions-air}"
    textColor: "{colors.solutions-onyx}"
    rounded: "{rounded.none}"
    width: "min(100%, 960px)"
---

# Design System: Idris Slides

## 1. Overview

**Creative North Star: "Executive Workbench"**

Idris Slides is a professional desktop workspace for turning source material into finished decks. The interface should feel structured, confident, and quiet: a place where the generated slide preview is the main object, chat is a precise command surface, and every control supports deck refinement instead of competing with it.

The system rejects consumer creation-tool chaos, legacy ribbon-heavy office software, and bubbly AI wrapper aesthetics. It should preserve the discipline of a workbench: strong zones, visible state, compact controls, and a restrained visual vocabulary that makes generated output feel trustworthy.

**Key Characteristics:**

- Product-first, not marketing-first.
- Preview-led hierarchy, with the slide canvas as the visual anchor.
- Restrained color usage, with Solutions purple reserved for primary action, selection, and branded slide surfaces.
- Dense but calm panels for project history, chat, settings, and export controls.
- Familiar controls with consistent hover, focus, disabled, loading, and error states.

## 2. Colors

The palette combines Solutions brand colors with a cool, restrained application shell. Brand color is strongest inside slide output and primary actions; the app workspace stays mostly neutral so users can judge the deck.

### Primary

- **Solutions Purple** (`#4f008c`): Primary brand and action color. Use for primary actions, current selection, branded title slides, and essential state markers. Keep it rare in the application shell.

### Secondary

- **Coral Signal** (`#ff375e`): High-energy brand accent used inside generated slide compositions and accent sequences.
- **Sunlight Marker** (`#ffdd40`): Highlight accent for slide eyebrows, branded dividers, and optimistic emphasis inside generated decks.
- **Oasis Confirmation** (`#00c48c`): Brand accent for positive slide moments and, when needed, success-adjacent visual language.
- **Sea Accent** (`#1bcad8`): Cool brand accent for slide composition, supporting marks, and data-adjacent emphasis.
- **Moon Accent** (`#a54ee1`): Extended purple-family accent for deck content, not for broad app-shell decoration.

### Tertiary

- **Sunset Accent** (`#ff6a39`): Warm brand accent for slide compositions and occasional deck-level emphasis.
- **App Success** (`#007f5f`): Operational success status in the desktop shell.
- **App Error** (`#b42318`): Error messages and destructive state.
- **App Warning** (`#fff3cd`, `#f0d47a`, `#5f4700`): Bridge and setup notices that need attention without implying failure.

### Neutral

- **Air Surface** (`#ffffff`): Primary panel surface and generated slide background.
- **Workbench Field** (`#f5f7f8`): Main app background.
- **Preview Well** (`#e9eef1`): Slide preview frame background.
- **Onyx Text** (`#1d252d`): Primary text and overlay scrim source.
- **Silver Token** (`#8e9aa0`): Approved brand neutral.
- **Muted Interface Text** (`#6b767c`): Secondary labels, helper text, and metadata.
- **Structural Border** (`#d8dee2`): Primary divider and control border.
- **Soft Divider** (`#e3e8eb`): Message separators and lighter internal rules.

### Named Rules

**The Preview Priority Rule.** The app shell stays neutral so the deck preview can carry brand color and visual drama.

**The No Chatbot Candy Rule.** Do not use pastel gradients, oversized rounded message bubbles, or decorative assistant motifs.

## 3. Typography

**Display Font:** STCForward with platform sans fallbacks.

**Body Font:** STCForward with platform sans fallbacks.

**Label/Mono Font:** STCForward unless a future data or code surface earns a distinct mono role.

**Character:** The type system is compact and work-focused. It supports professional density in panels while allowing generated slides to scale up with confident display sizes.

### Hierarchy

- **Display** (700, `52px`, `1.02`): Active slide preview titles and other deck-facing hero text.
- **Headline** (700, `18px`, `1.25`): Modal titles and prominent local section headings.
- **Title** (700, `16px`, `1.25`): Top bar title, panel headings, preview headers, and sidebar headings.
- **Body** (400, `14px`, `1.35`): Standard panel copy, chat content, empty states, and helper text. Keep prose line length near 65 to 75 characters where the surface allows it.
- **Label** (400, `12px`, `1.25`): Status text, project metadata, compact captions, and secondary control text.

### Named Rules

**The Workbench Scale Rule.** Product panels use compact type. Slide previews can use large type because they represent the output, not the control surface.

## 4. Elevation

Idris Slides uses tonal and structural elevation. Borders, background shifts, and panel placement define most depth. Shadows are reserved for the slide canvas, where lift helps distinguish the generated deck from the surrounding workbench.

### Shadow Vocabulary

- **Slide Lift** (`box-shadow: 0 16px 50px rgb(29 37 45 / 12%)`): Use only for slide canvases or deck-output objects that need to feel separate from the workspace.
- **Overlay Scrim** (`background: rgb(29 37 45 / 20%)`): Use behind modal surfaces to preserve focus without making the app feel theatrical.

### Named Rules

**The Flat Shell Rule.** Panels and controls stay flat at rest. Depth belongs to output, modal focus, or direct interaction feedback.

## 5. Components

### Buttons

Buttons are restrained, compact, and direct. They should look like commands in a professional tool, not promotional calls to action.

- **Shape:** Square by default (`0` radius), matching the current shell.
- **Primary:** Solutions Purple background with Air text, compact padding, and clear disabled state.
- **Hover / Focus:** Use visible border, outline, or tonal shift. Focus states must be keyboard-visible and meet WCAG AA contrast.
- **Secondary / Ghost:** Neutral background with structural border. Reserve filled purple for the one most important action in a local context.
- **Icon Buttons:** Fixed `32px` square with lucide icons and accessible labels.

### Cards / Containers

Containers are panels, not decorative cards. They organize the workspace into sidebar, preview, chat, modal, and slide-output regions.

- **Corner Style:** Square by default (`0` radius).
- **Background:** Air for panels, Workbench Field for app background, Preview Well for slide framing.
- **Shadow Strategy:** No shell shadows at rest. Slide canvases receive Slide Lift.
- **Border:** Structural Border for primary panel separation and controls.
- **Internal Padding:** `16px` for main panels, `20px` for settings modal, larger slide-specific padding for output.

### Inputs / Fields

Inputs should feel like command-entry fields. The chat input is a structured composer, not a social chat bubble.

- **Style:** Neutral field with inherited typography, compact height, and no playful rounding.
- **Focus:** Strong visible ring or border shift. Do not rely on color alone.
- **Error / Disabled:** Disabled states reduce emphasis while preserving legibility. Errors use App Error with direct text.

### Navigation

Navigation is workspace navigation, not site navigation. The top bar anchors app-level actions, the sidebar manages projects, and the preview header manages output actions.

- **Top Bar:** `56px` high with structural bottom border.
- **Project Sidebar:** `260px` wide, compact project list, clear active item, and fixed icon affordance for new project.
- **Preview Pane:** Central flexible region, minimum width protected for slide inspection.
- **Chat Panel:** `340px` right rail, designed as a command and review surface.

### Slide Preview

The slide preview is the product's trust surface. It should remain visually dominant and immediately inspectable.

- **Canvas:** 16:9 aspect ratio, max width `960px` in the app shell.
- **Generated Deck Surface:** Uses approved Solutions brand colors and STCForward.
- **Active Preview:** Purple title-slide treatment with Sunlight eyebrow and short multi-color accent bar.
- **Empty State:** Directly states what action is needed to produce a preview.

### Modals

Modals are reserved for focused setup tasks such as settings and credentials.

- **Shape:** Square panel with structural border.
- **Backdrop:** Onyx scrim at 20 percent opacity.
- **Layout:** Compact form stack with right-aligned actions.

## 6. Do's and Don'ts

### Do

- Do make the slide preview the dominant visual object.
- Do keep chat restrained, direct, and structured around deck generation.
- Do use Solutions Purple for primary action, selection, and branded slide output.
- Do use structural borders and tonal layers before adding shadows.
- Do provide visible focus, disabled, loading, empty, warning, and error states.
- Do use lucide icons for compact repeated commands where icons are available.
- Do keep professional density in sidebars, headers, and panels.

### Don't

- Don't make the chat panel look like a generic chatbot product.
- Don't use pastel gradients, bubbly rounded message cards, or decorative assistant motifs.
- Don't recreate PowerPoint or Google Slides ribbon complexity.
- Don't make Canva-like freeform drag controls the default interaction model.
- Don't use colored side-stripe accents on project items, cards, callouts, or alerts.
- Don't use gradient text.
- Don't use glassmorphism as decorative default styling.
- Don't use identical card grids as the primary layout language.
- Don't use shadows on ordinary shell panels at rest.
