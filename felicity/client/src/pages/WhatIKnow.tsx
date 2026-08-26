import { useEffect, useRef, useState } from "react";
import type { Memory, MemoryCategory } from "@shared/schema";
import {
  useDeleteMemory,
  useMemories,
  useRespondToMemory,
  useScanMemories,
  useUpdateMemory,
} from "@/hooks/useMemories";
import {
  useCreateWisdomEntry,
  useDeleteWisdomEntry,
  useWisdomEntries,
} from "@/hooks/useWisdom";

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

// Words of wisdom the user curates. Surfaced here for management and rotated
// one-per-day beneath the Bible verse on the dashboard (see lib/wisdom.ts). (#15)
function WisdomSection() {
  const { data: entries = [] } = useWisdomEntries();
  const createEntry = useCreateWisdomEntry();
  const deleteEntry = useDeleteWisdomEntry();
  const [content, setContent] = useState("");
  const [source, setSource] = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    await createEntry.mutateAsync({
      content: trimmed,
      source: source.trim() || undefined,
    });
    setContent("");
    setSource("");
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm uppercase tracking-wide text-forest-400">
        Words of Wisdom
      </h3>
      <p className="text-forest-400 text-sm">
        These rotate one per day beneath the Bible verse on your dashboard.
      </p>

      <form onSubmit={handleAdd} className="space-y-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="A saying, maxim, or bit of wisdom worth remembering…"
          rows={2}
          className="w-full rounded-lg border border-forest-100 px-3 py-2 bg-white/80 text-forest-700 text-sm"
        />
        <div className="flex gap-2">
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Source (optional)"
            className="flex-1 rounded-lg border border-forest-100 px-3 py-2 bg-white/80 text-forest-700 text-sm"
          />
          <button
            type="submit"
            disabled={!content.trim() || createEntry.isPending}
            className="shrink-0 rounded-lg bg-forest-600 text-cream-50 px-4 py-2 text-sm shadow-soft hover:bg-forest-700 transition-colors disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </form>

      {entries.length === 0 ? (
        <p className="text-forest-400 text-sm">
          No wisdom yet — add a few and they'll start appearing daily.
        </p>
      ) : (
        <ul className="space-y-2">
          {entries.map((w) => (
            <li
              key={w.id}
              className="flex items-start justify-between gap-2 rounded-lg bg-white/70 border border-forest-100 px-3 py-2 group"
            >
              <div>
                <div className="font-serif text-sm text-forest-700 italic">
                  "{w.content}"
                </div>
                {w.source && (
                  <div className="text-xs text-forest-300 mt-0.5">
                    — {w.source}
                  </div>
                )}
              </div>
              <button
                onClick={() => deleteEntry.mutate(w.id)}
                className="text-forest-200 hover:text-walnut-500 opacity-0 group-hover:opacity-100 transition-opacity text-sm shrink-0"
                aria-label="Delete wisdom entry"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
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

      <div className="border-t border-forest-100 pt-6">
        <WisdomSection />
      </div>
    </div>
  );
}
