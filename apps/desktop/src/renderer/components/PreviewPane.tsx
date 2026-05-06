export function PreviewPane() {
  return (
    <main className="previewPane">
      <div className="previewHeader">
        <h2>Live Preview</h2>
        <div className="previewActions">
          <button type="button" disabled>
            Export PDF
          </button>
          <button type="button" disabled>
            Export HTML
          </button>
        </div>
      </div>
      <div className="slideFrame">
        <div className="slideCanvas">Create a project to preview branded slides.</div>
      </div>
    </main>
  );
}
