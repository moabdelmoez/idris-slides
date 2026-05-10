import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SlideDeck, getCanvasScale, getSlideNavigationTarget, type Page } from "./index";

describe("Idris slide runtime", () => {
  it("renders the first page inside a fixed 1920x1080 canvas", () => {
    const First: Page = () => <section>First slide</section>;
    const Second: Page = () => <section>Second slide</section>;

    const markup = renderToStaticMarkup(<SlideDeck pages={[First, Second]} />);

    expect(markup).toContain("First slide");
    expect(markup).not.toContain("Second slide");
    expect(markup).toContain("width:1920px");
    expect(markup).toContain("height:1080px");
  });

  it("maps keyboard navigation to clamped slide indexes", () => {
    expect(getSlideNavigationTarget({ currentIndex: 0, key: "ArrowLeft", slideCount: 3 })).toBe(0);
    expect(getSlideNavigationTarget({ currentIndex: 0, key: "ArrowRight", slideCount: 3 })).toBe(1);
    expect(getSlideNavigationTarget({ currentIndex: 1, key: " ", slideCount: 3 })).toBe(2);
    expect(getSlideNavigationTarget({ currentIndex: 2, key: "PageDown", slideCount: 3 })).toBe(2);
    expect(getSlideNavigationTarget({ currentIndex: 2, key: "Home", slideCount: 3 })).toBe(0);
    expect(getSlideNavigationTarget({ currentIndex: 0, key: "End", slideCount: 3 })).toBe(2);
    expect(getSlideNavigationTarget({ currentIndex: 1, key: "Escape", slideCount: 3 })).toBe(1);
  });

  it("computes scale-to-fit values for a 16:9 canvas", () => {
    expect(getCanvasScale({ containerWidth: 960, containerHeight: 540 })).toBe(0.5);
    expect(getCanvasScale({ containerWidth: 960, containerHeight: 400 })).toBeCloseTo(0.37037, 5);
  });

  it("renders present mode as a shared runtime state", () => {
    const PageOne: Page = () => <section>Presenter slide</section>;

    const markup = renderToStaticMarkup(<SlideDeck pages={[PageOne]} presentMode />);

    expect(markup).toContain("data-present-mode=\"true\"");
    expect(markup).toContain("Presenter slide");
  });

  it("keeps the logical canvas fixed while exposing a scaled viewport frame", () => {
    const PageOne: Page = () => <section>Scaled slide</section>;

    const markup = renderToStaticMarkup(<SlideDeck pages={[PageOne]} />);

    expect(markup).toContain("aspect-ratio:16 / 9");
    expect(markup).toContain("transform:scale(var(--idris-slide-scale, 1))");
    expect(markup).toContain("transform-origin:top left");
  });
});
