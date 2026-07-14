import OpenAI from "openai";
import type { ExtractionEngine, ExtractionResult } from "./extraction";

// LLM-backed implementation of the ExtractionEngine interface (see
// extraction.ts). Given a raw brain dump transcript — often a rambling,
// unpunctuated stream of thought — this asks the model to do what the
// rule-based engine can't: split it into the individual things it actually
// contains and sort each one into the right bucket.
const client = new OpenAI();

const MODEL = process.env.OPENAI_MODEL || "gpt-4o";

// Below this, a task/appointment is downgraded to a note rather than
// dropped — see applyConfidenceGuardrail in extraction.ts. Nothing
// extracted is ever silently discarded, but shaky "this sounds like a
// commitment" guesses don't get to become an actionable item on their own.
export const MIN_ACTIONABLE_CONFIDENCE = 0.5;

const SYSTEM_PROMPT = `You are the extraction engine behind "Felicity", a family organizer app for busy (often homeschooling) parents. Users record a "brain dump" — a rambling, run-on stream of thought, often with no punctuation — and you must split it into the individual, discrete items it actually contains, then sort each into exactly one category:

- appointments: things at a fixed date/time (doctor visits, practices, meetings, pickups/drop-offs)
- tasks: concrete, single-occurrence things to do with no fixed time, optionally with a due date (errands, chores, "need to call the school")
- shoppingItems: things to buy
- ideas: "what if"/"we should try" thoughts, not commitments
- prayerRequests: explicit prayer requests or people/situations to pray for
- notes: anything worth remembering that doesn't fit the above (reminders to self, observations, info to keep, vague aspirations, venting, rhetorical self-questions)

Rules:
- Never lump the whole transcript into one item. Segment it into every distinct thought it contains.
- One transcript can and often does contain multiple items across multiple categories.
- Each distinct thought becomes exactly ONE item in exactly ONE category. Never repeat the same thought as both a task and a note (or any other pair) — pick the single best-fitting category.
- "pick up"/"buy"/"grab"/"we need/we're out of" + a purchasable item (milk, eggs, diapers, etc.) is a shoppingItem, not a task — even though it's phrased like a to-do. Only treat "pick up" as an appointment when it's picking up a *person* at a scheduled time.
- Resolve relative dates/times (e.g. "tomorrow", "next Tuesday", "3pm") against the "current date/time" given to you, into ISO 8601 strings.
- If an appointment has no discoverable time, set allDay to true and pick a reasonable date; if none is discoverable, use the day after current date/time.
- Tasks only get a dueDate if one is actually stated or clearly implied; otherwise it must be null.
- confidence is 0-1: how sure you are this item belongs in this category as extracted. Reserve confidence above 0.85 for cases with no real ambiguity; use lower values when the category or details were a judgment call.
- reasoning is one short sentence explaining the categorization, written for the end user (e.g. "Mentioned a specific day and time.").
- Skip pure filler ("um", "okay so", trailing sign-offs) — don't create an item for it.
- Keep item titles/content short and in the user's own words where possible; don't editorialize.

Be careful not to manufacture tasks or appointments out of things that aren't actually commitments. A good rule of thumb: could you literally check this off, or show up to it? If not, it's a note, not a task or appointment. Specifically:
- Vague aspirations or habits ("I should really be better about journaling", "need to exercise more") → note, not task. There's no single concrete action to check off.
- Venting or complaints ("ugh I'm so tired of Mondays", "the kitchen is such a mess") → note, not task, even if it contains a word like "need to" in passing ("this kitchen needs to get cleaned at some point" without any real intent is still just venting — only extract it as a task if it reads as an actual plan).
- Rhetorical or uncertain self-questions ("did I already reply to the teacher's email?", "did we ever pay that bill?") → note. These are memory checks, not action items — don't invent a task like "reply to teacher" from a question about whether it's already done.
- Hypothetical or exploratory musing ("what if we did a family game night sometime", "maybe we should try meal prepping") → idea, not task or appointment — nothing has been decided or scheduled.
- Background/context statements with no accompanying action ("the kids are off school next Friday") → note. Only extract a task/appointment if the transcript pairs it with something to actually do or attend ("kids are off Friday, need to line up a sitter" → the sitter part is the task).
- Concrete, single-occurrence commitments with a clear verb and object ("call the vet Tuesday", "sign the permission slip", "pay the water bill") → these are real tasks — don't undercount just to be safe. The goal is precision, not silence: real commitments should still confidently become tasks/appointments.

Examples (category: text → what to do):
- "I really need to stop putting things off" → note (vague aspiration, no concrete object)
- "need to call the pediatrician tomorrow about jake's rash" → task, dueDate = tomorrow (concrete action, object, and person)
- "man I am so behind on everything this week" → note (venting)
- "did I ever text sarah back" → note (rhetorical memory check)
- "we should probably think about doing a garage sale sometime this summer" → idea (exploratory, no commitment)
- "dentist appointment thursday at 2" → appointment, thursday 2pm
- "we're out of milk and diapers" → two shoppingItems: milk, diapers`;

