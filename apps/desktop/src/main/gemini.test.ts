import { describe, expect, it, vi } from "vitest";
import { generateGeminiOutline } from "./gemini";

describe("Gemini outline generation", () => {
  it("includes compact Tavily research context when provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    title: "Saudi Telecom Market",
                    summary: "A grounded executive market view.",
                    slides: [
                      {
                        title: "Market Momentum",
                        content: "5G and enterprise services shape growth.",
                        goal: "Frame the opportunity.",
                        layout: "Title slide",
                        visualDirection: "Use premium consulting editorial style."
                      }
                    ]
                  })
                }
              ]
            }
          }
        ]
      })
    });

    await generateGeminiOutline("gemini-key", "Create a deck about Saudi telecom", {
      researchBrief: {
        query: "Saudi telecom market 2026",
        answer: "5G and enterprise services are growth priorities.",
        facts: ["5G is a growth priority."],
        implications: ["Lead with enterprise services."],
        sources: [{ title: "Saudi telecom outlook", url: "https://example.com/outlook", score: 0.92 }],
        usageCredits: 1,
        generatedAt: "2026-05-13T00:00:00.000Z"
      },
      fetchImpl: fetchMock
    });

    const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    const prompt = request.contents[0].parts[0].text;
    expect(prompt).toContain("Tavily research brief");
    expect(prompt).toContain("5G is a growth priority.");
    expect(prompt).toContain("https://example.com/outlook");
  });
});
