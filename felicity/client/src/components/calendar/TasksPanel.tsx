import { useMemo, useState } from "react";
import { addDays, format, isBefore, isSameDay, startOfDay } from "date-fns";
import { ChevronRight, StickyNote } from "lucide-react";
import type { Task } from "@shared/schema";
import {
  useCreateTask,
  useDeleteTask,
  useUpdateTask,
} from "@/hooks/useTasks";
import { useCategories } from "@/hooks/useCategories";
import { colorForCategory } from "@/lib/categories";
import { activeTasks, isArchived, isUnassigned } from "@/lib/tasks";
import { useToast } from "@/components/Toast";
import CategoryChip from "./CategoryChip";

function TaskRow({
  task,
  onSelect,
}: {
  task: Task;
  onSelect: (task: Task) => void;
}) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const createTask = useCreateTask();
  const { toast } = useToast();
  const { data: categories = [] } = useCategories();

  return (
    <li className="flex items-start gap-2 group">
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() =>
          updateTask.mutate({
            id: task.id,
            data: { completed: !task.completed },
          })
        }
        className="mt-1 accent-forest-600"
      />
      <span
        className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: colorForCategory(task.categoryId, categories) }}
        aria-hidden="true"
      />
      <button type="button" onClick={() => onSelect(task)} className="min-w-0 flex-1 text-left">
        <div
          className={`flex items-center gap-1.5 text-sm text-forest-700 ${
            task.completed ? "line-through text-forest-300" : ""
          }`}
        >
          <span>{task.title}</span>
          {task.description && <StickyNote className="h-3.5 w-3.5 shrink-0 text-haze-500" aria-label="Has notes" />}
        </div>
        {task.description && (
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-forest-400">{task.description}</p>
        )}
        {task.dueDate && (
          <div className="text-xs text-forest-300">
            Due {format(new Date(task.dueDate), "MMM d")}
          </div>
        )}
        <span className="mt-1 inline-block"><CategoryChip categoryId={task.categoryId} categories={categories} compact /></span>
      </button>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button
          onClick={() => onSelect(task)}
          className="text-forest-200 hover:text-forest-600 transition-colors"
          aria-label="View task details"
        >
          <ChevronRight size={16} strokeWidth={2} />
        </button>
        <button
          onClick={() => {
            deleteTask.mutate(task.id);
            toast({
              message: "Task deleted.",
              action: {
                label: "Undo",
                onClick: () =>
                  createTask.mutate({
                    title: task.title,
                    description: task.description,
                    dueDate: task.dueDate,
                    categoryId: task.categoryId,
                    source: "manual_entry",
                  } as any),
              },
            });
          }}
          className="text-forest-200 hover:text-walnut-500 transition-colors text-sm"
          aria-label="Delete task"
        >
          ✕
        </button>
      </div>
    </li>
  );
}

export default function TasksPanel({
  tasks,
  onSelectTask,
  excludeUnassigned = false,
}: {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  // When the Unassigned panel is also on screen (month view), hide undated
  // tasks here so the two lists don't duplicate each other. (#21)
  excludeUnassigned?: boolean;
}) {
  const [showArchived, setShowArchived] = useState(false);

  // Active list = open tasks + tasks completed within the last 12h (shown
  // crossed off). Anything older than 12h is archived out of view. See #8.
  const active = useMemo(() => {
    const list = activeTasks(tasks);
    return excludeUnassigned ? list.filter((t) => !isUnassigned(t)) : list;
  }, [tasks, excludeUnassigned]);
  const archivedTasks = useMemo(
    () => tasks.filter((t) => isArchived(t)),
    [tasks],
  );
  const groups = useMemo(() => {
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);
    const weekEnd = addDays(today, 7);
    const result: { label: string; tasks: Task[] }[] = [
      { label: "Overdue", tasks: [] },
      { label: "Today", tasks: [] },
      { label: "Tomorrow", tasks: [] },
      { label: "This week", tasks: [] },
      { label: "Later", tasks: [] },
      { label: "Completed recently", tasks: [] },
    ];
    for (const task of active) {
      if (task.completed) result[5].tasks.push(task);
      else if (!task.dueDate) result[4].tasks.push(task);
      else {
        const due = new Date(task.dueDate);
        if (isBefore(due, today)) result[0].tasks.push(task);
        else if (isSameDay(due, today)) result[1].tasks.push(task);
        else if (isSameDay(due, tomorrow)) result[2].tasks.push(task);
        else if (isBefore(due, weekEnd)) result[3].tasks.push(task);
        else result[4].tasks.push(task);
      }
    }
    return result.filter((group) => group.tasks.length > 0);
  }, [active]);

  return (
    <div className="rounded-2xl bg-white/70 border border-forest-100 p-5 shadow-soft">
      <h3 className="text-forest-600 text-lg mb-1">Tasks</h3>
      <p className="text-forest-300 text-xs mb-3">
        Flexible &mdash; unscheduled unless you place them.
      </p>

      {active.length === 0 ? (
        <p className="text-forest-400 text-sm">
          Nothing here — you're all caught up.
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <section key={group.label}>
              <h4 className={`mb-2 text-xs font-semibold uppercase tracking-wide ${group.label === "Overdue" ? "text-walnut-600" : "text-forest-400"}`}>
                {group.label} · {group.tasks.length}
              </h4>
              <ul className="space-y-2">
                {group.tasks.map((task) => (
                  <TaskRow key={task.id} task={task} onSelect={onSelectTask} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {archivedTasks.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowArchived((s) => !s)}
            className="text-xs text-forest-400 hover:text-forest-600"
          >
            {showArchived ? "Hide" : "Show"} archived ({archivedTasks.length})
          </button>
          {showArchived && (
            <ul className="space-y-2 mt-2">
              {archivedTasks.map((task) => (
                <TaskRow key={task.id} task={task} onSelect={onSelectTask} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
