import type { ProjectMetadata } from "@idris-slides/project";
import { applyDeckOutlineEdit } from "@idris-slides/project";
import { generateGeminiEditedOutline, generateGeminiOutline } from "./gemini";
import { getGeminiApiKey } from "./settings-handlers";

export async function generateOutline(prompt: string) {
  const apiKey = await getGeminiApiKey();

  if (!apiKey) {
    throw new Error("Add a Gemini API key before generating an outline.");
  }

  return generateGeminiOutline(apiKey, prompt);
}

export async function editDeck(project: ProjectMetadata, prompt: string) {
  const apiKey = await getGeminiApiKey();

  if (!apiKey) {
    throw new Error("Add a Gemini API key before editing a deck.");
  }

  const outline = await generateGeminiEditedOutline(apiKey, project, prompt);
  return applyDeckOutlineEdit({ project, outline, editPrompt: prompt });
}
