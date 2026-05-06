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
      editDeck: vi.fn().mockResolvedValue({
        id: "project-1",
        name: "Market Expansion",
        createdAt: "2026-05-06T00:00:00.000Z",
        updatedAt: "2026-05-06T00:01:00.000Z",
        deckPath: "/tmp/idris/project-1/deck",
        exports: [],
        sourcePrompt: "Create a 5 slide deck about market expansion",
        slideCount: 1,
        outline: {
          title: "Market Expansion",
          summary: "More executive and metric-led.",
          slides: [
            {
              title: "Executive Opportunity",
              goal: "Frame the growth opportunity for leaders.",
              layout: "Metric slide",
              visualDirection: "Use purple with coral emphasis."
            }
          ]
        }
      }),
      startPreview: vi.fn().mockResolvedValue({
        projectId: "project-1",
        url: "http://127.0.0.1:5317"
      }),
      exportProject: vi.fn().mockResolvedValue({
        id: "project-1",
        name: "Market Expansion",
        createdAt: "2026-05-06T00:00:00.000Z",
        updatedAt: "2026-05-06T00:02:00.000Z",
        deckPath: "/tmp/idris/project-1/deck",
        exports: [
          {
            id: "export-1",
            kind: "html",
            path: "/tmp/idris/project-1/exports/html",
            createdAt: "2026-05-06T00:02:00.000Z"
          }
        ],
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

  it("explains when the renderer is opened without the Electron bridge", () => {
    window.idrisSlides = undefined;

    render(<App />);

    expect(screen.getByText(/browser or file preview/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    expect(screen.getAllByText(/run npm run dev from the project folder/i)).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Save key" })).toBeDisabled();
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
    expect(await screen.findByTitle("Live open-slide preview")).toHaveAttribute(
      "src",
      "http://127.0.0.1:5317"
    );

    fireEvent.click(screen.getByRole("button", { name: "Export HTML" }));

    await waitFor(() => {
      expect(window.idrisSlides?.exportProject).toHaveBeenCalledWith(
        expect.objectContaining({ id: "project-1" }),
        "html"
      );
    });

    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Make this more executive" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("More executive and metric-led.")).toBeInTheDocument();
    expect(screen.getByText("Deck updated and saved locally.")).toBeInTheDocument();
    expect(window.idrisSlides?.saveGeminiApiKey).toHaveBeenCalledWith("test-key");
    expect(window.idrisSlides?.generateOutline).toHaveBeenCalledWith(
      "Create a 5 slide deck about market expansion"
    );
    expect(window.idrisSlides?.createDeckFromOutline).toHaveBeenCalled();
    expect(window.idrisSlides?.startPreview).toHaveBeenCalledWith(expect.objectContaining({ id: "project-1" }));
    expect(window.idrisSlides?.editDeck).toHaveBeenCalledWith(
      expect.objectContaining({ id: "project-1" }),
      "Make this more executive"
    );
  });
});
