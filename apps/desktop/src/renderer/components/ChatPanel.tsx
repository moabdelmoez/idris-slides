import { ArrowUp, FileUp, Loader2, Plus, Sparkles } from "lucide-react";
import type { ChatMessage, DeckOutline } from "../../shared/types";

type ChatPanelProps = {
  messages: ChatMessage[];
  message: string;
  status: string;
  canSend: boolean;
  isGenerating: boolean;
  mode: "intro" | "dock";
  onMessageChange(message: string): void;
  onApproveOutline(outline: DeckOutline): void;
  onSubmit(): void;
};

export function ChatPanel({
  messages,
  message,
  status,
  canSend,
  isGenerating,
  mode,
  onMessageChange,
  onApproveOutline,
  onSubmit
}: ChatPanelProps) {
  const composerPlaceholder = messages.some((item) => item.outline)
    ? "Tell Idris what to change in this deck"
    : "Describe the deck, audience, and source points";

  const hasMessages = messages.length > 0;

  return (
    <section className={`chatPanel ${mode === "intro" ? "introPanel" : "dockPanel"}`} aria-label="Command panel">
      {mode === "intro" ? (
        <div className="introHeader">
          <Sparkles size={22} aria-hidden="true" />
          <h2>What slides should Idris build?</h2>
          <p>Describe the client, audience, and source points. Idris drafts the outline before building the deck.</p>
        </div>
      ) : null}
      {mode === "dock" ? (
        <div className="chatHeader">
          <div>
            <p className="panelEyebrow">Conversation</p>
            <h2>Command</h2>
          </div>
          <span className={canSend ? "statusReady" : "statusMissing"}>{status}</span>
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
          messages.map((item) => (
            <article className={`chatMessage ${item.role}`} key={item.id}>
              <span className="messageRole">{item.role === "assistant" ? "Idris" : item.role}</span>
              <p>{item.content}</p>
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
                        <span>{slide.goal}</span>
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
          ))
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
        <button
          className="importButton"
          aria-label="Import documents, planned"
          disabled
          title="Document import is planned"
          type="button"
        >
          <FileUp size={15} aria-hidden="true" />
          <span>Import</span>
        </button>
        <input
          aria-label="Deck command"
          disabled={!canSend || isGenerating}
          onChange={(event) => onMessageChange(event.target.value)}
          placeholder={mode === "intro" ? "Ask Idris to create a slide deck..." : composerPlaceholder}
          value={message}
        />
        <button className="sendButton" type="submit" disabled={!canSend || isGenerating || !message.trim()}>
          {isGenerating ? (
            <Loader2 className="loadingIcon" size={16} aria-hidden="true" />
          ) : (
            <ArrowUp size={16} aria-hidden="true" />
          )}
          <span>{isGenerating ? "Working" : "Send"}</span>
        </button>
      </form>
      {mode === "intro" ? (
        <div className="composerMeta">
          <span className={canSend ? "statusReady" : "statusMissing"}>{status}</span>
          <span>Plain chat now, document import later</span>
        </div>
      ) : null}
    </section>
  );
}
