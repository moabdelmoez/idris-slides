import { solutionsColors } from "./tokens";

const approvedColors = new Set(
  Object.values(solutionsColors).map((color) => color.toLowerCase())
);

const hexColorPattern = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;

export function isApprovedHexColor(color: string): boolean {
  return approvedColors.has(color.toLowerCase());
}

export function findForbiddenHexColors(source: string): string[] {
  const matches = source.match(hexColorPattern) ?? [];
  const forbidden = matches.filter((color) => !isApprovedHexColor(color));
  return Array.from(new Set(forbidden));
}
