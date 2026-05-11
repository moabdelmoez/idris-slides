import type { ProjectMetadata } from "@idris-slides/project";
import type { DeckOutline } from "../shared/types";

type GeminiPart = {
  text?: string;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
  error?: {
    message?: string;
  };
};

const outlineSchema = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    summary: { type: "STRING" },
    slides: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          content: { type: "STRING" },
          goal: { type: "STRING" },
          layout: { type: "STRING" },
          visualDirection: { type: "STRING" },
          diagram: {
            type: "OBJECT",
            nullable: true,
            properties: {
              type: {
                type: "STRING",
                enum: [
                  "architecture",
                  "er",
                  "flowchart",
                  "layers",
                  "nested",
                  "pyramid",
                  "quadrant",
                  "sequence",
                  "state",
                  "swimlane",
                  "timeline",
                  "tree",
                  "venn"
                ]
              },
              variant: {
                type: "STRING",
                enum: ["consultant"]
              },
              nodes: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    id: { type: "STRING" },
                    label: { type: "STRING" },
                    role: {
                      type: "STRING",
                      enum: ["backend", "external", "focal", "input", "optional", "store"]
                    },
                    sublabel: { type: "STRING" },
                    items: {
                      type: "ARRAY",
                      items: { type: "STRING" }
                    },
                    lane: { type: "STRING" },
                    level: { type: "NUMBER" },
                    radius: { type: "NUMBER" },
                    x: { type: "NUMBER" },
                    y: { type: "NUMBER" }
                  },
                  required: ["id", "label"]
                }
              },
              connections: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    from: { type: "STRING" },
                    to: { type: "STRING" },
                    cardinalityFrom: { type: "STRING" },
                    cardinalityTo: { type: "STRING" },
                    kind: {
                      type: "STRING",
                      enum: ["call", "handoff", "relationship", "return", "self", "transition"]
                    },
                    label: { type: "STRING" },
                    tone: {
                      type: "STRING",
                      enum: ["accent", "default", "link"]
                    }
                  },
                  required: ["from", "to"]
                }
              }
            },
            required: ["type", "nodes"]
          }
        },
        required: ["title", "content", "goal", "layout", "visualDirection"]
      }
    }
  },
  required: ["title", "summary", "slides"]
} as const;

function buildOutlinePrompt(prompt: string): string {
  return [
    "Create a presentation outline for a Solutions/STC branded Idris Slides deck.",
    "The slides array is the complete deck. Do not assume or add a separate title page outside the requested slide count.",
    "If the user asks for an exact number of slides, return exactly that many slide objects.",
    "If the user asks for one slide, return a single slide object that contains the requested content.",
    "For each slide, content is the only audience-facing body copy that may appear on the slide.",
    "Keep goal and visualDirection as internal planning notes; never write labels like Visual direction into content.",
    "When a slide should be a diagram, set layout to a diagram layout and include a diagram object.",
    "Supported diagram types: architecture, flowchart, sequence, state, er, timeline, swimlane, quadrant, nested, tree, layers, venn, pyramid.",
    "If the user explicitly asks for a supported diagram type, use that exact diagram type. Do not substitute a nearby type.",
    "Use variant consultant only for consultant-style quadrant diagrams.",
    "Diagram nodes must be concise. Use at most 9 nodes and at most 12 connections.",
    "Use role focal for only 1 or 2 nodes. Use connection tone accent for only the primary relationship.",
    "If the requested diagram is too complex, split it across multiple diagram slides.",
    "Return concise, practical slide direction only.",
    "Use only approved brand language and visual direction.",
    "Approved palette: air #ffffff, purple #4f008c, coral #ff375e, sunlight #ffdd40, sunset #ff6a39, oasis #00c48c, sea #1bcad8, moon #a54ee1, silver #8e9aa0, onyx #1d252d.",
    "Preferred layouts: Title slide, Section divider, Two-column slide, Metric slide, Timeline slide, Comparison slide, Image slide, Closing slide, Architecture diagram, Flowchart diagram, Sequence diagram, State diagram, ER diagram, Swimlane diagram, Quadrant diagram, Nested diagram, Tree diagram, Layer stack diagram, Venn diagram, Pyramid diagram.",
    "",
    `User prompt: ${prompt}`
  ].join("\n");
}

