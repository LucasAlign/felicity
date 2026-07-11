import { useState } from "react";
import { format } from "date-fns";
import type { Task } from "@shared/schema";
import {
  useCreateTask,
  useDeleteTask,
  useTasks,
  useUpdateTask,
} from "@/hooks/useTasks";

function TaskRow({ task }: { task: Task }) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);

  function saveTitle() {
    setEditing(false);
    const trimmed = title.trim();
    if (!trimmed || trimmed === task.title) {
      setTitle(task.title);
      return;
    }
    updateTask.mutate({ id: task.id, data: { title: trimmed } });
  }

  return (
    <li className="flex items-start gap-3 rounded-xl bg-white/70 border border-forest-100 px-4 py-3 group">
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
      <div className="flex-1">
        {editing ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveTitle();
              if (e.key === "Escape") {
                setTitle(task.title);
                setEditing(false);
              }
            }}
            className="w-full rounded-lg border border-forest-100 px-2 py-1 bg-white text-forest-700 text-sm"
          />
        ) : (
          <div
            onClick={() => setEditing(true)}
            className={`text-sm cursor-text ${
              task.completed
                ? "text-forest-300 line-through"
                : "text-forest-700"
            }`}
          >
            {task.title}
          </div>
        )}
        {task.dueDate && (
          <div className="text-xs text-forest-300 mt-0.5">
            Due {format(new Date(task.dueDate), "MMM d, yyyy")}
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
  );
}

export default function Tasks() {
  const { data: tasks = [], isLoading } = useTasks();
  const createTask = useCreateTask();
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);

  const openTasks = tasks
    .filter((t) => !t.completed)
    .sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  const completedTasks = tasks.filter((t) => t.completed);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await createTask.mutateAsync({
      title: newTitle.trim(),
      dueDate: newDueDate ? new Date(newDueDate) : null,
      source: "manual_entry",
    });
    setNewTitle("");
    setNewDueDate("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl text-forest-700">Tasks</h2>
        <p className="text-forest-400 mt-1">
          Flexible and unscheduled unless you place them.
        </p>
      </div>

      <form
        onSubmit={handleAdd}
        className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/70 border border-forest-100 p-4 shadow-soft"
      >
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a task..."
          className="flex-1 min-w-[12rem] rounded-lg border border-forest-100 px-3 py-2 bg-white text-forest-700"
        />
        <input
          type="date"
          value={newDueDate}
          onChange={(e) => setNewDueDate(e.target.value)}
          className="rounded-lg border border-forest-100 px-3 py-2 bg-white text-forest-700"
        />
        <button
          type="submit"
          className="rounded-lg bg-forest-600 text-cream-50 px-4 py-2 text-sm shadow-soft hover:bg-forest-700 transition-colors"
        >
          Add
        </button>
      </form>

      {isLoading ? (
        <div className="text-forest-400">Loading tasks&hellip;</div>
      ) : (
        <>
          {openTasks.length === 0 ? (
            <p className="text-forest-400">Nothing here — you're all caught up.</p>
          ) : (
            <ul className="space-y-2">
              {openTasks.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </ul>
          )}

          {completedTasks.length > 0 && (
            <div>
              <button
                onClick={() => setShowCompleted((s) => !s)}
                className="text-sm text-forest-400 hover:text-forest-600"
              >
                {showCompleted ? "Hide" : "Show"} completed
              </button>
              {showCompleted && (
                <ul className="space-y-2 mt-2">
                  {completedTasks.map((task) => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
