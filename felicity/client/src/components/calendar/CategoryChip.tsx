import type { Category } from "@shared/schema";
import { colorForCategory, nameForCategory } from "@/lib/categories";

export default function CategoryChip({
  categoryId,
  categories,
  compact = false,
}: {
  categoryId: number | null | undefined;
  categories: Category[];
  compact?: boolean;
}) {
  const category = categories.find((item) => item.id === categoryId);
  const parent = category?.parentId
    ? categories.find((item) => item.id === category.parentId)
    : null;
  const label = category
    ? parent
      ? `${parent.name} / ${category.name}`
      : category.name
    : nameForCategory(categoryId, categories);

  return (
    <span
      className={`inline-flex min-w-0 items-center gap-1 rounded-full bg-white/75 text-forest-600 ring-1 ring-inset ring-forest-100 ${
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
      }`}
      title={label}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: colorForCategory(categoryId, categories) }}
        aria-hidden="true"
      />
      <span className="truncate">{label}</span>
    </span>
  );
}
