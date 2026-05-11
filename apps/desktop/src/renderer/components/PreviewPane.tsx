import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileCode2,
  Loader2,
  Maximize2,
  Presentation,
  X
} from "lucide-react";
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
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    if (!slideModuleUrl) {
      setPages(null);
      setIsFullscreen(false);
      setPreviewError(null);
      return;
    }

    setPages(null);
    setCurrentSlideIndex(0);
    setPreviewError(null);
    console.log(`[IDRIS-DEBUG preview-import-start] ${slideModuleUrl}`);

    void import(/* @vite-ignore */ slideModuleUrl)
      .then((module: SlideModule) => {
        if (!ignore) {
          console.log(`[IDRIS-DEBUG preview-import-success] pages=${module.default.length}`);
          setPages(module.default);
          setCurrentSlideIndex(0);
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

  useEffect(() => {
    if (!isFullscreen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setIsFullscreen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  function renderSlideNavigation(className = "slideNavigation") {
    if (!pages || pages.length <= 1) {
      return null;
    }

    return (
      <div className={className} aria-label="Slide navigation">
        <button
          aria-label="Previous slide"
          className="slideNavButton"
          disabled={currentSlideIndex === 0}
          type="button"
          onClick={() => setCurrentSlideIndex((index) => Math.max(index - 1, 0))}
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <span>{currentSlideIndex + 1} / {pages.length}</span>
        <button
          aria-label="Next slide"
          className="slideNavButton"
          disabled={currentSlideIndex === pages.length - 1}
          type="button"
          onClick={() => setCurrentSlideIndex((index) => Math.min(index + 1, pages.length - 1))}
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    );
  }

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
          <button
            aria-label="Fullscreen preview"
            className="toolbarButton"
            type="button"
            disabled={!pages}
            onClick={() => setIsFullscreen(true)}
          >
            <Maximize2 size={15} aria-hidden="true" />
            <span>Fullscreen</span>
          </button>
        </div>
      </div>
      <div className={`slideFrame ${slideModuleUrl ? "livePreviewFrame" : ""}`}>
        {slideModuleUrl ? (
          <div className="embeddedPreviewFrame">
            {pages ? (
              <>
                <SlideDeck
                  currentIndex={currentSlideIndex}
                  onIndexChange={setCurrentSlideIndex}
                  pages={pages}
                />
                {renderSlideNavigation()}
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
      {isFullscreen && pages ? (
        <div className="fullscreenPreview" role="dialog" aria-label="Fullscreen preview" aria-modal="true">
          <div className="fullscreenPreviewHeader">
            <div>
              <p className="panelEyebrow">Preview</p>
              <strong>{project?.name ?? "Deck preview"}</strong>
            </div>
            <button
              aria-label="Close fullscreen preview"
              className="toolbarButton"
              type="button"
              onClick={() => setIsFullscreen(false)}
            >
              <X size={16} aria-hidden="true" />
              <span>Close</span>
            </button>
          </div>
          <div className="fullscreenPreviewStage">
            <SlideDeck currentIndex={currentSlideIndex} onIndexChange={setCurrentSlideIndex} pages={pages} />
          </div>
          {renderSlideNavigation("slideNavigation fullscreenSlideNavigation")}
        </div>
      ) : null}
    </main>
  );
}
