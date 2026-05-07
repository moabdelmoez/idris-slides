import { Download, FileCode2, Loader2, Presentation } from "lucide-react";
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
        <div>
          <p className="panelEyebrow">Output</p>
          <h2>Preview</h2>
        </div>
        <div className="previewActions">
          <button
            className="toolbarButton"
            type="button"
            disabled={!project || isExporting}
            onClick={() => onExport("pdf")}
          >
            <Download size={15} aria-hidden="true" />
            <span>{isExporting ? "Exporting" : "Export PDF"}</span>
          </button>
          <button
            className="toolbarButton"
            type="button"
            disabled={!project || isExporting}
            onClick={() => onExport("html")}
          >
            <FileCode2 size={15} aria-hidden="true" />
            <span>Export HTML</span>
          </button>
        </div>
      </div>
      <div className={`slideFrame ${previewUrl ? "livePreviewFrame" : ""}`}>
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
            {isPreviewing ? (
              <div className="previewProgress" role="status">
                <Loader2 className="loadingIcon" size={16} aria-hidden="true" />
                Preparing preview
              </div>
            ) : null}
            <div className="slideAccentBar">
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        ) : (
          <div className="slideCanvas emptyPreview">
            <Presentation size={28} aria-hidden="true" />
            <strong>Create or select a deck</strong>
            <span>Slides appear here as soon as Idris builds a preview.</span>
            <div className="previewThumbs" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
