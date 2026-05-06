import type { ProjectMetadata } from "@idris-slides/project";

type PreviewPaneProps = {
  project: ProjectMetadata | null;
};

export function PreviewPane({ project }: PreviewPaneProps) {
  return (
    <main className="previewPane">
      <div className="previewHeader">
        <h2>Live Preview</h2>
        <div className="previewActions">
          <button type="button" disabled={!project}>
            Export PDF
          </button>
          <button type="button" disabled={!project}>
            Export HTML
          </button>
        </div>
      </div>
      <div className="slideFrame">
        {project ? (
          <div className="slideCanvas activeSlideCanvas">
            <div>
              <p className="slideEyebrow">Solutions deck</p>
              <h3>{project.name}</h3>
              <p>{project.outline?.summary ?? "Branded open-slide deck generated locally."}</p>
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
