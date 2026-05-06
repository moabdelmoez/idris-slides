import type { ChatMessage, DeckOutline } from "../../shared/types";

type ChatPanelProps = {
  messages: ChatMessage[];
  message: string;
  status: string;
  canSend: boolean;
  isGenerating: boolean;
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
  onMessageChange,
  onApproveOutline,
  onSubmit
}: ChatPanelProps) {
  return (
    <aside className="chatPanel" aria-label="AI Chat">
      <div className="chatHeader">
        <h2>AI Chat</h2>
        <span className={canSend ? "statusReady" : "statusMissing"}>{status}</span>
      </div>
      <div className="chatBody">
        {messages.length === 0 ? (
          <p className="emptyChat">Describe the deck you want. Gemini will draft an outline first.</p>
        ) : (
          messages.map((item) => (
            <article className={`chatMessage ${item.role}`} key={item.id}>
              <p>{item.content}</p>
              {item.outline ? (
                <div className="outlineCard">
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
                    className="approveOutlineButton"
                    disabled={isGenerating}
                    onClick={() => onApproveOutline(item.outline as DeckOutline)}
                    type="button"
                  >
                    Approve outline
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
        <input
          aria-label="Message"
          disabled={!canSend || isGenerating}
          onChange={(event) => onMessageChange(event.target.value)}
          value={message}
        />
        <button type="submit" disabled={!canSend || isGenerating || !message.trim()}>
          {isGenerating ? "Thinking" : "Send"}
        </button>
      </form>
    </aside>
  );
}
