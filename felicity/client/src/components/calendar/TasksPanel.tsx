import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Pencil } from "lucide-react";
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

function TaskRow({
  task,
  onEdit,
}: {
  task: Task;
  onEdit: (task: Task) => void;
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
      <div className="flex-1">
        <div
          className={`text-sm text-forest-700 ${
            task.completed ? "line-through text-forest-300" : ""
          }`}
        >
          {task.title}
        </div>
        {task.dueDate && (
          <div className="text-xs text-forest-300">
            Due {format(new Date(task.dueDate), "MMM d")}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(task)}
          className="text-forest-200 hover:text-forest-600 transition-colors"
          aria-label="Edit task"
        >
          <Pencil size={14} strokeWidth={2} />
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
  onEditTask,
  excludeUnassigned = false,
}: {
  tasks: Task[];
  onEditTask: (task: Task) => void;
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
        <ul className="space-y-2">
          {active.map((task) => (
            <TaskRow key={task.id} task={task} onEdit={onEditTask} />
          ))}
        </ul>
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
                <TaskRow key={task.id} task={task} onEdit={onEditTask} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
