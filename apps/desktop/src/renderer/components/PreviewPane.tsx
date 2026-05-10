import { Download, FileCode2, Loader2, Presentation } from "lucide-react";
import { useEffect, useState } from "react";
import { SlideDeck, type Page } from "@idris-slides/core";
import type { ProjectMetadata } from "@idris-slides/project";

type PreviewPaneProps = {
  project: ProjectMetadata | null;
  slideModuleUrl: string | null;
  isPreviewing: boolean;
  isExporting: boolean;
  onExport(kind: "pdf" | "html"): void;
};

type SlideModule = {
  default: Page[];
};

export function PreviewPane({
  isExporting,
  isPreviewing,
  onExport,
  slideModuleUrl,
  project
}: PreviewPaneProps) {
  const [pages, setPages] = useState<Page[] | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    if (!slideModuleUrl) {
      setPages(null);
      setPreviewError(null);
      return;
    }

    setPages(null);
    setPreviewError(null);
    console.log(`[IDRIS-DEBUG preview-import-start] ${slideModuleUrl}`);

    void import(/* @vite-ignore */ slideModuleUrl)
      .then((module: SlideModule) => {
        if (!ignore) {
          console.log(`[IDRIS-DEBUG preview-import-success] pages=${module.default.length}`);
          setPages(module.default);
        }
      })
      .catch((error: unknown) => {
        if (!ignore) {
          console.error("[IDRIS-DEBUG preview-import-error]", error);
          setPreviewError(error instanceof Error ? error.message : "Unable to load deck preview.");
        }
      });

    return () => {
      ignore = true;
    };
  }, [slideModuleUrl]);

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
      <div className={`slideFrame ${slideModuleUrl ? "livePreviewFrame" : ""}`}>
        {slideModuleUrl ? (
          <div className="embeddedPreviewFrame">
            {pages ? (
              <>
                <SlideDeck pages={pages} />
                <span className="previewLoadedStatus">Deck preview loaded.</span>
              </>
            ) : (
              <div className="previewProgress" role="status">
                <Loader2 className="loadingIcon" size={16} aria-hidden="true" />
                {previewError ?? "Loading deck preview"}
              </div>
            )}
          </div>
        ) : project ? (
          <div className="slideCanvas activeSlideCanvas">
            <div>
              <p className="slideEyebrow">Solutions deck</p>
              <h3>{project.name}</h3>
              <p>
                {isPreviewing
                  ? "Starting live deck preview..."
                  : project.outline?.summary ?? "Branded deck generated locally."}
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
