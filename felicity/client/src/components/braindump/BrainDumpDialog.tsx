import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSubmitBrainDump, type BrainDumpResult } from "@/hooks/useBrainDump";
import { useOcrUpload } from "@/hooks/useOcrUpload";
import { useDeleteAppointment } from "@/hooks/useAppointments";
import { useDeleteTask } from "@/hooks/useTasks";
import { useDeleteNote } from "@/hooks/useNotes";
import { useDeleteIdea } from "@/hooks/useIdeas";
import { useDeleteShoppingItem } from "@/hooks/useShoppingItems";
import { useDeletePrayerRequest } from "@/hooks/usePrayerRequests";

type Stage =
  | "intro"
  | "listening"
  | "reading-photo"
  | "reviewing"
  | "submitting"
  | "summary";

type Origin = "voice" | "manual" | "ocr_upload";

// Anything below this reads as "we weren't fully sure" in the summary —
// keep in sync with MIN_ACTIONABLE_CONFIDENCE in server/llmExtraction.ts.
const LOW_CONFIDENCE_THRESHOLD = 0.5;

function SummarySection({
  title,
  items,
  onDelete,
}: {
  title: string;
  items: {
    id: number;
    label: string;
    confidence: number | null;
    reasoning: string | null;
  }[];
  onDelete: (id: number) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="text-sm text-forest-500 mb-1.5">{title}</h4>
      <ul className="space-y-1">
        {items.map((item) => {
          const isUnsure =
            item.confidence != null && item.confidence < LOW_CONFIDENCE_THRESHOLD;
          return (
            <li
              key={item.id}
              className="flex items-start gap-2 rounded-lg bg-white/70 border border-forest-100 px-3 py-2 text-forest-700 text-sm"
              title={item.reasoning ?? undefined}
            >
              <span className="flex-1">
                {item.label}
                {isUnsure && (
                  <span className="ml-2 rounded-full bg-walnut-100 text-walnut-600 text-xs px-2 py-0.5 align-middle whitespace-nowrap">
                    not sure about this one
                  </span>
                )}
              </span>
              <button
                onClick={() => onDelete(item.id)}
                className="shrink-0 text-forest-300 hover:text-walnut-600"
                aria-label={`Remove "${item.label}"`}
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function BrainDumpDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<Stage>("intro");
  const [manualText, setManualText] = useState("");
  const [origin, setOrigin] = useState<Origin>("manual");
  const [result, setResult] = useState<BrainDumpResult | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const speech = useSpeechRecognition();
  const submitBrainDump = useSubmitBrainDump();
  const ocrUpload = useOcrUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const deleteAppointment = useDeleteAppointment();
  const deleteTask = useDeleteTask();
  const deleteNote = useDeleteNote();
  const deleteIdea = useDeleteIdea();
  const deleteShoppingItem = useDeleteShoppingItem();
  const deletePrayerRequest = useDeletePrayerRequest();

  useEffect(() => {
    if (!open) {
      setStage("intro");
      setManualText("");
      setOrigin("manual");
      setResult(null);
      setPhotoError(null);
      speech.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  function startListening() {
    setOrigin("voice");
    speech.start();
    setStage("listening");
  }

  function finishListening() {
    speech.stop();
    setManualText(speech.transcript);
    setStage("reviewing");
  }

  function continueWithTypedText() {
    setOrigin("manual");
    setStage("reviewing");
  }

  async function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setPhotoError(null);
    setStage("reading-photo");
    try {
      const { text } = await ocrUpload.mutateAsync(file);
      if (!text.trim()) {
        setPhotoError(
          "I couldn't make out any text in that photo — try a clearer shot, or type it in instead.",
        );
        setStage("intro");
        return;
      }
      setOrigin("ocr_upload");
      setManualText(text);
      setStage("reviewing");
    } catch {
      setPhotoError(
        "Something went wrong reading that photo — try again, or type it in instead.",
      );
      setStage("intro");
    }
  }

  async function handleSubmit() {
    if (!manualText.trim()) return;
    setStage("submitting");
    try {
      const data = await submitBrainDump.mutateAsync({
        transcript: manualText.trim(),
        inputMethod: origin,
      });
      setResult(data);
      setStage("summary");
    } catch {
      setStage("reviewing");
    }
  }

  function startOver() {
    setManualText("");
    setOrigin("manual");
    setResult(null);
    setPhotoError(null);
    setStage("intro");
  }

  function removeFromResult(
    category: Exclude<keyof BrainDumpResult, "brainDump">,
    id: number,
  ) {
    setResult((prev) =>
      prev
        ? {
            ...prev,
            [category]: (prev[category] as { id: number }[]).filter(
              (item) => item.id !== id,
            ),
          }
        : prev,
    );
  }

  function deleteItem(
    category: Exclude<keyof BrainDumpResult, "brainDump">,
    id: number,
    mutation: { mutate: (id: number) => void },
  ) {
    removeFromResult(category, id);
    mutation.mutate(id);
  }

  const totalItems = result
    ? result.appointments.length +
      result.tasks.length +
      result.notes.length +
      result.ideas.length +
      result.shoppingItems.length +
      result.prayerRequests.length
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest-900/30 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-cream-50 p-6 shadow-soft max-h-[85vh] overflow-y-auto">
        {stage === "intro" && (
          <div className="text-center py-6">
            <h3 className="text-xl text-forest-700 mb-2">Brain Dump</h3>
            <p className="text-forest-400 text-sm mb-6">
              Tell me what's on your mind. I'll sort it into tasks,
              appointments, notes, and more.
            </p>

            {speech.isSupported ? (
              <button
                onClick={startListening}
                className="w-20 h-20 rounded-full bg-walnut-500 text-cream-50 text-2xl shadow-soft hover:bg-walnut-600 transition-colors mx-auto flex items-center justify-center"
                aria-label="Start Brain Dump"
              >
                🎙
              </button>
            ) : (
              <p className="text-sm text-forest-400">
                Voice isn't available in this browser — type below or upload
                a photo instead.
              </p>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-forest-200 text-forest-600 px-4 py-2 text-sm hover:bg-forest-50 transition-colors"
            >
              📷 Upload a photo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelected}
              className="hidden"
            />
            {photoError && (
              <p className="text-sm text-walnut-600 mt-2">{photoError}</p>
            )}

            <div className="mt-6 text-left">
              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Or type what's on your mind..."
                rows={3}
                className="w-full rounded-lg border border-forest-100 px-3 py-2 bg-white/80 text-forest-700 text-sm"
              />
              {manualText.trim() && (
                <button
                  onClick={continueWithTypedText}
                  className="mt-2 rounded-lg bg-forest-600 text-cream-50 px-4 py-2 text-sm shadow-soft hover:bg-forest-700 transition-colors"
                >
                  Continue
                </button>
              )}
            </div>
          </div>
        )}

        {stage === "reading-photo" && (
          <div className="text-center py-10">
            <div className="text-3xl mb-3">📷</div>
            <p className="text-forest-400">Reading your photo&hellip;</p>
          </div>
        )}

        {stage === "listening" && (
          <div className="text-center py-6">
            <h3 className="text-xl text-forest-700 mb-2">
              I'm listening&hellip;
            </h3>
            <div className="w-20 h-20 rounded-full bg-walnut-500 text-cream-50 text-2xl shadow-soft mx-auto flex items-center justify-center animate-pulse">
              🎙
            </div>
            <div className="mt-6 min-h-[4rem] rounded-lg bg-white/70 border border-forest-100 px-4 py-3 text-left text-forest-700">
              {speech.transcript}
              <span className="text-forest-400">
                {speech.interimText ? ` ${speech.interimText}` : ""}
              </span>
              {!speech.transcript && !speech.interimText && (
                <span className="text-forest-400">
                  Go ahead, say whatever's on your mind&hellip;
                </span>
              )}
            </div>
            {speech.error && (
              <p className="text-sm text-walnut-600 mt-2">{speech.error}</p>
            )}
            <button
              onClick={finishListening}
              className="mt-6 rounded-lg bg-forest-600 text-cream-50 px-6 py-2.5 text-sm shadow-soft hover:bg-forest-700 transition-colors"
            >
              Done talking
            </button>
          </div>
        )}

        {stage === "reviewing" && (
          <div>
            <h3 className="text-xl text-forest-700 mb-3">
              {origin === "ocr_upload"
                ? "Here's what I read"
                : origin === "voice"
                  ? "Here's what I heard"
                  : "Here's what you wrote"}
            </h3>
            {origin === "ocr_upload" && (
              <p className="text-forest-400 text-sm mb-3">
                Photo text can be imperfect — double-check it before I sort
                it.
              </p>
            )}
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-forest-100 px-3 py-2 bg-white/80 text-forest-700 text-sm"
            />
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={startOver}
                className="text-sm text-forest-400 hover:text-forest-600"
              >
                Start over
              </button>
              <button
                onClick={handleSubmit}
                disabled={!manualText.trim()}
                className="rounded-lg bg-walnut-500 text-cream-50 px-5 py-2.5 text-sm shadow-soft hover:bg-walnut-600 transition-colors disabled:opacity-50"
              >
                Let Felicity sort this out
              </button>
            </div>
          </div>
        )}

        {stage === "submitting" && (
          <div className="text-center py-10 text-forest-400">
            Sorting through everything&hellip;
          </div>
        )}

        {stage === "summary" && result && (
          <div>
            <h3 className="text-xl text-forest-700 mb-1">
              Here's what I took care of
            </h3>
            <p className="text-forest-400 text-sm mb-4">
              {totalItems === 0
                ? "I didn't catch anything I could sort — want to try again?"
                : `${totalItems} thing${totalItems === 1 ? "" : "s"} organized, nothing left for you to file.`}
            </p>

            <div className="space-y-4">
              <SummarySection
                title="Appointments"
                items={result.appointments.map((a) => ({
                  id: a.id,
                  label: `${a.title} — ${a.allDay ? "all day" : format(new Date(a.startTime), "EEE MMM d, h:mma")}`,
                  confidence: a.confidence,
                  reasoning: a.aiReasoning,
                }))}
                onDelete={(id) =>
                  deleteItem("appointments", id, deleteAppointment)
                }
              />
              <SummarySection
                title="Tasks"
                items={result.tasks.map((t) => ({
                  id: t.id,
                  label: t.title,
                  confidence: t.confidence,
                  reasoning: t.aiReasoning,
                }))}
                onDelete={(id) => deleteItem("tasks", id, deleteTask)}
              />
              <SummarySection
                title="Shopping"
                items={result.shoppingItems.map((s) => ({
                  id: s.id,
                  label: s.item,
                  confidence: s.confidence,
                  reasoning: s.aiReasoning,
                }))}
                onDelete={(id) =>
                  deleteItem("shoppingItems", id, deleteShoppingItem)
                }
              />
              <SummarySection
                title="Notes"
                items={result.notes.map((n) => ({
                  id: n.id,
                  label: n.content,
                  confidence: n.confidence,
                  reasoning: n.aiReasoning,
                }))}
                onDelete={(id) => deleteItem("notes", id, deleteNote)}
              />
              <SummarySection
                title="Ideas"
                items={result.ideas.map((i) => ({
                  id: i.id,
                  label: i.content,
                  confidence: i.confidence,
                  reasoning: i.aiReasoning,
                }))}
                onDelete={(id) => deleteItem("ideas", id, deleteIdea)}
              />
              <SummarySection
                title="Prayer requests"
                items={result.prayerRequests.map((p) => ({
                  id: p.id,
                  label: p.content,
                  confidence: p.confidence,
                  reasoning: p.aiReasoning,
                }))}
                onDelete={(id) =>
                  deleteItem("prayerRequests", id, deletePrayerRequest)
                }
              />
            </div>

            <div className="flex items-center justify-between mt-6">
              <button
                onClick={startOver}
                className="text-sm text-forest-400 hover:text-forest-600"
              >
                Start another Brain Dump
              </button>
              <button
                onClick={onClose}
                className="rounded-lg bg-forest-600 text-cream-50 px-5 py-2.5 text-sm shadow-soft hover:bg-forest-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
