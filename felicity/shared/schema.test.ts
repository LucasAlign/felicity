import assert from "node:assert/strict";
import test from "node:test";
import {
  insertAppointmentSchema,
  insertBrainDumpSchema,
  insertCategorySchema,
  insertMealSchema,
  insertMemorySchema,
  insertProjectSchema,
  insertTaskSchema,
} from "./schema";

test("appointment dates coerce while calendar ownership and sync fields stay server-owned", () => {
  const value = insertAppointmentSchema.parse({
    title: "Visit",
    startTime: "2026-11-10T12:00:00Z",
    endTime: null,
    id: 42,
    userId: "another-user",
    externalId: "another-event",
    syncStatus: "pending_push",
  });
  assert.equal(value.startTime.toISOString(), "2026-11-10T12:00:00.000Z");
  assert.equal(value.endTime, null);
  for (const key of ["id", "userId", "externalId", "syncStatus"]) {
    assert.equal(key in value, false);
  }
  assert.equal(insertAppointmentSchema.safeParse({ title: "Visit", startTime: "bad" }).success, false);
});

test("partial task updates preserve nullable dates and strip derived fields", () => {
  const value = insertTaskSchema.partial().parse({ dueDate: null, completedAt: "2026-11-10" });
  assert.equal(value.dueDate, null);
  assert.equal("completedAt" in value, false);
  assert.deepEqual(insertTaskSchema.partial().parse({}), {});
  assert.equal(insertTaskSchema.safeParse({ title: "Task", source: "untrusted-source" }).success, false);
});

test("project, category, and meal constraints retain their validation behavior", () => {
  assert.equal(insertProjectSchema.parse({ name: "  Support  " }).name, "Support");
  assert.equal(insertProjectSchema.safeParse({ name: "   " }).success, false);
  assert.equal(insertCategorySchema.safeParse({ name: "Care", color: "red" }).success, false);
  assert.equal(insertCategorySchema.parse({ name: "Care", color: "#12aBcF" }).color, "#12aBcF");
  assert.equal(insertMealSchema.parse({ title: " Lunch ", date: "2026-11-10", slot: "lunch" }).title, "Lunch");
  assert.equal(insertMealSchema.safeParse({ title: "Lunch", date: "2026-11-10", slot: "invalid" }).success, false);
});

test("memory approval fields cannot be supplied through the insert schema", () => {
  const value = insertMemorySchema.parse({ category: "family", content: "A note", status: "confirmed", neverAskAgain: true });
  assert.equal("status" in value, false);
  assert.equal("neverAskAgain" in value, false);
});

test("brain dump count records validate every value", () => {
  assert.deepEqual(insertBrainDumpSchema.parse({ transcript: "Note", extractedCounts: { tasks: 2 } }).extractedCounts, { tasks: 2 });
  const invalid = insertBrainDumpSchema.safeParse({ transcript: "Note", extractedCounts: { tasks: "two" } });
  assert.equal(invalid.success, false);
  if (!invalid.success) assert.equal(typeof invalid.error.message, "string");
});
