import { generateGeminiOutline } from "./gemini";
import { getGeminiApiKey } from "./settings-handlers";

export async function generateOutline(prompt: string) {
  const apiKey = await getGeminiApiKey();

  if (!apiKey) {
    throw new Error("Add a Gemini API key before generating an outline.");
  }

  return generateGeminiOutline(apiKey, prompt);
}
