import { useState } from "react";
import { addDays, format, isSameDay, subDays } from "date-fns";
import { UtensilsCrossed } from "lucide-react";
import type { Meal, MealSlot } from "@shared/schema";
import { useCreateMeal, useDeleteMeal, useMeals } from "@/hooks/useMeals";

const SLOTS: { id: MealSlot; label: string }[] = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snack", label: "Snack" },
];

export default function MealPlanner() {
  const { data: meals = [] } = useMeals();
  const createMeal = useCreateMeal();
  const deleteMeal = useDeleteMeal();

  const [day, setDay] = useState(() => new Date());
  const [slot, setSlot] = useState<MealSlot>("dinner");
  const [title, setTitle] = useState("");

  const dayMeals = meals.filter((m) => isSameDay(new Date(m.date), day));
  const bySlot = (s: MealSlot): Meal[] =>
    dayMeals.filter((m) => m.slot === s);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    // Store at local midnight of the selected day so it groups by that date.
    const date = new Date(`${format(day, "yyyy-MM-dd")}T00:00:00`);
    await createMeal.mutateAsync({ date, slot, title: trimmed });
    setTitle("");
  }

  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/60 ring-1 ring-forest-200/70 shadow-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center h-8 w-8 rounded-full bg-forest-600 text-cream-50 shadow-soft">
            <UtensilsCrossed size={16} strokeWidth={2} />
          </span>
          <h3 className="text-forest-700 text-lg">Meal Planning</h3>
        </div>
        <div className="flex items-center rounded-lg border border-forest-100 overflow-hidden">
          <button
            onClick={() => setDay((d) => subDays(d, 1))}
            className="px-2.5 py-1 text-forest-500 hover:bg-forest-50"
            aria-label="Previous day"
          >
            &larr;
          </button>
          <span className="px-3 py-1 text-sm text-forest-600 tabular-nums border-x border-forest-100">
            {isSameDay(day, new Date()) ? "Today" : format(day, "EEE, MMM d")}
          </span>
          <button
            onClick={() => setDay((d) => addDays(d, 1))}
            className="px-2.5 py-1 text-forest-500 hover:bg-forest-50"
            aria-label="Next day"
          >
            &rarr;
          </button>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {SLOTS.map((s) => {
          const items = bySlot(s.id);
          return (
            <div key={s.id} className="flex items-start gap-3">
              <span className="w-20 shrink-0 text-xs uppercase tracking-wide text-forest-400 pt-1">
                {s.label}
              </span>
              <div className="flex-1 min-w-0">
                {items.length === 0 ? (
                  <span className="text-sm text-forest-300">—</span>
                ) : (
                  <ul className="space-y-1">
                    {items.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center justify-between gap-2 group"
                      >
                        <span className="text-sm text-forest-700 truncate">
                          {m.title}
                        </span>
                        <button
                          onClick={() => deleteMeal.mutate(m.id)}
                          className="text-forest-200 hover:text-walnut-500 opacity-0 group-hover:opacity-100 transition-opacity text-sm shrink-0"
                          aria-label="Delete meal"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={handleAdd}
        className="flex items-center gap-2 pt-3 border-t border-forest-100/70"
      >
        <select
          value={slot}
          onChange={(e) => setSlot(e.target.value as MealSlot)}
          className="shrink-0 rounded-lg border border-forest-100 px-2 py-2 bg-white/80 text-forest-700 text-sm"
        >
          {SLOTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Plan a meal…"
          className="flex-1 min-w-0 rounded-lg border border-forest-100 px-3 py-2 bg-white/80 text-forest-700 text-sm"
        />
        <button
          type="submit"
          disabled={!title.trim() || createMeal.isPending}
          className="shrink-0 rounded-lg bg-forest-600 text-cream-50 px-4 py-2 text-sm shadow-soft hover:bg-forest-700 transition-colors disabled:opacity-50"
        >
          Add
        </button>
      </form>
    </div>
  );
}
