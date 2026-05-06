export function ChatPanel() {
  return (
    <aside className="chatPanel" aria-label="AI Chat">
      <h2>AI Chat</h2>
      <div className="chatBody">Gemini outline and editing will appear in the next slice.</div>
      <form className="chatInput">
        <input aria-label="Message" disabled />
        <button type="submit" disabled>
          Send
        </button>
      </form>
    </aside>
  );
}
