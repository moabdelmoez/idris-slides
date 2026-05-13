# Product

## Register

product

## Users

Professional users in sales, strategy, consulting, and engineering who need to turn ideas, documents, or structured source material into finished presentation decks. They want the leverage of generated slides without spending time manually formatting layouts, aligning elements, or fighting presentation-tool chrome.

## Product Purpose

Idris Slides helps users move from idea or document to finished deck through a structured chat workflow. Success means the user can describe, refine, preview, and export a polished deck while the product preserves strong layout opinions and reduces manual slide-making effort.

## Core Experience

The product turns a user prompt into an outline, then into a live React deck preview. The generated output should feel closer to a crafted executive presentation than a filled template: strong hierarchy, full-slide composition, structured cards, native diagrams, and STC/Solutions brand discipline. Users should be able to refine content through chat, inspect the live preview, make direct text edits where supported, and export to PDF, HTML, or PowerPoint.

## Slide Generation Strategy

Idris uses structured slide specs instead of arbitrary AI-generated React code. Gemini returns layout-ready fields such as `layout`, `emphasis`, `visualSystem`, `blocks`, `metrics`, and `diagram`; the local renderer maps those fields into tested React slide components. This keeps output flexible enough for polished slides while preserving type safety, editability, and predictable exports.

The default visual identity is STC/Solutions. Sample HTML decks in `templates/` are references for craft: large confident type, tokenized visual systems, folios, full-canvas layouts, and composed diagrams. They are not alternate brand themes unless a future product mode explicitly supports selectable themes.

## Brand Personality

Precise, structured, professional. The interface should feel opinionated and capable, with enough restraint to support focused work and enough craft to signal that the generated output will be polished.

## Anti-references

Canva: avoid consumer-grade playfulness, drag-everything chaos, and decorative creation-tool energy.

Google Slides and PowerPoint: avoid legacy grid UIs, toolbar overload, ribbons, endless menus, and the feeling of office software.

Notion AI and generic AI chat wrappers: avoid bubbly SaaS chat aesthetics, pastel gradients, rounded-everything softness, and a product experience that looks like the chat is the whole product.

## Design Principles

Structure over freeform chaos: guide users through clear deck-generation decisions instead of exposing every possible formatting control.

Preview is central: keep the generated deck visible and inspectable so users trust the result as it evolves.

Chat is an input method, not the product identity: make conversation useful and restrained, without leaning on generic chatbot tropes.

Professional density with calm hierarchy: support repeated work, scanning, and refinement without becoming a legacy toolbar interface.

Opinionated output, editable workflow: the app should make strong formatting decisions while still giving users clear ways to steer the deck.

Structured generation before freeform code: prefer typed slide intent and local renderers over model-authored TSX. Add raw code generation only when validation, sandboxing, and editability are clearly solved.

Brand-safe craft: make STC/Solutions decks visually rich without drifting into generic template packs or uncontrolled theme variety.

## Accessibility & Inclusion

Target WCAG AA. Preserve strong text contrast, visible focus states, keyboard-reachable controls, reduced-motion support, and layouts that remain usable across common desktop and laptop viewports.
