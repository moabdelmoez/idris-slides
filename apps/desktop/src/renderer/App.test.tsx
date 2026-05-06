// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import type { IdrisSlidesApi } from "../preload/preload";

describe("App", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    const api: IdrisSlidesApi = {
      createProject: vi.fn(),
      createDeckFromOutline: vi.fn().mockResolvedValue({
        id: "project-1",
        name: "Market Expansion",
        createdAt: "2026-05-06T00:00:00.000Z",
        updatedAt: "2026-05-06T00:00:00.000Z",
        deckPath: "/tmp/idris/project-1/deck",
        exports: [],
        sourcePrompt: "Create a 5 slide deck about market expansion",
        slideCount: 1
      }),
      getSettings: vi.fn().mockResolvedValue({ hasGeminiApiKey: false }),
      saveGeminiApiKey: vi.fn().mockResolvedValue({ hasGeminiApiKey: true }),
      generateOutline: vi.fn().mockResolvedValue({
        title: "Market Expansion",
        summary: "A branded outline for expansion planning.",
        slides: [
          {
            title: "Opportunity",
            goal: "Frame the growth opportunity.",
            layout: "Title slide",
            visualDirection: "Use purple background with coral emphasis."
          }
        ]
      })
    };

    window.idrisSlides = api;
  });

  it("renders the desktop workspace shell", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Idris Slides" })).toBeInTheDocument();
    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.getByText("Live Preview")).toBeInTheDocument();
    expect(screen.getByText("AI Chat")).toBeInTheDocument();
  });

  it("saves a Gemini API key and generates an outline from chat", async () => {
    render(<App />);

    expect(await screen.findByText("Gemini API key required")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.change(screen.getByLabelText("Gemini API key"), {
      target: { value: "test-key" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save key" }));

    await waitFor(() => {
      expect(screen.getByText("Gemini ready")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Create a 5 slide deck about market expansion" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("Market Expansion")).toBeInTheDocument();
    expect(screen.getByText("Opportunity")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Approve outline" }));

    expect(await screen.findByText("Market Expansion", { selector: ".projectName" })).toBeInTheDocument();
    expect(screen.getByText("1 slide generated")).toBeInTheDocument();
    expect(screen.getByText("Deck created and saved locally.")).toBeInTheDocument();
    expect(window.idrisSlides?.saveGeminiApiKey).toHaveBeenCalledWith("test-key");
    expect(window.idrisSlides?.generateOutline).toHaveBeenCalledWith(
      "Create a 5 slide deck about market expansion"
    );
    expect(window.idrisSlides?.createDeckFromOutline).toHaveBeenCalled();
  });
});
