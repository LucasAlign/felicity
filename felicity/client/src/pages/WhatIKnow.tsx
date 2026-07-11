import { useEffect, useRef, useState } from "react";
import type { Memory, MemoryCategory } from "@shared/schema";
import {
  useDeleteMemory,
  useMemories,
  useRespondToMemory,
  useScanMemories,
  useUpdateMemory,
} from "@/hooks/useMemories";

const CATEGORY_LABELS: Record<MemoryCategory, string> = {
  family: "Family",
  church: "Church",
  homeschool: "Homeschool",
  household: "Household",
  shopping: "Shopping",
  meals: "Meals",
  work: "Work",
  business: "Business",
  health: "Health",
  notifications: "Notifications",
};

function SuggestionCard({ memory }: { memory: Memory }) {
  const respond = useRespondToMemory();

  return (
    <li className="rounded-xl bg-white/70 border border-forest-100 px-4 py-3 space-y-2">
      <div className="text-xs uppercase tracking-wide text-forest-300">
        {CATEGORY_LABELS[memory.category]}
      </div>
      <p className="text-sm text-forest-700">{memory.content}</p>
      {memory.aiReasoning && (
        <p className="text-xs text-forest-300">{memory.aiReasoning}</p>
      )}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => respond.mutate({ id: memory.id, response: "yes" })}
          className="rounded-lg bg-forest-600 text-cream-50 px-3 py-1.5 text-sm shadow-soft hover:bg-forest-700 transition-colors"
        >
          Yes, remember this
        </button>
        <button
          onClick={() => respond.mutate({ id: memory.id, response: "no" })}
          className="rounded-lg border border-forest-100 text-forest-500 px-3 py-1.5 text-sm hover:bg-forest-50 transition-colors"
        >
          No
        </button>
        <button
          onClick={() =>
            respond.mutate({ id: memory.id, response: "dont_ask_again" })
          }
          className="text-xs text-forest-300 hover:text-forest-500 ml-auto"
        >
          Don't ask again
        </button>
      </div>
    </li>
  );
}

function MemoryRow({ memory }: { memory: Memory }) {
  const updateMemory = useUpdateMemory();
  const deleteMemory = useDeleteMemory();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(memory.content);

  function save() {
    setEditing(false);
    const trimmed = content.trim();
    if (!trimmed || trimmed === memory.content) {
      setContent(memory.content);
      return;
    }
    updateMemory.mutate({ id: memory.id, data: { content: trimmed } });
  }

  return (
    <li className="flex items-start gap-3 rounded-xl bg-white/70 border border-forest-100 px-4 py-3 group">
      <div className="flex-1">
        {editing ? (
          <input
            autoFocus
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") {
                setContent(memory.content);
                setEditing(false);
              }
            }}
            className="w-full rounded-lg border border-forest-100 px-2 py-1 bg-white text-forest-700 text-sm"
          />
        ) : (
          <div
            onClick={() => setEditing(true)}
            className="text-sm text-forest-700 cursor-text"
          >
            {memory.content}
          </div>
        )}
      </div>
      <button
        onClick={() => deleteMemory.mutate(memory.id)}
        className="text-forest-200 hover:text-walnut-500 opacity-0 group-hover:opacity-100 transition-opacity text-sm"
        aria-label="Forget this"
      >
        ✕
      </button>
    </li>
  );
}

export default function WhatIKnow() {
  const { data: memories = [], isLoading } = useMemories();
  const scan = useScanMemories();
  const scannedOnce = useRef(false);

  useEffect(() => {
    if (scannedOnce.current) return;
    scannedOnce.current = true;
    scan.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pending = memories.filter((m) => m.status === "pending");
  const confirmed = memories.filter((m) => m.status === "confirmed");

  const byCategory = new Map<MemoryCategory, Memory[]>();
  for (const m of confirmed) {
    const list = byCategory.get(m.category) ?? [];
    list.push(m);
    byCategory.set(m.category, list);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl text-forest-700">What I Know About You</h2>
          <p className="text-forest-400 mt-1">
            Everything here is editable and removable. Nothing is remembered
            without your permission.
          </p>
        </div>
        <button
          onClick={() => scan.mutate()}
          disabled={scan.isPending}
          className="shrink-0 rounded-lg border border-forest-100 text-forest-500 px-3 py-2 text-sm hover:bg-forest-50 transition-colors disabled:opacity-50"
        >
          {scan.isPending ? "Checking…" : "Check for patterns"}
        </button>
      </div>

      {isLoading ? (
        <div className="text-forest-400">Loading&hellip;</div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm uppercase tracking-wide text-forest-400">
                I noticed a few things
              </h3>
              <ul className="space-y-2">
                {pending.map((m) => (
                  <SuggestionCard key={m.id} memory={m} />
                ))}
              </ul>
            </div>
          )}

          {confirmed.length === 0 ? (
            <p className="text-forest-400">
              I don't know anything about you yet — that's okay. Patterns
              I notice from Brain Dumps will show up here for you to approve.
            </p>
          ) : (
            <div className="space-y-6">
              {[...byCategory.entries()].map(([category, items]) => (
                <div key={category} className="space-y-2">
                  <h3 className="text-sm uppercase tracking-wide text-forest-400">
                    {CATEGORY_LABELS[category]}
                  </h3>
                  <ul className="space-y-2">
                    {items.map((m) => (
                      <MemoryRow key={m.id} memory={m} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
