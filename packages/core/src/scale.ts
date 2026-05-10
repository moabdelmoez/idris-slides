export type CanvasScaleInput = {
  containerWidth: number;
  containerHeight: number;
  canvasWidth?: number;
  canvasHeight?: number;
};

export function getCanvasScale({
  canvasHeight = 1080,
  canvasWidth = 1920,
  containerHeight,
  containerWidth
}: CanvasScaleInput): number {
  if (containerWidth <= 0 || containerHeight <= 0) {
    return 1;
  }

  return Math.min(containerWidth / canvasWidth, containerHeight / canvasHeight);
}
