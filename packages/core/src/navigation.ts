export type SlideNavigationInput = {
  currentIndex: number;
  key: string;
  slideCount: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getSlideNavigationTarget({
  currentIndex,
  key,
  slideCount
}: SlideNavigationInput): number {
  const lastIndex = Math.max(slideCount - 1, 0);

  if (key === "ArrowRight" || key === "PageDown" || key === " ") {
    return clamp(currentIndex + 1, 0, lastIndex);
  }

  if (key === "ArrowLeft" || key === "PageUp") {
    return clamp(currentIndex - 1, 0, lastIndex);
  }

  if (key === "Home") {
    return 0;
  }

  if (key === "End") {
    return lastIndex;
  }

  return clamp(currentIndex, 0, lastIndex);
}
