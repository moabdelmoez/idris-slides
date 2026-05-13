import type { ProjectMetadata } from "@idris-slides/project";
import type { GenerateOutlineOptions } from "../shared/types";
import { applyDeckOutlineEdit } from "@idris-slides/project";
import { generateGeminiEditedOutline, generateGeminiOutline } from "./gemini";
import { getGeminiApiKey, getTavilyApiKey } from "./settings-handlers";
import { createResearchBrief } from "./tavily";

export async function generateOutline(prompt: string, options: GenerateOutlineOptions = {}) {
  const apiKey = await getGeminiApiKey();

  if (!apiKey) {
    throw new Error("Add a Gemini API key before generating an outline.");
  }

  if (!options.useWebResearch) {
    return generateGeminiOutline(apiKey, prompt);
  }

  const tavilyApiKey = await getTavilyApiKey();

  if (!tavilyApiKey) {
    throw new Error("Add a Tavily API key before using web research.");
  }

  const researchBrief = await createResearchBrief({ apiKey: tavilyApiKey, query: prompt });
  return generateGeminiOutline(apiKey, prompt, { researchBrief });
}

export async function editDeck(project: ProjectMetadata, prompt: string) {
  const apiKey = await getGeminiApiKey();

  if (!apiKey) {
    throw new Error("Add a Gemini API key before editing a deck.");
  }

  const outline = await generateGeminiEditedOutline(apiKey, project, prompt);
  return applyDeckOutlineEdit({ project, outline, editPrompt: prompt });
}
