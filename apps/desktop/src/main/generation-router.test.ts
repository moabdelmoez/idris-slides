import { describe, expect, it } from "vitest";
import { classifyGenerationRequest } from "./generation-router";

describe("generation router", () => {
  it("sends literal one-slide requests straight to generation", () => {
    expect(classifyGenerationRequest("Create one slide that says Hello World")).toMatchObject({
      mode: "simple_direct",
      confidence: "high"
    });

    expect(classifyGenerationRequest('create one-slide deck saying "Hello"')).toMatchObject({
      mode: "simple_direct",
      confidence: "high"
    });
  });

  it("asks for web research confirmation for current market topics", () => {
    expect(classifyGenerationRequest("Create a deck about the Saudi telecom market in 2026")).toMatchObject({
      mode: "research_confirm",
      researchRecommendation: expect.stringContaining("Tavily")
    });
  });

  it("asks for audience and decision when an executive deck is underspecified", () => {
    expect(classifyGenerationRequest("Create an executive deck about market expansion")).toMatchObject({
      mode: "brief_needed",
      requiredQuestion: expect.stringContaining("audience")
    });
  });
});
