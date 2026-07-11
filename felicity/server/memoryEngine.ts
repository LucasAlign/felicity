import { format } from "date-fns";
import type { MemoryCategory } from "@shared/schema";
import { storage } from "./storage";

export interface MemoryCandidate {
  category: MemoryCategory;
  content: string;
  patternKey: string;
  confidence: number;
  reasoning: string;
}

// Detection is intentionally behind an interface, same as the extraction
// engine (see server/extraction.ts) — today it's rule-based frequency
// counting over existing items; an LLM-backed engine could replace it later
// without touching the routes that call it.
export interface MemoryDetectionEngine {
  detect(userId: string): Promise<MemoryCandidate[]>;
}

const MIN_OCCURRENCES = 3;

function weekdayName(date: Date): string {
  return format(date, "EEEE");
}

const CATEGORY_KEYWORDS: Array<{ category: MemoryCategory; pattern: RegExp }> = [
  { category: "church", pattern: /\b(church|worship|bible study|youth group|sunday school)\b/i },
  { category: "homeschool", pattern: /\b(school|homeschool|co-?op|class|tutor)\b/i },
  { category: "health", pattern: /\b(doctor|dentist|therapy|checkup|appointment)\b/i },
  { category: "household", pattern: /\b(clean|laundry|trash|chores?)\b/i },
  { category: "shopping", pattern: /\b(grocery|groceries|shopping|store)\b/i },
  { category: "meals", pattern: /\b(meal|dinner|cook|recipe)\b/i },
  { category: "work", pattern: /\b(work|meeting|client|office)\b/i },
];

function categorize(title: string): MemoryCategory {
  const match = CATEGORY_KEYWORDS.find((c) => c.pattern.test(title));
  return match?.category ?? "family";
}

function topWeekday(dates: Date[]): { day: string; count: number } | null {
  const counts = new Map<string, number>();
  for (const d of dates) {
    const day = weekdayName(d);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  let best: { day: string; count: number } | null = null;
  for (const [day, count] of counts) {
    if (!best || count > best.count) best = { day, count };
  }
  return best;
}

async function ruleBasedDetect(userId: string): Promise<MemoryCandidate[]> {
  const candidates: MemoryCandidate[] = [];

  const shoppingItems = await storage.listShoppingItems(userId);
  const shoppingDay = topWeekday(
    shoppingItems
      .filter((i) => i.createdAt)
      .map((i) => new Date(i.createdAt as Date)),
  );
  if (shoppingDay && shoppingDay.count >= MIN_OCCURRENCES) {
    candidates.push({
      category: "shopping",
      content: `You usually add shopping items on ${shoppingDay.day}s.`,
      patternKey: `shopping_day:${shoppingDay.day.toLowerCase()}`,
      confidence: Math.min(0.5 + shoppingDay.count * 0.05, 0.9),
      reasoning: `${shoppingDay.count} shopping items were added on a ${shoppingDay.day} recently.`,
    });
  }

  const appointments = await storage.listAppointments(userId);
  const byTitleKey = new Map<string, typeof appointments>();
  for (const a of appointments) {
    const key = a.title.trim().toLowerCase();
    const list = byTitleKey.get(key) ?? [];
    list.push(a);
    byTitleKey.set(key, list);
  }
  for (const [titleKey, list] of byTitleKey) {
    if (list.length < MIN_OCCURRENCES) continue;
    const day = topWeekday(list.map((a) => new Date(a.startTime)));
    if (!day || day.count < MIN_OCCURRENCES) continue;
    const category = categorize(titleKey);
    candidates.push({
      category,
      content: `You usually have "${list[0].title}" on ${day.day}s.`,
      patternKey: `appointment_day:${titleKey}:${day.day.toLowerCase()}`,
      confidence: Math.min(0.5 + day.count * 0.05, 0.9),
      reasoning: `"${list[0].title}" appeared ${day.count} times on a ${day.day} recently.`,
    });
  }

  const tasks = await storage.listTasks(userId);
  const byTaskTitleKey = new Map<string, typeof tasks>();
  for (const t of tasks) {
    const key = t.title.trim().toLowerCase();
    const list = byTaskTitleKey.get(key) ?? [];
    list.push(t);
    byTaskTitleKey.set(key, list);
  }
  for (const [titleKey, list] of byTaskTitleKey) {
    if (list.length < MIN_OCCURRENCES) continue;
    const dated = list.filter((t) => t.dueDate);
    const day = topWeekday(dated.map((t) => new Date(t.dueDate as Date)));
    if (!day || day.count < MIN_OCCURRENCES) continue;
    const category = categorize(titleKey);
    candidates.push({
      category,
      content: `You often schedule "${list[0].title}" on ${day.day}s.`,
      patternKey: `task_day:${titleKey}:${day.day.toLowerCase()}`,
      confidence: Math.min(0.5 + day.count * 0.05, 0.9),
      reasoning: `"${list[0].title}" was due ${day.count} times on a ${day.day} recently.`,
    });
  }

  return candidates;
}

export const ruleBasedMemoryEngine: MemoryDetectionEngine = {
  detect: ruleBasedDetect,
};

// Swap this binding for an LLM-backed engine when ready — everything that
// calls memoryEngine.detect() stays the same.
export const memoryEngine: MemoryDetectionEngine = ruleBasedMemoryEngine;

// Runs detection and persists any newly-seen patterns as pending
// suggestions. Patterns already known for this user (pending, confirmed,
// dismissed, or "don't ask again") are skipped so nothing is suggested
// twice — see the never-ask-again permission flow in the memories route.
export async function scanForMemories(userId: string): Promise<void> {
  const candidates = await memoryEngine.detect(userId);
  for (const candidate of candidates) {
    const existing = await storage.findMemoryByPatternKey(
      userId,
      candidate.patternKey,
    );
    if (existing) continue;
    await storage.createMemory(userId, {
      category: candidate.category,
      content: candidate.content,
      patternKey: candidate.patternKey,
      confidence: candidate.confidence,
      aiReasoning: candidate.reasoning,
    });
  }
}
