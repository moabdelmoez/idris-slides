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
          goal: { type: "STRING" },
          layout: { type: "STRING" },
          visualDirection: { type: "STRING" }
        },
        required: ["title", "goal", "layout", "visualDirection"]
      }
    }
  },
  required: ["title", "summary", "slides"]
} as const;

function buildOutlinePrompt(prompt: string): string {
  return [
    "Create a presentation outline for a Solutions/STC branded open-slide deck.",
    "Return concise, practical slide direction only.",
    "Use only approved brand language and visual direction.",
    "Approved palette: air #ffffff, purple #4f008c, coral #ff375e, sunlight #ffdd40, sunset #ff6a39, oasis #00c48c, sea #1bcad8, moon #a54ee1, silver #8e9aa0, onyx #1d252d.",
    "Preferred layouts: Title slide, Section divider, Two-column slide, Metric slide, Timeline slide, Comparison slide, Image slide, Closing slide.",
    "",
    `User prompt: ${prompt}`
  ].join("\n");
}

function buildEditPrompt(project: ProjectMetadata, editPrompt: string): string {
  return [
    "Revise an existing Solutions/STC branded open-slide deck outline.",
    "Return the full updated outline JSON, not a partial patch.",
    "Preserve approved brand direction and use only approved layouts/colors.",
    "Approved palette: air #ffffff, purple #4f008c, coral #ff375e, sunlight #ffdd40, sunset #ff6a39, oasis #00c48c, sea #1bcad8, moon #a54ee1, silver #8e9aa0, onyx #1d252d.",
    "Preferred layouts: Title slide, Section divider, Two-column slide, Metric slide, Timeline slide, Comparison slide, Image slide, Closing slide.",
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

export async function generateGeminiOutline(apiKey: string, prompt: string): Promise<DeckOutline> {
  return requestGeminiOutline(apiKey, buildOutlinePrompt(prompt));
}

export async function generateGeminiEditedOutline(
  apiKey: string,
  project: ProjectMetadata,
  prompt: string
): Promise<DeckOutline> {
  return requestGeminiOutline(apiKey, buildEditPrompt(project, prompt));
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
