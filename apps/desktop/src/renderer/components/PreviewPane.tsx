import type { ProjectMetadata } from "@idris-slides/project";

type PreviewPaneProps = {
  project: ProjectMetadata | null;
  previewUrl: string | null;
  isPreviewing: boolean;
  isExporting: boolean;
  onExport(kind: "pdf" | "html"): void;
};

export function PreviewPane({
  isExporting,
  isPreviewing,
  onExport,
  previewUrl,
  project
}: PreviewPaneProps) {
  return (
    <main className="previewPane">
      <div className="previewHeader">
        <h2>Live Preview</h2>
        <div className="previewActions">
          <button type="button" disabled={!project || isExporting} onClick={() => onExport("pdf")}>
            Export PDF
          </button>
          <button type="button" disabled={!project || isExporting} onClick={() => onExport("html")}>
            Export HTML
          </button>
        </div>
      </div>
      <div className="slideFrame">
        {previewUrl ? (
          <iframe className="previewWebview" src={previewUrl} title="Live open-slide preview" />
        ) : project ? (
          <div className="slideCanvas activeSlideCanvas">
            <div>
              <p className="slideEyebrow">Solutions deck</p>
              <h3>{project.name}</h3>
              <p>
                {isPreviewing
                  ? "Starting open-slide live preview..."
                  : project.outline?.summary ?? "Branded open-slide deck generated locally."}
              </p>
            </div>
            <div className="slideAccentBar">
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        ) : (
          <div className="slideCanvas">Create a project to preview branded slides.</div>
        )}
      </div>
    </main>
  );
}
