import { useState } from "react";
import { format } from "date-fns";
import { NotebookPen } from "lucide-react";
import type { JournalEntry } from "@shared/schema";
import {
  useCreateJournalEntry,
  useDeleteJournalEntry,
  useJournalEntries,
  useUpdateJournalEntry,
} from "@/hooks/useJournal";

function EntryCard({ entry }: { entry: JournalEntry }) {
  const updateEntry = useUpdateJournalEntry();
  const deleteEntry = useDeleteJournalEntry();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.content);

  function save() {
    const trimmed = draft.trim();
    setEditing(false);
    if (!trimmed || trimmed === entry.content) {
      setDraft(entry.content);
      return;
    }
    updateEntry.mutate({ id: entry.id, data: { content: trimmed } });
  }

  return (
    <div className="rounded-2xl bg-white/70 border border-forest-100 shadow-soft p-5 group">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wide text-forest-400">
          {entry.createdAt
            ? format(new Date(entry.createdAt), "EEEE, MMMM d, yyyy · h:mma")
            : ""}
        </span>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          {!editing && (
            <button
              onClick={() => {
                setDraft(entry.content);
                setEditing(true);
              }}
              className="text-xs text-forest-400 hover:text-forest-600"
            >
              Edit
            </button>
          )}
          <button
            onClick={() => deleteEntry.mutate(entry.id)}
            className="text-xs text-forest-300 hover:text-walnut-500"
          >
            Delete
          </button>
        </div>
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            className="w-full rounded-lg border border-forest-100 px-3 py-2 bg-white text-forest-700 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={save}
              className="rounded-lg bg-forest-600 text-cream-50 px-3 py-1.5 text-sm shadow-soft hover:bg-forest-700 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => {
                setDraft(entry.content);
                setEditing(false);
              }}
              className="rounded-lg px-3 py-1.5 text-sm text-forest-400 hover:bg-forest-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-forest-700 whitespace-pre-wrap leading-relaxed">
          {entry.content}
        </p>
      )}
    </div>
  );
}

export default function Journal() {
  const { data: entries = [], isLoading } = useJournalEntries();
  const createEntry = useCreateJournalEntry();
  const [content, setContent] = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    await createEntry.mutateAsync({ content: trimmed });
    setContent("");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2.5">
        <span className="flex items-center justify-center h-8 w-8 rounded-full bg-forest-600 text-cream-50 shadow-soft">
          <NotebookPen size={16} strokeWidth={2} />
        </span>
        <h2 className="text-3xl text-forest-700">Journal</h2>
      </div>

      <form
        onSubmit={handleAdd}
        className="rounded-2xl bg-white/70 border border-forest-100 shadow-soft p-5 space-y-3"
      >
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          placeholder="What's on your mind today?"
          className="w-full rounded-lg border border-forest-100 px-3 py-2 bg-white/80 text-forest-700 text-sm"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!content.trim() || createEntry.isPending}
            className="rounded-lg bg-forest-600 text-cream-50 px-5 py-2 text-sm shadow-soft hover:bg-forest-700 transition-colors disabled:opacity-50"
          >
            Add entry
          </button>
        </div>
      </form>

      {isLoading ? (
        <div className="text-forest-400">Loading&hellip;</div>
      ) : entries.length === 0 ? (
        <p className="text-forest-400">
          No entries yet — your first reflection starts the journal.
        </p>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
