import { format } from "date-fns";
import { Link } from "wouter";
import type { Task } from "@shared/schema";
import { useDeleteTask, useUpdateTask } from "@/hooks/useTasks";

export default function TasksPanel({ tasks }: { tasks: Task[] }) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const openTasks = tasks
    .filter((t) => !t.completed)
    .sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

  return (
    <div className="rounded-2xl bg-white/70 border border-forest-100 p-5 shadow-soft">
      <h3 className="text-forest-600 text-lg mb-1">Tasks</h3>
      <p className="text-forest-300 text-xs mb-3">
        Flexible &mdash; unscheduled unless you place them.
      </p>

      {openTasks.length === 0 ? (
        <p className="text-forest-400 text-sm">Nothing here — you're all caught up.</p>
      ) : (
        <ul className="space-y-2">
          {openTasks.map((task) => (
            <li key={task.id} className="flex items-start gap-2 group">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() =>
                  updateTask.mutate({ id: task.id, data: { completed: true } })
                }
                className="mt-1 accent-forest-600"
              />
              <div className="flex-1">
                <div className="text-sm text-forest-700">{task.title}</div>
                {task.dueDate && (
                  <div className="text-xs text-forest-300">
                    Due {format(new Date(task.dueDate), "MMM d")}
                  </div>
                )}
              </div>
              <button
                onClick={() => deleteTask.mutate(task.id)}
                className="text-forest-200 hover:text-walnut-500 opacity-0 group-hover:opacity-100 transition-opacity text-sm"
                aria-label="Delete task"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/tasks"
        className="inline-block mt-3 text-forest-500 hover:text-forest-700 underline text-sm"
      >
        View all tasks
      </Link>
    </div>
  );
}
