import { addDays, setHours, setMinutes, setSeconds, startOfDay } from "date-fns";
import { llmExtractionEngine, MIN_ACTIONABLE_CONFIDENCE } from "./llmExtraction";

export interface ExtractedAppointment {
  title: string;
  startTime: Date;
  allDay: boolean;
  confidence: number;
  reasoning: string;
}

export interface ExtractedTask {
  title: string;
  dueDate: Date | null;
  confidence: number;
  reasoning: string;
}

export interface ExtractedNote {
  content: string;
  confidence: number;
  reasoning: string;
}

export interface ExtractedIdea {
  content: string;
  confidence: number;
  reasoning: string;
}

export interface ExtractedShoppingItem {
  item: string;
  confidence: number;
  reasoning: string;
}

export interface ExtractedPrayerRequest {
  content: string;
  confidence: number;
  reasoning: string;
}

export interface ExtractionResult {
  appointments: ExtractedAppointment[];
  tasks: ExtractedTask[];
  notes: ExtractedNote[];
  ideas: ExtractedIdea[];
  shoppingItems: ExtractedShoppingItem[];
  prayerRequests: ExtractedPrayerRequest[];
}

// The extraction step is intentionally behind this interface. Today it's a
// rule-based heuristic; swapping in an LLM-backed engine later only means
// replacing the implementation assigned to `extractionEngine` below.
export interface ExtractionEngine {
  extract(transcript: string): Promise<ExtractionResult> | ExtractionResult;
}

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function nextDayOfWeek(from: Date, targetDay: number): Date {
  const currentDay = from.getDay();
  let diff = targetDay - currentDay;
  if (diff <= 0) diff += 7;
  return addDays(from, diff);
}

function parseDateHint(segment: string, now: Date): Date | null {
  const lower = segment.toLowerCase();

  let base: Date | null = null;
  if (/\btomorrow\b/.test(lower)) {
    base = addDays(startOfDay(now), 1);
  } else if (/\btoday\b|\bthis afternoon\b|\btonight\b/.test(lower)) {
    base = startOfDay(now);
  } else {
    const dayMatch = DAY_NAMES.find((day) => lower.includes(day));
    if (dayMatch) {
      base = startOfDay(nextDayOfWeek(now, DAY_NAMES.indexOf(dayMatch)));
    }
  }

  const timeMatch = lower.match(/\b(\d{1,2})(:(\d{2}))?\s*(am|pm)\b/);
  if (timeMatch) {
    base = base ?? startOfDay(now);
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
    const isPm = timeMatch[4] === "pm";
    if (isPm && hours < 12) hours += 12;
    if (!isPm && hours === 12) hours = 0;
    base = setSeconds(setMinutes(setHours(base, hours), minutes), 0);
  }

  return base;
}

function splitIntoSegments(transcript: string): string[] {
  return transcript
    .split(/[.\n]+|\band also\b|(?<=\w)\s+also\s+/gi)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
}

function classifySegment(
  segment: string,
): "prayer" | "shopping" | "appointment" | "idea" | "task" | "note" {
  const lower = segment.toLowerCase();

  if (/\bpray(er|ing)?\b/.test(lower)) return "prayer";
  if (
    /\b(buy|pick up|grab|need to get|we need|grocery|groceries|store)\b/.test(
      lower,
    )
  )
    return "shopping";
  if (
    /\b(idea|what if|i wonder|maybe we should|thinking about)\b/.test(lower)
  )
    return "idea";
  if (
    /\b(tomorrow|today|tonight|this afternoon|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b.*\b(\d{1,2})(:\d{2})?\s*(am|pm)\b/.test(
      lower,
    ) ||
    /\b(\d{1,2})(:\d{2})?\s*(am|pm)\b.*\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today)\b/.test(
      lower,
    ) ||
    /\b(appointment|meeting|dentist|doctor|pickup|drop off|practice|game|rehearsal)\b.*\b(at|on)\b/.test(
      lower,
    )
  )
    return "appointment";
  if (
    /\b(need to|have to|should|remember to|don'?t forget to|gotta)\b/.test(
      lower,
    )
  )
    return "task";
  return "note";
}

