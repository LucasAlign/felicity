import { useMemo, useState } from "react";
import { GripVertical } from "lucide-react";
import type { Category, Task } from "@shared/schema";
import { useCategories } from "@/hooks/useCategories";
import { useProjects } from "@/hooks/useProjects";
import { colorForCategory } from "@/lib/categories";
import { isUnassigned, TASK_DRAG_MIME } from "@/lib/tasks";

type WindowTab = "all" | "work" | "meal" | "project";

const TABS: { id: WindowTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "work", label: "Work" },
  { id: "meal", label: "Meal" },
  { id: "project", label: "Project" },
];

// Classify an unassigned task into one of the context windows by its category:
// - work: category named "Work"
// - meal: category name mentions a meal
// - project: category belongs to a project
function matchesTab(
  tab: WindowTab,
  task: Task,
  categoryById: Map<number, Category>,
): boolean {
  if (tab === "all") return true;
  const category = task.categoryId ? categoryById.get(task.categoryId) : null;
  if (!category) return false;
  if (tab === "work") return category.name.toLowerCase() === "work";
  if (tab === "meal") return /meal/i.test(category.name);
  if (tab === "project") return category.projectId != null;
  return false;
}

function DraggableTask({
  task,
  categories,
}: {
  task: Task;
  categories: Category[];
}) {
  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(TASK_DRAG_MIME, String(task.id));
        e.dataTransfer.setData("text/plain", String(task.id));
        e.dataTransfer.effectAllowed = "move";
      }}
      className="flex items-center gap-2 rounded-lg bg-white/70 border border-forest-100 px-2.5 py-2 cursor-grab active:cursor-grabbing hover:border-forest-200 hover:shadow-soft transition-all"
      title="Drag onto a day to schedule it"
    >
      <GripVertical
        size={14}
        strokeWidth={2}
        className="shrink-0 text-forest-300"
        aria-hidden="true"
      />
      <span
        className="inline-block h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: colorForCategory(task.categoryId, categories) }}
        aria-hidden="true"
      />
      <span className="flex-1 text-sm text-forest-700 truncate">
        {task.title}
      </span>
    </li>
  );
}

export default function UnassignedPanel({ tasks }: { tasks: Task[] }) {
  const [tab, setTab] = useState<WindowTab>("all");
  const { data: categories = [] } = useCategories();
  useProjects(); // warms the projects cache so category.projectId reflects live data

  const categoryById = useMemo(() => {
    const map = new Map<number, Category>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  const unassigned = useMemo(() => tasks.filter(isUnassigned), [tasks]);
  const visible = useMemo(
    () => unassigned.filter((t) => matchesTab(tab, t, categoryById)),
    [unassigned, tab, categoryById],
  );

  return (
    <div className="rounded-2xl bg-white/70 border border-forest-100 p-5 shadow-soft">
      <h3 className="text-forest-600 text-lg mb-1">Unassigned</h3>
      <p className="text-forest-300 text-xs mb-3">
        Drag onto a day to schedule.
      </p>

      <div className="flex items-center rounded-lg border border-forest-100 overflow-hidden mb-3 text-xs">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 px-2 py-1.5 ${
              tab === t.id
                ? "bg-forest-600 text-cream-50"
                : "text-forest-500 hover:bg-forest-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-forest-400 text-sm">Nothing unassigned here.</p>
      ) : (
        <ul className="space-y-1.5">
          {visible.map((task) => (
            <DraggableTask key={task.id} task={task} categories={categories} />
          ))}
        </ul>
      )}
    </div>
  );
}
