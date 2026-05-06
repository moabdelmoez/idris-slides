import { useEffect, useMemo, useState } from "react";
import { ChatPanel } from "./components/ChatPanel";
import { PreviewPane } from "./components/PreviewPane";
import { ProjectSidebar } from "./components/ProjectSidebar";
import type { ProjectMetadata } from "@idris-slides/project";
import type { AppSettings, ChatMessage, DeckOutline } from "../shared/types";
import "./styles.css";

const initialSettings: AppSettings = { hasGeminiApiKey: false };

function createMessageId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export function App() {
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [activeProject, setActiveProject] = useState<ProjectMetadata | null>(null);
  const [lastPrompt, setLastPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void window.idrisSlides?.getSettings().then(setSettings);
  }, []);

  const chatStatus = useMemo(() => {
    if (settings.hasGeminiApiKey) {
      return "Gemini ready";
    }

    return "Gemini API key required";
  }, [settings.hasGeminiApiKey]);

  async function saveKey(): Promise<void> {
    if (!window.idrisSlides) {
      setError("Desktop bridge is unavailable.");
      return;
    }

    setError(null);
    setSettings(await window.idrisSlides.saveGeminiApiKey(apiKey));
    setApiKey("");
    setSettingsOpen(false);
  }

  async function submitPrompt(): Promise<void> {
    const trimmed = message.trim();

    if (!trimmed || !window.idrisSlides) {
      return;
    }

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: "user",
      content: trimmed
    };

    setMessage("");
    setLastPrompt(trimmed);
    setMessages((current) => [...current, userMessage]);
    setIsGenerating(true);
    setError(null);

    try {
      const outline: DeckOutline = await window.idrisSlides.generateOutline(trimmed);
      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: "assistant",
          content: "Outline ready for review.",
          outline
        }
      ]);
    } catch (caught) {
      const detail = caught instanceof Error ? caught.message : "Unable to generate outline.";
      setError(detail);
      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: "system",
          content: detail
        }
      ]);
    } finally {
      setIsGenerating(false);
    }
  }

  async function approveOutline(outline: DeckOutline): Promise<void> {
    if (!window.idrisSlides) {
      setError("Desktop bridge is unavailable.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const project = await window.idrisSlides.createDeckFromOutline(lastPrompt, outline);
      setActiveProject(project);
      setProjects((current) => [project, ...current.filter((item) => item.id !== project.id)]);
      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: "system",
          content: "Deck created and saved locally."
        }
      ]);
    } catch (caught) {
      const detail = caught instanceof Error ? caught.message : "Unable to create deck.";
      setError(detail);
      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: "system",
          content: detail
        }
      ]);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="appShell">
      <header className="topBar">
        <h1>Idris Slides</h1>
        <div className="topBarActions">
          <button type="button" onClick={() => setSettingsOpen(true)}>
            Settings
          </button>
          <button type="button">Light</button>
        </div>
      </header>
      <div className="workspace">
        <ProjectSidebar projects={projects} activeProjectId={activeProject?.id ?? null} />
        <PreviewPane project={activeProject} />
        <ChatPanel
          canSend={settings.hasGeminiApiKey}
          isGenerating={isGenerating}
          message={message}
          messages={messages}
          onMessageChange={setMessage}
          onApproveOutline={(outline) => void approveOutline(outline)}
          onSubmit={() => void submitPrompt()}
          status={chatStatus}
        />
      </div>
      {settingsOpen ? (
        <div className="modalBackdrop" role="presentation">
          <section aria-label="Settings" className="settingsModal">
            <h2>Settings</h2>
            <label>
              Gemini API key
              <input
                aria-label="Gemini API key"
                onChange={(event) => setApiKey(event.target.value)}
                type="password"
                value={apiKey}
              />
            </label>
            {error ? <p className="errorText">{error}</p> : null}
            <div className="modalActions">
              <button type="button" onClick={() => setSettingsOpen(false)}>
                Cancel
              </button>
              <button type="button" onClick={() => void saveKey()}>
                Save key
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
