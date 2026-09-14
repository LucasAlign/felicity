import { useMemo, useState } from "react";
import { CalendarPlus, GripVertical, StickyNote } from "lucide-react";
import type { Category, Task } from "@shared/schema";
import { useCategories } from "@/hooks/useCategories";
import { useProjects } from "@/hooks/useProjects";
import { isUnassigned, TASK_DRAG_MIME } from "@/lib/tasks";
import CategoryChip from "./CategoryChip";

function DraggableTask({
  task,
  categories,
  onSchedule,
}: {
  task: Task;
  categories: Category[];
  onSchedule: (task: Task) => void;
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
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-sm text-forest-700">
          <span className="truncate">{task.title}</span>
          {task.description && <StickyNote className="h-3.5 w-3.5 shrink-0 text-haze-500" aria-label="Has notes" />}
        </span>
        {task.description && <span className="mt-0.5 line-clamp-2 block text-xs text-forest-400">{task.description}</span>}
        <span className="mt-1 inline-block"><CategoryChip categoryId={task.categoryId} categories={categories} compact /></span>
      </span>
      <button
        type="button"
        onClick={() => onSchedule(task)}
        className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-medium text-forest-600 hover:bg-forest-50 sm:min-h-0"
      >
        <CalendarPlus className="h-4 w-4" />
        <span className="sm:hidden">Schedule</span>
      </button>
    </li>
  );
}

export default function UnassignedPanel({ tasks, onScheduleTask }: { tasks: Task[]; onScheduleTask: (task: Task) => void }) {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const { data: categories = [] } = useCategories();
  const { data: projects = [] } = useProjects();

  const unassigned = useMemo(() => tasks.filter(isUnassigned), [tasks]);
  const visible = useMemo(
    () =>
      unassigned.filter((task) => {
        if (categoryFilter === "all") return true;
        if (categoryFilter === "uncategorized") return task.categoryId == null;
        if (categoryFilter.startsWith("project:")) {
          const projectId = Number(categoryFilter.slice("project:".length));
          return categories.find((category) => category.id === task.categoryId)?.projectId === projectId;
        }
        return task.categoryId === Number(categoryFilter);
      }),
    [unassigned, categoryFilter, categories],
  );
  const projectFilters = useMemo(() => {
    const ids = new Map<number, string>();
    for (const category of categories) {
      if (category.projectId != null) {
        ids.set(
          category.projectId,
          projects.find((project) => project.id === category.projectId)?.name ?? "Project",
        );
      }
    }
    return [...ids.entries()];
  }, [categories, projects]);

  return (
    <div className="rounded-2xl bg-white/70 border border-forest-100 p-5 shadow-soft">
      <h3 className="text-forest-600 text-lg mb-1">Inbox</h3>
      <p className="text-forest-300 text-xs mb-3">
        Tasks without a date. <span className="sm:hidden">Choose Schedule to place one.</span><span className="hidden sm:inline">Schedule one or drag it onto a day.</span>
      </p>

      <label className="mb-3 block text-xs text-forest-400">
        Filter
        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-forest-100 bg-white/80 px-2 text-sm text-forest-600 sm:min-h-0 sm:py-1.5">
          <option value="all">All inbox tasks</option>
          <option value="uncategorized">Uncategorized</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.parentId
                ? `${categories.find((parent) => parent.id === category.parentId)?.name ?? "Category"} / ${category.name}`
                : category.name}
            </option>
          ))}
          {projectFilters.map(([id, label]) => (
            <option key={`project-${id}`} value={`project:${id}`}>{label}</option>
          ))}
        </select>
      </label>

      {visible.length === 0 ? (
        <p className="text-forest-400 text-sm">Nothing in this Inbox filter.</p>
      ) : (
        <ul className="space-y-1.5">
          {visible.map((task) => (
            <DraggableTask key={task.id} task={task} categories={categories} onSchedule={onScheduleTask} />
          ))}
        </ul>
      )}
    </div>
  );
}
