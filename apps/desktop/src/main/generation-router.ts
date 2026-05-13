import type { GenerationMode } from "../shared/types";

const simpleLiteralPatterns = [
  /\b(one|1)[-\s]?slide\b.*\b(say|says|saying|contain|contains|write|show|display)\b/i,
  /\b(say|says|saying|write|show|display)\b.+\b(on|in)\b.+\b(one|1)[-\s]?slide\b/i
];

const currentSignals = /\b20\d{2}\b|\bcurrent|latest|recent|today|outlook|trends?|forecast|news\b/i;
const geographySignals = /\bsaudi|ksa|uae|egypt|united states|europe|global\b/i;
const factualMarketSignals = /\bmarket|industry|competitor|telecom|finance|economic|regulation\b/i;

const executiveSignals = /\bexecutive|client|board|leadership|strategy|recommendation|decision|deck\b/i;

export function classifyGenerationRequest(prompt: string): GenerationMode {
  const normalized = prompt.trim();

  if (!normalized) {
    return { mode: "deck_outline", confidence: "low", estimatedCostTier: "low" };
  }

  if (simpleLiteralPatterns.some((pattern) => pattern.test(normalized)) && normalized.length < 160) {
    return { mode: "simple_direct", confidence: "high", estimatedCostTier: "low" };
  }

  if (currentSignals.test(normalized) || (geographySignals.test(normalized) && factualMarketSignals.test(normalized))) {
    return {
      mode: "research_confirm",
      confidence: "high",
      researchRecommendation: "Use Tavily to ground current market facts before drafting the outline.",
      estimatedCostTier: "medium"
    };
  }

  if (executiveSignals.test(normalized) && !/\b(audience|for|decision|approve|recommend|invest|launch)\b/i.test(normalized)) {
    return {
      mode: "brief_needed",
      confidence: "medium",
      requiredQuestion: "Who is the audience, and what decision or action should the deck drive?",
      estimatedCostTier: "low"
    };
  }

  return { mode: "deck_outline", confidence: "medium", estimatedCostTier: "low" };
}
