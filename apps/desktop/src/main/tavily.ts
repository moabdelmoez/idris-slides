import type { ResearchBrief, ResearchSource } from "../shared/types";

type FetchLike = typeof fetch;

type TavilySearchResult = {
  title?: string;
  url?: string;
  content?: string;
  score?: number;
};

type TavilySearchResponse = {
  query?: string;
  answer?: string;
  results?: TavilySearchResult[];
  usage?: {
    credits?: number;
  };
};

type CreateResearchBriefInput = {
  apiKey: string;
  query: string;
  fetchImpl?: FetchLike;
};

function extractFacts(answer: string | undefined, sources: ResearchSource[]): string[] {
  const answerFact = answer?.trim();
  const sourceFacts = sources
    .map((source) => source.content?.trim())
    .filter((fact): fact is string => Boolean(fact));
  return [answerFact, ...sourceFacts].filter((fact): fact is string => Boolean(fact)).slice(0, 8);
}

function extractImplications(facts: string[]): string[] {
  return facts.slice(0, 4).map((fact) => `Consider this when shaping the deck: ${fact}`);
}

export async function createResearchBrief({
  apiKey,
  query,
  fetchImpl = fetch
}: CreateResearchBriefInput): Promise<ResearchBrief> {
  const response = await fetchImpl("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query,
      search_depth: "basic",
      topic: "general",
      max_results: 5,
      include_answer: "basic",
      include_raw_content: false,
      include_images: false,
      include_usage: true
    })
  });

  const data = (await response.json()) as TavilySearchResponse;

  if (!response.ok) {
    throw new Error("Tavily research request failed.");
  }

  const sources = (data.results ?? [])
    .filter((result) => result.title && result.url)
    .map((result) => ({
      title: result.title as string,
      url: result.url as string,
      score: result.score,
      content: result.content
    }));
  const facts = extractFacts(data.answer, sources);

  return {
    query: data.query ?? query,
    answer: data.answer,
    facts,
    implications: extractImplications(facts),
    sources,
    usageCredits: data.usage?.credits,
    generatedAt: new Date().toISOString()
  };
}