function buildEditPrompt(project: ProjectMetadata, editPrompt: string): string {
  return [
    "Revise an existing Solutions/STC branded Idris Slides deck outline.",
    "Return the full updated outline JSON, not a partial patch.",
    "The slides array is the complete deck. Do not assume or add a separate title page outside the requested slide count.",
    "If the user asks for an exact number of slides, return exactly that many slide objects.",
    "For each slide, content is the only audience-facing body copy that may appear on the slide.",
    "Keep goal and visualDirection as internal planning notes; never write labels like Visual direction into content.",
    "Preserve approved brand direction and use only approved layouts/colors.",
    "When revising a diagram slide, return the full updated diagram object. Keep diagrams within 9 nodes and 12 connections.",
    "Supported diagram types: architecture, flowchart, sequence, state, er, timeline, swimlane, quadrant, nested, tree, layers, venn, pyramid.",
    "If the user explicitly asks for a supported diagram type, use that exact diagram type. Do not substitute a nearby type.",
    "Approved palette: air #ffffff, purple #4f008c, coral #ff375e, sunlight #ffdd40, sunset #ff6a39, oasis #00c48c, sea #1bcad8, moon #a54ee1, silver #8e9aa0, onyx #1d252d.",
    "Preferred layouts: Title slide, Section divider, Two-column slide, Metric slide, Timeline slide, Comparison slide, Image slide, Closing slide, Architecture diagram, Flowchart diagram, Sequence diagram, State diagram, ER diagram, Swimlane diagram, Quadrant diagram, Nested diagram, Tree diagram, Layer stack diagram, Venn diagram, Pyramid diagram.",
    "",
    `Current project: ${JSON.stringify(
      {
        name: project.name,
        outline: project.outline
      },
      null,
      2
    )}`,
    "",
    `User edit request: ${editPrompt}`
  ].join("\n");
}

function parseOutline(text: string): DeckOutline {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const outline = JSON.parse(cleaned) as DeckOutline;

  if (!outline.title || !outline.summary || !Array.isArray(outline.slides)) {
    throw new Error("Gemini returned an invalid outline shape.");
  }

  return outline;
}

const numberWords = new Map([
  ["one", 1],
  ["two", 2],
  ["three", 3],
  ["four", 4],
  ["five", 5],
  ["six", 6],
  ["seven", 7],
  ["eight", 8],
  ["nine", 9],
  ["ten", 10],
  ["eleven", 11],
  ["twelve", 12]
]);

function requestedSlideCount(prompt: string): number | null {
  const digitMatch = prompt.match(/\b(\d{1,2})\s+slides?\b/i);

  if (digitMatch) {
    return Math.max(1, Number(digitMatch[1]));
  }

  const wordPattern = Array.from(numberWords.keys()).join("|");
  const wordMatch = prompt.match(new RegExp(`\\b(${wordPattern})\\s+slides?\\b`, "i"));

  const matchedWord = wordMatch?.[1];

  if (!matchedWord) {
    return null;
  }

  return numberWords.get(matchedWord.toLowerCase()) ?? null;
}

function enforceRequestedSlideCount(outline: DeckOutline, prompt: string): DeckOutline {
  const count = requestedSlideCount(prompt);

  if (!count || outline.slides.length <= count) {
    return outline;
  }

  return {
    ...outline,
    slides: outline.slides.slice(0, count)
  };
}

export async function generateGeminiOutline(apiKey: string, prompt: string): Promise<DeckOutline> {
  return enforceRequestedSlideCount(await requestGeminiOutline(apiKey, buildOutlinePrompt(prompt)), prompt);
}

export async function generateGeminiEditedOutline(
  apiKey: string,
  project: ProjectMetadata,
  prompt: string
): Promise<DeckOutline> {
  return enforceRequestedSlideCount(
    await requestGeminiOutline(apiKey, buildEditPrompt(project, prompt)),
    prompt
  );
}

async function requestGeminiOutline(apiKey: string, prompt: string): Promise<DeckOutline> {
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: outlineSchema
        }
      })
    }
  );

  const data = (await response.json()) as GeminiResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Gemini outline request failed.");
  }

  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("");

  if (!text) {
    throw new Error("Gemini did not return outline text.");
  }

  return parseOutline(text);
}
