export const solutionsColors = {
  air: "#ffffff",
  purple: "#4f008c",
  coral: "#ff375e",
  sunlight: "#ffdd40",
  sunset: "#ff6a39",
  oasis: "#00c48c",
  sea: "#1bcad8",
  moon: "#a54ee1",
  silver: "#8e9aa0",
  onyx: "#1d252d"
} as const;

export type SolutionsColorName = keyof typeof solutionsColors;

export const solutionsFonts = {
  body: "STCForward",
  heading: "STCForward"
} as const;

export const slideCanvas = {
  width: 1920,
  height: 1080,
  aspectRatio: "16 / 9"
} as const;

export const solutionsTheme = {
  colors: solutionsColors,
  fonts: solutionsFonts,
  canvas: slideCanvas
} as const;
