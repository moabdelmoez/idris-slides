// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import * as React from "react";
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
      saveDeckOutline: vi.fn().mockImplementation((_project, outline) =>
        Promise.resolve({
          id: "project-1",
          name: outline.title,
          createdAt: "2026-05-06T00:00:00.000Z",
          updatedAt: "2026-05-06T00:03:00.000Z",
          deckPath: "/tmp/idris/project-1/deck",
          exports: [],
          sourcePrompt: "Create a 5 slide deck about market expansion",
          slideCount: outline.slides.length,
          outline
        })
      ),
      startPreview: vi.fn().mockResolvedValue({
        projectId: "project-1",
        url: "http://127.0.0.1:5317",
        slideModuleUrl:
          "data:text/javascript,export%20default%20%5Bfunction%20PreviewTestPage()%20%7B%20return%20null%3B%20%7D%5D%3B#initial=1"
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
            kind: "pptx",
            path: "/tmp/idris/project-1/exports/deck.pptx",
            createdAt: "2026-05-06T00:02:00.000Z"
          }
        ],
        sourcePrompt: "Create a 5 slide deck about market expansion",
        slideCount: 1
      }),
      listProjects: vi.fn().mockResolvedValue([]),
      chooseWorkspaceRoot: vi.fn().mockResolvedValue({
        hasGeminiApiKey: false,
        workspaceRoot: "/tmp/idris-workspace"
      }),
      getSettings: vi.fn().mockResolvedValue({ hasGeminiApiKey: false, workspaceRoot: "/tmp/idris-workspace" }),
      saveGeminiApiKey: vi.fn().mockResolvedValue({
        hasGeminiApiKey: true,
        workspaceRoot: "/tmp/idris-workspace"
      }),
      saveTavilyApiKey: vi.fn().mockResolvedValue({
        hasGeminiApiKey: true,
        hasTavilyApiKey: true,
        workspaceRoot: "/tmp/idris-workspace"
      }),
      classifyPrompt: vi.fn().mockResolvedValue({
        mode: "deck_outline",
        confidence: "medium"
      }),
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
    expect(screen.getByRole("button", { name: "Collapse projects sidebar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New deck" })).toBeInTheDocument();
    expect(screen.getByText("What slides should Idris build?")).toBeInTheDocument();
    expect(screen.getByLabelText("Deck command")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add context" })).toBeInTheDocument();
    expect(screen.getByTitle("Gemini model: Gemini 2.5 Flash")).toBeInTheDocument();
    expect(screen.queryByText("Plain chat now, document import later")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Deck command").tagName).toBe("TEXTAREA");
  });

  it("asks for confirmation before using Tavily research", async () => {
    window.idrisSlides = {
      ...(window.idrisSlides as IdrisSlidesApi),
      getSettings: vi.fn().mockResolvedValue({
        hasGeminiApiKey: true,
        hasTavilyApiKey: true,
        workspaceRoot: "/tmp/idris-workspace"
      }),
      classifyPrompt: vi.fn().mockResolvedValue({
        mode: "research_confirm",
        confidence: "high",
        researchRecommendation: "Use Tavily to ground current market facts."
      })
    };

    render(<App />);

    fireEvent.change(screen.getByLabelText("Deck command"), {
      target: { value: "Create a deck about the Saudi telecom market in 2026" }
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Send" })).toBeEnabled();
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText(/Use Tavily to ground current market facts/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Search with Tavily" }));

    expect(await screen.findByText("Market Expansion")).toBeInTheDocument();
    expect(window.idrisSlides?.generateOutline).toHaveBeenCalledWith(
      "Create a deck about the Saudi telecom market in 2026",
      { useWebResearch: true }
    );
  });

  it("explains when the renderer is opened without the Electron bridge", () => {
    window.idrisSlides = undefined;

    render(<App />);

    expect(screen.getByText(/browser or file preview/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    expect(screen.getAllByText(/run npm run dev from the project folder/i)).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Save API Key" })).toBeDisabled();
  });

  it("saves a Gemini API key and generates an outline from chat", async () => {
    render(<App />);

    expect(screen.queryByText("Gemini API key required")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.change(screen.getByLabelText("Gemini API key"), {
      target: { value: "test-key" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save API Key" }));

    await waitFor(() => {
      expect(window.idrisSlides?.saveGeminiApiKey).toHaveBeenCalledWith("test-key");
    });
    expect(screen.queryByText("Gemini ready")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Deck command"), {
      target: { value: "Create a 5 slide deck about market expansion" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("Market Expansion")).toBeInTheDocument();
    expect(screen.getByText("Opportunity")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Approve outline" })).toBeEnabled();
    });
    fireEvent.click(screen.getByRole("button", { name: "Approve outline" }));

    expect(await screen.findByText("Preview")).toBeInTheDocument();
    expect(await screen.findByText("Deck preview loaded.")).toBeInTheDocument();
    expect(screen.queryByTitle("Live deck preview")).not.toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Export PDF" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export PowerPoint" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Export HTML" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Export PowerPoint" }));

    await waitFor(() => {
      expect(window.idrisSlides?.exportProject).toHaveBeenCalledWith(
        expect.objectContaining({ id: "project-1" }),
        "pptx"
      );
    });

    fireEvent.change(screen.getByLabelText("Deck command"), {
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

  it("opens saved projects from the sidebar and returns home", async () => {
    window.idrisSlides = {
      ...(window.idrisSlides as IdrisSlidesApi),
      listProjects: vi.fn().mockResolvedValue([
        {
          id: "saved-project",
          name: "Saved Deck",
          createdAt: "2026-05-06T00:00:00.000Z",
          updatedAt: "2026-05-07T00:00:00.000Z",
          deckPath: "/tmp/idris/saved-project/deck",
          exports: [],
          slideCount: 2
        }
      ])
    };

    render(<App />);

    const savedProjectButton = await screen.findByRole("button", { name: /Open Saved Deck/ });

    expect(savedProjectButton).toHaveTextContent("Saved Deck");
    expect(savedProjectButton).toHaveTextContent("2 slides");

    fireEvent.click(savedProjectButton);

    expect(await screen.findByText("Deck preview loaded.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Saved Deck" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Home" }));

    expect(screen.getByRole("heading", { name: "Idris Slides" })).toBeInTheDocument();
    expect(screen.getByText("What slides should Idris build?")).toBeInTheDocument();
  });

  it("changes the workspace directory from the sidebar", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Change workspace folder" }));

    await waitFor(() => {
      expect(window.idrisSlides?.chooseWorkspaceRoot).toHaveBeenCalled();
      expect(window.idrisSlides?.listProjects).toHaveBeenCalledTimes(2);
    });
  });

  it("scrolls chat to the newest message", async () => {
    const scrollIntoView = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView;

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.change(screen.getByLabelText("Gemini API key"), {
      target: { value: "test-key" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save API Key" }));

    await waitFor(() => {
      expect(window.idrisSlides?.saveGeminiApiKey).toHaveBeenCalledWith("test-key");
    });

    fireEvent.change(screen.getByLabelText("Deck command"), {
      target: { value: "Create one-slide deck contains Mostafa" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await screen.findByText("Market Expansion");
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it("navigates a multi-slide preview with visible controls", async () => {
    window.idrisSlides = {
      ...(window.idrisSlides as IdrisSlidesApi),
      startPreview: vi.fn().mockResolvedValue({
        projectId: "project-1",
        url: "http://127.0.0.1:5317",
        slideModuleUrl:
          "data:text/javascript,export%20default%20%5Bfunction%20SlideOne()%20%7B%20return%20null%3B%20%7D%2Cfunction%20SlideTwo()%20%7B%20return%20null%3B%20%7D%5D%3B#initial=1"
      })
    };

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.change(screen.getByLabelText("Gemini API key"), {
      target: { value: "test-key" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save API Key" }));

    await waitFor(() => {
      expect(window.idrisSlides?.saveGeminiApiKey).toHaveBeenCalledWith("test-key");
    });

    fireEvent.change(screen.getByLabelText("Deck command"), {
      target: { value: "Create a 2 slide deck" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    fireEvent.click(await screen.findByRole("button", { name: "Approve outline" }));

    expect(await screen.findByText("1 / 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous slide" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Next slide" }));

    expect(screen.getByText("2 / 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next slide" })).toBeDisabled();
  });

  it("opens the current preview slide in a fullscreen overlay", async () => {
    window.idrisSlides = {
      ...(window.idrisSlides as IdrisSlidesApi),
      startPreview: vi.fn().mockResolvedValue({
        projectId: "project-1",
        url: "http://127.0.0.1:5317",
        slideModuleUrl:
          "data:text/javascript,export%20default%20%5Bfunction%20SlideOne()%20%7B%20return%20null%3B%20%7D%2Cfunction%20SlideTwo()%20%7B%20return%20null%3B%20%7D%5D%3B#initial=1"
      })
    };

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.change(screen.getByLabelText("Gemini API key"), {
      target: { value: "test-key" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save API Key" }));

    await waitFor(() => {
      expect(window.idrisSlides?.saveGeminiApiKey).toHaveBeenCalledWith("test-key");
    });

    fireEvent.change(screen.getByLabelText("Deck command"), {
      target: { value: "Create a 2 slide deck" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    fireEvent.click(await screen.findByRole("button", { name: "Approve outline" }));

    await screen.findByText("1 / 2");
    fireEvent.click(screen.getByRole("button", { name: "Next slide" }));
    fireEvent.click(screen.getByRole("button", { name: "Fullscreen preview" }));

    const dialog = screen.getByRole("dialog", { name: "Fullscreen preview" });
    expect(within(dialog).getByText("2 / 2")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Previous slide" }));
    expect(within(dialog).getByText("1 / 2")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Fullscreen preview" })).not.toBeInTheDocument();
  });

  it("commits direct text edits from the preview into the deck outline", async () => {
    window.React = React;
    window.idrisSlides = {
      ...(window.idrisSlides as IdrisSlidesApi),
      createDeckFromOutline: vi.fn().mockResolvedValue({
        id: "project-1",
        name: "Market Expansion",
        createdAt: "2026-05-06T00:00:00.000Z",
        updatedAt: "2026-05-06T00:00:00.000Z",
        deckPath: "/tmp/idris/project-1/deck",
        exports: [],
        sourcePrompt: "Create a 1 slide deck",
        slideCount: 1,
        outline: {
          title: "Market Expansion",
          summary: "A branded outline for expansion planning.",
          slides: [
            {
              title: "Opportunity",
              content: "Priority markets create a clear expansion path.",
              goal: "Frame the growth opportunity.",
              layout: "Title slide",
              visualDirection: "Use purple background with coral emphasis."
            }
          ]
        }
      }),
      startPreview: vi.fn().mockResolvedValue({
        projectId: "project-1",
        url: "http://127.0.0.1:5317",
        slideModuleUrl:
          "data:text/javascript,export%20default%20%5Bfunction%20Slide()%20%7B%20return%20window.React.createElement(%22h1%22%2C%20%7B%22data-idris-edit-path%22%3A%22slides.0.title%22%2C%20style%3A%20%7Bcolor%3A%20%22rgb(255%2C%20255%2C%20255)%22%2C%20fontSize%3A%20%2232px%22%2C%20lineHeight%3A%20%221.3%22%7D%7D%2C%20%22Opportunity%22)%3B%20%7D%5D%3B"
      })
    };

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.change(screen.getByLabelText("Gemini API key"), {
      target: { value: "test-key" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save API Key" }));

    await waitFor(() => {
      expect(window.idrisSlides?.saveGeminiApiKey).toHaveBeenCalledWith("test-key");
    });

    fireEvent.change(screen.getByLabelText("Deck command"), {
      target: { value: "Create a 1 slide deck" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    fireEvent.click(await screen.findByRole("button", { name: "Approve outline" }));

    await screen.findByText("Deck preview loaded.");
    const editableTitle = document.querySelector("[data-idris-edit-path='slides.0.title']") as HTMLElement;
    expect(editableTitle).toBeInstanceOf(HTMLElement);
    fireEvent.doubleClick(editableTitle);

    const inlineEditor = screen.getByLabelText("Edit slide text");
    expect(inlineEditor.tagName).toBe("TEXTAREA");
    expect(inlineEditor).toHaveStyle({
      color: "rgb(255, 255, 255)",
      fontSize: "32px",
      lineHeight: "1.3"
    });
    fireEvent.change(inlineEditor, { target: { value: "Executive Opportunity" } });
    fireEvent.keyDown(inlineEditor, { key: "Enter" });

    await waitFor(() => {
      expect(window.idrisSlides?.saveDeckOutline).toHaveBeenCalledWith(
        expect.objectContaining({ id: "project-1" }),
        expect.objectContaining({
          slides: [
            expect.objectContaining({
              title: "Executive Opportunity"
            })
          ]
        })
      );
    });
    await waitFor(() => {
      expect(window.idrisSlides?.startPreview).toHaveBeenCalledTimes(2);
    });
  });

  it("cache-busts the slide module after deck edits instead of relying on Vite page reloads", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.change(screen.getByLabelText("Gemini API key"), {
      target: { value: "test-key" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save API Key" }));

    await waitFor(() => {
      expect(window.idrisSlides?.saveGeminiApiKey).toHaveBeenCalledWith("test-key");
    });

    fireEvent.change(screen.getByLabelText("Deck command"), {
      target: { value: "Create one-slide deck contains Mostafa" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    fireEvent.click(await screen.findByRole("button", { name: "Approve outline" }));

    expect(await screen.findByText("Deck preview loaded.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Deck command"), {
      target: { value: "Make the title larger" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => {
      expect(
        consoleSpy.mock.calls.some(([message]) =>
          String(message).includes("[IDRIS-DEBUG preview-import-start]") && String(message).includes("idrisReload=")
        )
      ).toBe(true);
    });
  });

  it("keeps the preview and docked chat available after many messages", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.change(screen.getByLabelText("Gemini API key"), {
      target: { value: "test-key" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save API Key" }));

    await waitFor(() => {
      expect(window.idrisSlides?.saveGeminiApiKey).toHaveBeenCalledWith("test-key");
    });

    fireEvent.change(screen.getByLabelText("Deck command"), {
      target: { value: "Create one-slide deck contains Mostafa" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    fireEvent.click(await screen.findByRole("button", { name: "Approve outline" }));

    expect(await screen.findByText("Deck preview loaded.")).toBeInTheDocument();
    expect(screen.getByLabelText("Command panel")).toHaveClass("dockPanel");
    expect(screen.getByLabelText("Deck command")).toBeInTheDocument();
    expect(screen.queryByText("Conversation")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Command" })).not.toBeInTheDocument();

    for (let index = 0; index < 8; index += 1) {
      fireEvent.change(screen.getByLabelText("Deck command"), {
        target: { value: `Make revision ${index}` }
      });
      fireEvent.click(screen.getByRole("button", { name: "Send" }));
      await waitFor(() => {
        expect(screen.getAllByText("More executive and metric-led.").length).toBeGreaterThan(index);
      });
    }

    expect(await screen.findByText("Deck preview loaded.")).toBeInTheDocument();
    expect(screen.getByLabelText("Deck command")).toBeInTheDocument();
  });
});
