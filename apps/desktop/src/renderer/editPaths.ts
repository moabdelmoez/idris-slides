import type { DeckOutline } from "../shared/types";

export function applyOutlineTextEdit(outline: DeckOutline, path: string, value: string): DeckOutline {
  const next = JSON.parse(JSON.stringify(outline)) as DeckOutline;
  const segments = path.split(".");
  let cursor: unknown = next;

  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index]!;
    cursor = Array.isArray(cursor)
      ? cursor[Number(segment)]
      : (cursor as Record<string, unknown>)[segment];
  }

  const last = segments[segments.length - 1]!;

  if (Array.isArray(cursor)) {
    cursor[Number(last)] = value;
  } else {
    (cursor as Record<string, unknown>)[last] = value;
  }

  return next;
}
