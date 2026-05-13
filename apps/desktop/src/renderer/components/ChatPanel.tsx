import { ArrowUp, ChevronDown, Loader2, Plus, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";
import type { ChatMessage, DeckOutline } from "../../shared/types";

type ChatPanelProps = {
  messages: ChatMessage[];
  message: string;
  canSend: boolean;
  isGenerating: boolean;
  mode: "intro" | "dock";
  onMessageChange(message: string): void;
  onApproveOutline(outline: DeckOutline): void;
  onUseResearch(prompt: string): void;
  onSkipResearch(prompt: string): void;
  onSubmit(): void;
};

export function ChatPanel({
  messages,
  message,
  canSend,
  isGenerating,
  mode,
  onMessageChange,
  onApproveOutline,
  onUseResearch,
  onSkipResearch,
  onSubmit
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerPlaceholder = messages.some((item) => item.outline)
    ? "Tell Idris what to change in this deck"
    : "Describe the deck, audience, and source points";

  const hasMessages = messages.length > 0;

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ block: "end" });
    }
  }, [messages]);

  return (
    <section className={`chatPanel ${mode === "intro" ? "introPanel" : "dockPanel"}`} aria-label="Command panel">
      {mode === "intro" ? (
        <div className="introHeader">
          <h2>What slides should Idris build?</h2>
          <p>Describe the client, audience, and source points. Idris drafts the outline before building the deck.</p>
        </div>
      ) : null}
      <div className="chatBody">
        {!hasMessages ? (
          <div className="emptyChat">
            {mode === "dock" ? (
              <>
                <Sparkles size={18} aria-hidden="true" />
                <strong>Ready for revisions</strong>
                <span>Ask for a stronger story, fewer slides, or a more executive tone.</span>
              </>
            ) : (
              <>
                <strong>Try a structured prompt</strong>
                <span>Build a 10-slide client deck for a market-entry recommendation with risks and next steps.</span>
              </>
            )}
          </div>
        ) : (
          <>
            {messages.map((item) => (
              <article className={`chatMessage ${item.role}`} key={item.id}>
                <span className="messageRole">{item.role === "assistant" ? "Idris" : item.role}</span>
                <p>{item.content}</p>
                {item.researchPrompt ? (
                  <div className="researchActions">
                    <button
                      className="primaryButton"
                      disabled={isGenerating}
                      onClick={() => onUseResearch(item.researchPrompt as string)}
                      type="button"
                    >
                      Search with Tavily
                    </button>
                    <button
                      disabled={isGenerating}
                      onClick={() => onSkipResearch(item.researchPrompt as string)}
                      type="button"
                    >
                      Continue without search
                    </button>
                  </div>
                ) : null}
                {item.outline ? (
                  <div className="outlineCard">
                    <div className="outlineHeader">
                      <span>Outline ready</span>
                      <strong>{item.outline.slides.length} slides</strong>
                    </div>
                    <h3>{item.outline.title}</h3>
                    <p>{item.outline.summary}</p>
                    <ol>
                      {item.outline.slides.map((slide) => (
                        <li key={`${item.id}-${slide.title}`}>
                          <strong>{slide.title}</strong>
                          <span>{slide.content ?? slide.goal}</span>
                        </li>
                      ))}
                    </ol>
                    <button
                      className="approveOutlineButton primaryButton"
                      disabled={isGenerating}
                      onClick={() => onApproveOutline(item.outline as DeckOutline)}
                      type="button"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="loadingIcon" size={14} aria-hidden="true" />
                          Building deck
                        </>
                      ) : (
                        "Approve outline"
                      )}
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      <form
        className="chatInput"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        {mode === "intro" ? (
          <button className="addContextButton" type="button" aria-label="Add context">
            <Plus size={18} aria-hidden="true" />
          </button>
        ) : null}
        <textarea
          aria-label="Deck command"
          disabled={!canSend || isGenerating}
          onChange={(event) => onMessageChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSubmit();
            }
          }}
          placeholder={mode === "intro" ? "Ask Idris to create a slide deck…" : composerPlaceholder}
          rows={1}
          value={message}
        />
        <span className="modelChip" title="Gemini model: Gemini 2.5 Flash">
          <span className="modelVersion">2.5</span>
          <span>Flash</span>
          <ChevronDown size={14} aria-hidden="true" />
        </span>
        <button
          aria-label={isGenerating ? "Working" : "Send"}
          className="sendButton"
          type="submit"
          disabled={!canSend || isGenerating || !message.trim()}
        >
          {isGenerating ? (
            <Loader2 className="loadingIcon" size={16} aria-hidden="true" />
          ) : (
            <ArrowUp size={16} aria-hidden="true" />
          )}
        </button>
      </form>
    </section>
  );
}
