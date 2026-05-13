import { useEffect, useState } from "react";
import {
  FolderOpen,
  Home,
  KeyRound,
  Monitor,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings
} from "lucide-react";
import { ChatPanel } from "./components/ChatPanel";
import { PreviewPane } from "./components/PreviewPane";
import type { ProjectMetadata } from "@idris-slides/project";
import type { AppSettings, ChatMessage, DeckOutline } from "../shared/types";
import { applyOutlineTextEdit } from "./editPaths";
import "./styles.css";

const initialSettings: AppSettings = { hasGeminiApiKey: false };
const bridgeUnavailableMessage =
  "This is a browser or file preview. Run npm run dev from the project folder and use the Electron window to save Gemini keys.";

function createMessageId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function cacheBustSlideModuleUrl(slideModuleUrl: string): string {
  const url = new URL(slideModuleUrl);

  if (url.protocol === "data:") {
    url.hash = `idrisReload=${Date.now()}`;
    return url.toString();
  }

  url.searchParams.set("idrisReload", String(Date.now()));
  return url.toString();
}

export function App() {
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [tavilyApiKey, setTavilyApiKey] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [projectsCollapsed, setProjectsCollapsed] = useState(false);
  const [activeProject, setActiveProject] = useState<ProjectMetadata | null>(null);
  const [slideModuleUrl, setSlideModuleUrl] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDesktopBridgeAvailable = Boolean(window.idrisSlides);
  const hasActiveProject = Boolean(activeProject);

  useEffect(() => {
    if (window.idrisSlides) {
      void window.idrisSlides.getSettings().then(setSettings);
      void refreshProjects();
    }
  }, []);

  async function refreshProjects(): Promise<void> {
    if (!window.idrisSlides) {
      return;
    }

    setProjects(await window.idrisSlides.listProjects());
  }

  async function saveKey(): Promise<void> {
    if (!window.idrisSlides) {
      setError(bridgeUnavailableMessage);
      return;
    }

    setError(null);
    let nextSettings = settings;
    if (apiKey.trim()) {
      nextSettings = await window.idrisSlides.saveGeminiApiKey(apiKey);
    }
    if (tavilyApiKey.trim()) {
      nextSettings = await window.idrisSlides.saveTavilyApiKey(tavilyApiKey);
    }
    setSettings(nextSettings);
    setApiKey("");
    setTavilyApiKey("");
    setSettingsOpen(false);
  }

  async function generateOutlineForPrompt(prompt: string, useWebResearch: boolean): Promise<void> {
    setLastPrompt(prompt);
    const outline: DeckOutline = useWebResearch
      ? await window.idrisSlides!.generateOutline(prompt, { useWebResearch: true })
      : await window.idrisSlides!.generateOutline(prompt);
    setMessages((current) => [
      ...current,
      {
        id: createMessageId(),
        role: "assistant",
        content: useWebResearch ? "Outline ready for review with Tavily research." : "Outline ready for review.",
        outline
      }
    ]);
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
    setMessages((current) => [...current, userMessage]);
    setIsGenerating(true);
    setError(null);

    try {
      if (activeProject) {
        const project = await window.idrisSlides.editDeck(activeProject, trimmed);
        updateActiveProject(project);
        setSlideModuleUrl((current) => (current ? cacheBustSlideModuleUrl(current) : current));
        setMessages((current) => [
          ...current,
          {
            id: createMessageId(),
            role: "assistant",
            content: project.outline?.summary ?? "Deck updated and saved locally."
          },
          {
            id: createMessageId(),
            role: "system",
            content: "Deck updated and saved locally."
          }
        ]);
      } else {
        const generationMode = await window.idrisSlides.classifyPrompt(trimmed);

        if (generationMode.mode === "research_confirm") {
          setMessages((current) => [
            ...current,
            {
              id: createMessageId(),
              role: "assistant",
              content:
                generationMode.researchRecommendation ??
                "This deck would benefit from current web context. Search with Tavily before drafting?",
              researchPrompt: trimmed
            }
          ]);
          return;
        }

        const requiredQuestion = generationMode.requiredQuestion;

        if (generationMode.mode === "brief_needed" && requiredQuestion) {
          setMessages((current) => [
            ...current,
            {
              id: createMessageId(),
              role: "assistant",
              content: requiredQuestion
            }
          ]);
          return;
        }

        await generateOutlineForPrompt(trimmed, false);
      }
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

  async function respondToResearchPrompt(prompt: string, useWebResearch: boolean): Promise<void> {
    if (!window.idrisSlides) {
      setError(bridgeUnavailableMessage);
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      await generateOutlineForPrompt(prompt, useWebResearch);
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

  function updateActiveProject(project: ProjectMetadata): void {
    setActiveProject(project);
    setProjects((current) => [project, ...current.filter((item) => item.id !== project.id)]);
  }

  async function startPreview(project: ProjectMetadata): Promise<void> {
    if (!window.idrisSlides) {
      setError(bridgeUnavailableMessage);
      return;
    }

    setIsPreviewing(true);
    setError(null);

    try {
      const session = await window.idrisSlides.startPreview(project);
      setSlideModuleUrl(session.slideModuleUrl);
    } catch (caught) {
      const detail = caught instanceof Error ? caught.message : "Unable to start live preview.";
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
      setIsPreviewing(false);
    }
  }

  async function approveOutline(outline: DeckOutline): Promise<void> {
    if (!window.idrisSlides) {
      setError(bridgeUnavailableMessage);
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const project = await window.idrisSlides.createDeckFromOutline(lastPrompt, outline);
      updateActiveProject(project);
      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: "system",
          content: "Deck created and saved locally."
        }
      ]);
      await startPreview(project);
      await refreshProjects();
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

  async function chooseWorkspaceRoot(): Promise<void> {
    if (!window.idrisSlides) {
      setError(bridgeUnavailableMessage);
      return;
    }

    setError(null);
    setSettings(await window.idrisSlides.chooseWorkspaceRoot());
    setActiveProject(null);
    setSlideModuleUrl(null);
    setMessages([]);
    await refreshProjects();
  }

  async function openProject(project: ProjectMetadata): Promise<void> {
    updateActiveProject(project);
    setMessages([]);
    await startPreview(project);
  }

  function goHome(): void {
    setActiveProject(null);
    setSlideModuleUrl(null);
    setMessages([]);
  }

  async function saveTextEdit(path: string, value: string): Promise<void> {
    if (!activeProject?.outline || !window.idrisSlides) {
      return;
    }

    const outline = applyOutlineTextEdit(activeProject.outline, path, value);
    setError(null);

    try {
      const project = await window.idrisSlides.saveDeckOutline(activeProject, outline);
      updateActiveProject(project);
      const session = await window.idrisSlides.startPreview(project);
      setSlideModuleUrl(cacheBustSlideModuleUrl(session.slideModuleUrl));
    } catch (caught) {
      const detail = caught instanceof Error ? caught.message : "Unable to save slide edit.";
      setError(detail);
      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: "system",
          content: detail
        }
      ]);
    }
  }

  async function exportProject(kind: "pdf" | "html" | "pptx"): Promise<void> {
    if (!activeProject || !window.idrisSlides) {
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      const project = await window.idrisSlides.exportProject(activeProject, kind);
      updateActiveProject(project);
      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: "system",
          content: `Exported ${kind.toUpperCase()}.`
        }
      ]);
    } catch (caught) {
      const detail = caught instanceof Error ? caught.message : `Unable to export ${kind}.`;
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
      setIsExporting(false);
    }
  }

  return (
    <div
      className={`appShell ${hasActiveProject ? "hasProject" : "isIntro"} ${
        projectsCollapsed ? "projectsCollapsed" : ""
      }`}
    >
      <header className="topBar">
        <div className="topBarIdentity">
          <h1>{activeProject?.name ?? "Idris Slides"}</h1>
          <span>{activeProject ? "Deck workspace" : "New deck"}</span>
        </div>
        <div className="topBarActions">
          {activeProject ? (
            <button className="toolbarButton" type="button" onClick={goHome}>
              <Home size={16} aria-hidden="true" />
              <span>Home</span>
            </button>
          ) : null}
          <button className="toolbarButton" type="button" onClick={() => setSettingsOpen(true)}>
            <Settings size={16} aria-hidden="true" />
            <span>Settings</span>
          </button>
        </div>
      </header>
      {!isDesktopBridgeAvailable ? (
        <div className="bridgeNotice">
          <Monitor size={16} aria-hidden="true" />
          <span>{bridgeUnavailableMessage}</span>
        </div>
      ) : null}
      <div className="workspace">
        <aside className="projectSidebar" aria-label="Projects">
          <div className="projectSidebarHeader">
            {!projectsCollapsed ? (
              <>
                <div>
                  <p className="panelEyebrow">Workspace</p>
                  <strong>Projects</strong>
                </div>
                <button
                  aria-label="Collapse projects sidebar"
                  className="sidebarIconButton"
                  type="button"
                  onClick={() => setProjectsCollapsed(true)}
                >
                  <PanelLeftClose size={16} aria-hidden="true" />
                </button>
              </>
            ) : (
              <button
                aria-label="Expand projects sidebar"
                className="sidebarIconButton"
                type="button"
                onClick={() => setProjectsCollapsed(false)}
              >
                <PanelLeftOpen size={16} aria-hidden="true" />
              </button>
            )}
          </div>
          {!projectsCollapsed ? (
            <>
              <button className="projectAction" type="button" onClick={goHome}>
                <Plus size={16} aria-hidden="true" />
                <span>New deck</span>
              </button>
              <button
                aria-label="Change workspace folder"
                className="workspacePath"
                type="button"
                onClick={() => void chooseWorkspaceRoot()}
              >
                <FolderOpen size={15} aria-hidden="true" />
                <span>{settings.workspaceRoot ?? "Choose workspace"}</span>
              </button>
              <div className="projectList" aria-label="Recent projects">
                <p className="panelEyebrow">Recents</p>
                {projects.length > 0 ? (
                  projects.map((project) => (
                    <button
                      aria-label={`Open ${project.name}`}
                      className={`projectItem ${activeProject?.id === project.id ? "activeProject" : ""}`}
                      key={project.id}
                      type="button"
                      onClick={() => void openProject(project)}
                    >
                      <strong>{project.name}</strong>
                      <span>{project.slideCount ? `${project.slideCount} slides` : "Deck project"}</span>
                    </button>
                  ))
                ) : (
                  <span className="emptyProjects">No saved projects yet.</span>
                )}
              </div>
            </>
          ) : (
            <>
              <button aria-label="New deck" className="sidebarIconButton" type="button" onClick={goHome}>
                <Plus size={16} aria-hidden="true" />
              </button>
              <button
                aria-label="Change workspace folder"
                className="sidebarIconButton"
                type="button"
                onClick={() => void chooseWorkspaceRoot()}
              >
                <FolderOpen size={16} aria-hidden="true" />
              </button>
            </>
          )}
        </aside>
        {activeProject ? (
          <main className="deckStage">
            <PreviewPane
              isExporting={isExporting}
              isPreviewing={isPreviewing}
              onExport={(kind) => void exportProject(kind)}
              onTextEdit={(path, value) => void saveTextEdit(path, value)}
              slideModuleUrl={slideModuleUrl}
              project={activeProject}
            />
            <ChatPanel
              canSend={isDesktopBridgeAvailable && settings.hasGeminiApiKey}
              isGenerating={isGenerating}
              message={message}
              messages={messages}
              mode="dock"
              onMessageChange={setMessage}
              onApproveOutline={(outline) => void approveOutline(outline)}
              onUseResearch={(prompt) => void respondToResearchPrompt(prompt, true)}
              onSkipResearch={(prompt) => void respondToResearchPrompt(prompt, false)}
              onSubmit={() => void submitPrompt()}
            />
          </main>
        ) : (
          <ChatPanel
            canSend={isDesktopBridgeAvailable && settings.hasGeminiApiKey}
            isGenerating={isGenerating}
            message={message}
            messages={messages}
            mode="intro"
            onMessageChange={setMessage}
            onApproveOutline={(outline) => void approveOutline(outline)}
            onUseResearch={(prompt) => void respondToResearchPrompt(prompt, true)}
            onSkipResearch={(prompt) => void respondToResearchPrompt(prompt, false)}
            onSubmit={() => void submitPrompt()}
          />
        )}
      </div>
      {settingsOpen ? (
        <div className="modalBackdrop" role="presentation">
          <section aria-label="Settings" aria-modal="true" className="settingsModal" role="dialog">
            <div className="modalHeader">
              <div>
                <h2>Settings</h2>
                <p>Connect Gemini for outline generation and deck revisions.</p>
              </div>
              <KeyRound size={18} aria-hidden="true" />
            </div>
            <label className="settingsField">
              <span>Gemini API Key</span>
              <input
                autoComplete="off"
                aria-label="Gemini API key"
                name="gemini-api-key"
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="AIza…"
                spellCheck={false}
                type="password"
                value={apiKey}
              />
            </label>
            <label className="settingsField">
              <span>Tavily API Key</span>
              <input
                autoComplete="off"
                aria-label="Tavily API key"
                name="tavily-api-key"
                onChange={(event) => setTavilyApiKey(event.target.value)}
                placeholder="tvly-..."
                spellCheck={false}
                type="password"
                value={tavilyApiKey}
              />
            </label>
            <div className="settingsField">
              <span>Project workspace</span>
              <button
                aria-label="Change workspace folder"
                className="workspaceSettingsButton"
                disabled={!isDesktopBridgeAvailable}
                type="button"
                onClick={() => void chooseWorkspaceRoot()}
              >
                <FolderOpen size={15} aria-hidden="true" />
                <span>{settings.workspaceRoot ?? "Choose workspace"}</span>
              </button>
            </div>
            {error ? <p className="errorText">{error}</p> : null}
            {!isDesktopBridgeAvailable ? (
              <p className="bridgeHelp">{bridgeUnavailableMessage}</p>
            ) : null}
            <div className="modalActions">
              <button type="button" onClick={() => setSettingsOpen(false)}>
                Cancel
              </button>
              <button
                className="primaryButton"
                type="button"
                disabled={!isDesktopBridgeAvailable}
                onClick={() => void saveKey()}
              >
                Save API Key
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
