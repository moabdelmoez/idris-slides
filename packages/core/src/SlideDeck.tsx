import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { getSlideNavigationTarget } from "./navigation";
import { getCanvasScale } from "./scale";

export type Page = React.ComponentType;

export type SlideDeckProps = {
  pages: Page[];
  initialIndex?: number;
  currentIndex?: number;
  onIndexChange?(index: number): void;
  presentMode?: boolean;
};

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const frameStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  minWidth: 0,
  minHeight: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden"
};

const viewportStyle: CSSProperties = {
  width: "calc(1920px * var(--idris-slide-scale, 1))",
  height: "calc(1080px * var(--idris-slide-scale, 1))",
  maxWidth: "100%",
  maxHeight: "100%",
  aspectRatio: "16 / 9",
  flex: "0 0 auto",
  overflow: "hidden"
};

const canvasStyle: CSSProperties = {
  width: 1920,
  height: 1080,
  aspectRatio: "16 / 9",
  overflow: "hidden",
  background: "#ffffff",
  transform: "scale(var(--idris-slide-scale, 1))",
  transformOrigin: "top left"
};

export function SlideDeck({
  currentIndex: controlledIndex,
  initialIndex = 0,
  onIndexChange,
  pages,
  presentMode = false
}: SlideDeckProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [uncontrolledIndex, setUncontrolledIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const currentIndex = controlledIndex ?? uncontrolledIndex;
  const CurrentPage = useMemo(() => pages[currentIndex] ?? pages[0], [currentIndex, pages]);

  function setCurrentIndex(index: number): void {
    if (controlledIndex === undefined) {
      setUncontrolledIndex(index);
    }
    onIndexChange?.(index);
  }

  useIsomorphicLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) {
      return;
    }

    function measure(): void {
      if (!frame) {
        return;
      }

      setScale(
        getCanvasScale({
          containerWidth: frame.clientWidth,
          containerHeight: frame.clientHeight
        })
      );
    }

    measure();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        return;
      }

      const nextIndex = getSlideNavigationTarget({
        currentIndex,
        key: event.key,
        slideCount: pages.length
      });

      if (nextIndex !== currentIndex) {
        event.preventDefault();
        setCurrentIndex(nextIndex);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, pages.length]);

  return (
    <div data-present-mode={presentMode ? "true" : "false"} ref={frameRef} style={frameStyle}>
      <div
        style={{
          ...viewportStyle,
          "--idris-slide-scale": scale
        } as CSSProperties}
      >
        <div style={canvasStyle}>{CurrentPage ? <CurrentPage /> : null}</div>
      </div>
    </div>
  );
}