function cleanTitle(segment: string): string {
  return segment.replace(/^(and|so|also|then)\s+/i, "").trim();
}

function ruleBasedExtract(transcript: string): ExtractionResult {
  const now = new Date();
  const segments = splitIntoSegments(transcript);

  const result: ExtractionResult = {
    appointments: [],
    tasks: [],
    notes: [],
    ideas: [],
    shoppingItems: [],
    prayerRequests: [],
  };

  for (const raw of segments) {
    const segment = cleanTitle(raw);
    const category = classifySegment(segment);

    switch (category) {
      case "prayer":
        result.prayerRequests.push({
          content: segment,
          confidence: 0.6,
          reasoning: 'Mentioned "pray"/"prayer".',
        });
        break;
      case "shopping":
        result.shoppingItems.push({
          item: segment,
          confidence: 0.55,
          reasoning: "Sounded like a shopping/errand item.",
        });
        break;
      case "idea":
        result.ideas.push({
          content: segment,
          confidence: 0.5,
          reasoning: 'Phrased like a idea or "what if" thought.',
        });
        break;
      case "appointment": {
        const date = parseDateHint(segment, now);
        result.appointments.push({
          title: segment,
          startTime: date ?? addDays(startOfDay(now), 1),
          allDay: !date,
          confidence: date ? 0.65 : 0.4,
          reasoning: date
            ? "Detected a day/time reference."
            : "Sounded like an appointment, but no clear time was found — defaulted to tomorrow, all day.",
        });
        break;
      }
      case "task": {
        const date = parseDateHint(segment, now);
        result.tasks.push({
          title: segment,
          dueDate: date,
          confidence: 0.55,
          reasoning: 'Phrased as something to do ("need to", "should", ...).',
        });
        break;
      }
      case "note":
      default:
        result.notes.push({
          content: segment,
          confidence: 0.3,
          reasoning: "Didn't clearly match another category.",
        });
        break;
    }
  }

  return result;
}

export const ruleBasedExtractionEngine: ExtractionEngine = {
  extract: ruleBasedExtract,
};

// Backstop applied after either engine runs: a task/appointment the engine
// wasn't confident about doesn't get to become an actionable item on its
// own. Nothing is discarded — it's downgraded to a note instead, so it's
// still visible and easy to promote back if it was actually right.
function applyConfidenceGuardrail(result: ExtractionResult): ExtractionResult {
  const tasks: ExtractedTask[] = [];
  const appointments: ExtractedAppointment[] = [];
  const notes: ExtractedNote[] = [...result.notes];

  for (const task of result.tasks) {
    if (task.confidence < MIN_ACTIONABLE_CONFIDENCE) {
      notes.push({
        content: task.title,
        confidence: task.confidence,
        reasoning: `${task.reasoning} Kept as a note instead of a task — not confident enough to treat as a firm commitment.`,
      });
    } else {
      tasks.push(task);
    }
  }

  for (const appointment of result.appointments) {
    if (appointment.confidence < MIN_ACTIONABLE_CONFIDENCE) {
      notes.push({
        content: appointment.title,
        confidence: appointment.confidence,
        reasoning: `${appointment.reasoning} Kept as a note instead of an appointment — not confident enough to treat as a firm commitment.`,
      });
    } else {
      appointments.push(appointment);
    }
  }

  return { ...result, tasks, appointments, notes };
}

// LLM-backed engine (server/llmExtraction.ts) actually segments a rambling
// transcript into its individual items instead of splitting on punctuation.
// If the model call fails for any reason (no API key, rate limit, bad JSON),
// fall back to the rule-based engine rather than failing the Brain Dump
// request outright.
export const extractionEngine: ExtractionEngine = {
  async extract(transcript: string) {
    let result: ExtractionResult;
    try {
      result = await llmExtractionEngine.extract(transcript);
    } catch (err) {
      console.error("LLM extraction failed, falling back to rule-based:", err);
      result = ruleBasedExtract(transcript);
    }
    return applyConfidenceGuardrail(result);
  },
};
