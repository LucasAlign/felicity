import type { Category } from "@shared/schema";

// An item with no category is "Unassigned", rendered teal (per the color spec).
export const UNASSIGNED_COLOR = "#14b8a6";
export const UNASSIGNED_LABEL = "Unassigned";

// Resolve a category id to its display color, falling back to the Unassigned
// teal when the id is null/missing or the category no longer exists.
export function colorForCategory(
  categoryId: number | null | undefined,
  categories: Category[],
): string {
  if (categoryId == null) return UNASSIGNED_COLOR;
  return categories.find((c) => c.id === categoryId)?.color ?? UNASSIGNED_COLOR;
}

export function nameForCategory(
  categoryId: number | null | undefined,
  categories: Category[],
): string {
  if (categoryId == null) return UNASSIGNED_LABEL;
  return categories.find((c) => c.id === categoryId)?.name ?? UNASSIGNED_LABEL;
}
