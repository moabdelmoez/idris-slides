import { describe, expect, it, vi } from "vitest";
import { createResearchBrief } from "./tavily";

describe("Tavily research", () => {
  it("uses low-cost defaults and returns a compact research brief", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        query: "Saudi telecom market 2026",
        answer: "Saudi telecom growth is shaped by 5G, enterprise cloud, and digital regulation.",
        results: [
          {
            title: "Saudi telecom outlook",
            url: "https://example.com/outlook",
            content: "5G and enterprise services remain growth priorities.",
            score: 0.92
          }
        ],
        response_time: 1.4,
        usage: { credits: 1 },
        request_id: "request-1"
      })
    });

    const brief = await createResearchBrief({
      apiKey: "tvly-test",
      query: "Saudi telecom market 2026",
      fetchImpl: fetchMock
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.tavily.com/search",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer tvly-test"
        }),
        body: JSON.stringify({
          query: "Saudi telecom market 2026",
          search_depth: "basic",
          topic: "general",
          max_results: 5,
          include_answer: "basic",
          include_raw_content: false,
          include_images: false,
          include_usage: true
        })
      })
    );
    expect(brief).toMatchObject({
      query: "Saudi telecom market 2026",
      answer: "Saudi telecom growth is shaped by 5G, enterprise cloud, and digital regulation.",
      usageCredits: 1,
      sources: [
        {
          title: "Saudi telecom outlook",
          url: "https://example.com/outlook",
          score: 0.92
        }
      ]
    });
  });
});