const itemProps = (extra: Record<string, unknown>, required: string[]) => ({
  type: "object" as const,
  properties: {
    ...extra,
    confidence: { type: "number" as const, description: "0 to 1" },
    reasoning: { type: "string" as const },
  },
  required: [...required, "confidence", "reasoning"],
  additionalProperties: false,
});

const RESPONSE_SCHEMA = {
  type: "object" as const,
  properties: {
    appointments: {
      type: "array" as const,
      items: itemProps(
        {
          title: { type: "string" as const },
          startTime: {
            type: "string" as const,
            description: "ISO 8601 datetime",
          },
          allDay: { type: "boolean" as const },
        },
        ["title", "startTime", "allDay"],
      ),
    },
    tasks: {
      type: "array" as const,
      items: itemProps(
        {
          title: { type: "string" as const },
          dueDate: {
            type: ["string", "null"] as const,
            description: "ISO 8601 datetime, or null if no due date",
          },
        },
        ["title", "dueDate"],
      ),
    },
    notes: {
      type: "array" as const,
      items: itemProps({ content: { type: "string" as const } }, ["content"]),
    },
    ideas: {
      type: "array" as const,
      items: itemProps({ content: { type: "string" as const } }, ["content"]),
    },
    shoppingItems: {
      type: "array" as const,
      items: itemProps({ item: { type: "string" as const } }, ["item"]),
    },
    prayerRequests: {
      type: "array" as const,
      items: itemProps({ content: { type: "string" as const } }, ["content"]),
    },
  },
  required: [
    "appointments",
    "tasks",
    "notes",
    "ideas",
    "shoppingItems",
    "prayerRequests",
  ],
  additionalProperties: false,
};

interface RawExtraction {
  appointments: Array<{
    title: string;
    startTime: string;
    allDay: boolean;
    confidence: number;
    reasoning: string;
  }>;
  tasks: Array<{
    title: string;
    dueDate: string | null;
    confidence: number;
    reasoning: string;
  }>;
  notes: Array<{ content: string; confidence: number; reasoning: string }>;
  ideas: Array<{ content: string; confidence: number; reasoning: string }>;
  shoppingItems: Array<{
    item: string;
    confidence: number;
    reasoning: string;
  }>;
  prayerRequests: Array<{
    content: string;
    confidence: number;
    reasoning: string;
  }>;
}

function toExtractionResult(raw: RawExtraction): ExtractionResult {
  return {
    appointments: raw.appointments.map((a) => ({
      ...a,
      startTime: new Date(a.startTime),
    })),
    tasks: raw.tasks.map((t) => ({
      ...t,
      dueDate: t.dueDate ? new Date(t.dueDate) : null,
    })),
    notes: raw.notes,
    ideas: raw.ideas,
    shoppingItems: raw.shoppingItems,
    prayerRequests: raw.prayerRequests,
  };
}

const VERIFY_SYSTEM_PROMPT = `You are the second-pass reviewer for Felicity's brain dump extraction. You'll be given the original transcript and a draft extraction that another pass already produced. Your job is to correct the draft, not redo it from scratch — most items are probably fine.

Go through the draft and:
- Remove or reclassify any item that isn't actually concretely supported by the transcript. In particular: vague aspirations/habits, venting/complaints, rhetorical self-questions, and hypothetical musing should never be tasks or appointments — move them to notes (aspirations/venting/questions) or ideas (musing), or drop them entirely if they're pure filler with nothing worth keeping.
- Look for any real, concrete item in the transcript that the draft missed entirely, and add it in the right category.
- Fix any date/time resolved incorrectly against the given current date/time.
- Don't invent details that aren't in the transcript, and don't second-guess items that are already clearly correct.

Return the complete, corrected extraction in the same schema — not a diff.`;

async function runExtractionCall(
  systemPrompt: string,
  userContent: string,
): Promise<RawExtraction> {
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "extraction_result",
        strict: true,
        schema: RESPONSE_SCHEMA,
      },
    },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Extraction model returned no content");
  }

  return JSON.parse(content) as RawExtraction;
}

async function llmExtract(transcript: string): Promise<ExtractionResult> {
  const now = new Date();
  const nowIso = now.toISOString();

  const draft = await runExtractionCall(
    SYSTEM_PROMPT,
    `Current date/time: ${nowIso}\n\nBrain dump transcript:\n"""\n${transcript}\n"""`,
  );

  // Second pass: re-check the draft against the source transcript so
  // hallucinated/over-eager items get caught without a stricter first-pass
  // prompt costing us real items it should have kept.
  const refined = await runExtractionCall(
    VERIFY_SYSTEM_PROMPT,
    `Current date/time: ${nowIso}\n\nOriginal transcript:\n"""\n${transcript}\n"""\n\nDraft extraction:\n${JSON.stringify(draft)}`,
  );

  return toExtractionResult(refined);
}

export const llmExtractionEngine: ExtractionEngine = {
  extract: llmExtract,
};
