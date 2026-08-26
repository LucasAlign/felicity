import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table, required for Replit Auth.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table, required for Replit Auth.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  // Null until the user finishes (or explicitly skips) the onboarding
  // conversation. Never reset by the Replit Auth login upsert, since that
  // only ever sends profile claim fields.
  onboardingCompletedAt: timestamp("onboarding_completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users);
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Every AI-touched item records where it came from and how sure the AI was.
export const itemSourceEnum = pgEnum("item_source", [
  "brain_dump",
  "manual_entry",
  "ocr_upload",
  "ai_conversation",
  "google_calendar",
]);

// Only meaningful once an appointment has an externalId (i.e. it's linked to
// a Google Calendar event). "synced" means both sides agree as of the last
// sync pass; "pending_push" means a local write hasn't reached Google yet
// (created/edited while disconnected, or the push call failed); "conflict"
// means both sides changed since the last sync and neither was auto-resolved.
export const appointmentSyncStatusEnum = pgEnum("appointment_sync_status", [
  "synced",
  "pending_push",
  "conflict",
]);

// A project groups categories (and, through them, the tasks/appointments
// tagged with those categories) under a named initiative. Per-user; categories
// point at a project via categories.projectId, and a category with no project
// is just a free-standing label. (#16)
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  name: varchar("name").notNull(),
  description: text("description"),
  // Optional accent color for the project card (hex).
  color: varchar("color"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projects, {
  name: z.string().trim().min(1, "name is required"),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "color must be a #rrggbb hex string")
    .optional(),
}).omit({ id: true, userId: true, createdAt: true, updatedAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// Color-coded categories for appointments/tasks (people, contexts, ministries).
// Per-user and editable; a fixed set is seeded on first use (see
// storage.ensureDefaultCategories). `color` is a hex string rendered inline so
// the UI needs no color-name → class lookup. `parentId` is a self-reference
// enabling sub-categories (e.g. KeyFam / Twigs nested under Ministries). An
// item with no category (categoryId = null) is treated as "Unassigned".
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  name: varchar("name").notNull(),
  color: varchar("color").notNull(),
  parentId: integer("parent_id").references((): AnyPgColumn => categories.id, {
    onDelete: "cascade",
  }),
  // Optional owning project; null = a free-standing label not under a project.
  projectId: integer("project_id").references(() => projects.id, {
    onDelete: "set null",
  }),
  // Ordering hint for display; lower sorts first.
  sortOrder: integer("sort_order").notNull().default(0),
  // Marks the seeded defaults so they can be distinguished from user-created
  // ones (and re-seeding can be made idempotent).
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCategorySchema = createInsertSchema(categories, {
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "color must be a #rrggbb hex string"),
}).omit({
  id: true,
  userId: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  title: varchar("title").notNull(),
  description: text("description"),
  location: varchar("location"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  allDay: boolean("all_day").notNull().default(false),
  // Optional color-coding; null = "Unassigned" (rendered teal).
  categoryId: integer("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  source: itemSourceEnum("source").notNull().default("manual_entry"),
  confidence: real("confidence"),
  aiReasoning: text("ai_reasoning"),
  // Google Calendar sync bookkeeping — all null/default for appointments that
  // have never touched Google. externalId is that event's id on the synced
  // calendar; googleUpdatedAt mirrors Google's `updated` field as of the last
  // successful push or pull, which is what lets the sync engine tell "this is
  // just our own change echoing back" apart from "Google actually changed
  // it" without needing a separate outbox table.
  externalId: varchar("external_id"),
  googleUpdatedAt: timestamp("google_updated_at"),
  syncStatus: appointmentSyncStatusEnum("sync_status")
    .notNull()
    .default("synced"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAppointmentSchema = createInsertSchema(appointments, {
  startTime: z.coerce.date(),
  endTime: z.coerce.date().nullish(),
}).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  externalId: true,
  googleUpdatedAt: true,
  syncStatus: true,
});
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  title: varchar("title").notNull(),
  description: text("description"),
  // Optional and unscheduled by default; the AI may suggest a placement but never fixes it.
  dueDate: timestamp("due_date"),
  completed: boolean("completed").notNull().default(false),
  // When the task was marked complete. Drives the "cross off, keep visible for
  // 12h, then archive" behavior — a completed task older than 12h is hidden
  // from the active list. Null whenever `completed` is false.
  completedAt: timestamp("completed_at"),
  // Optional color-coding; null = "Unassigned" (rendered teal).
  categoryId: integer("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  source: itemSourceEnum("source").notNull().default("manual_entry"),
  confidence: real("confidence"),
  aiReasoning: text("ai_reasoning"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasks, {
  dueDate: z.coerce.date().nullish(),
}).omit({
  id: true,
  userId: true,
  // completedAt is derived server-side from the `completed` flag, never set
  // directly by clients.
  completedAt: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  content: text("content").notNull(),
  source: itemSourceEnum("source").notNull().default("manual_entry"),
  confidence: real("confidence"),
  aiReasoning: text("ai_reasoning"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertNoteSchema = createInsertSchema(notes).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Note = typeof notes.$inferSelect;

export const ideas = pgTable("ideas", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  content: text("content").notNull(),
  source: itemSourceEnum("source").notNull().default("manual_entry"),
  confidence: real("confidence"),
  aiReasoning: text("ai_reasoning"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertIdeaSchema = createInsertSchema(ideas).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertIdea = z.infer<typeof insertIdeaSchema>;
export type Idea = typeof ideas.$inferSelect;

export const shoppingItems = pgTable("shopping_items", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  item: varchar("item").notNull(),
  completed: boolean("completed").notNull().default(false),
  source: itemSourceEnum("source").notNull().default("manual_entry"),
  confidence: real("confidence"),
  aiReasoning: text("ai_reasoning"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertShoppingItemSchema = createInsertSchema(
  shoppingItems,
).omit({ id: true, userId: true, createdAt: true, updatedAt: true });
export type InsertShoppingItem = z.infer<typeof insertShoppingItemSchema>;
export type ShoppingItem = typeof shoppingItems.$inferSelect;

export const prayerRequests = pgTable("prayer_requests", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  content: text("content").notNull(),
  answered: boolean("answered").notNull().default(false),
  source: itemSourceEnum("source").notNull().default("manual_entry"),
  confidence: real("confidence"),
  aiReasoning: text("ai_reasoning"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPrayerRequestSchema = createInsertSchema(
  prayerRequests,
).omit({ id: true, userId: true, createdAt: true, updatedAt: true });
export type InsertPrayerRequest = z.infer<typeof insertPrayerRequestSchema>;
export type PrayerRequest = typeof prayerRequests.$inferSelect;

// User-authored "words of wisdom" — short quotes/maxims surfaced in What I
// Know and rotated one-per-day beneath the Bible verse on the dashboard
// (see client/src/lib/wisdom.ts). Distinct from `memories`, which are
// AI-suggested, permission-based patterns rather than curated quotes. (#15)
export const wisdomEntries = pgTable("wisdom_entries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  content: text("content").notNull(),
  // Optional attribution (e.g. "Proverbs", "Grandma", "C.S. Lewis").
  source: varchar("source"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWisdomEntrySchema = createInsertSchema(wisdomEntries, {
  content: z.string().trim().min(1, "content is required"),
  source: z.string().trim().optional(),
}).omit({ id: true, userId: true, createdAt: true, updatedAt: true });
export type InsertWisdomEntry = z.infer<typeof insertWisdomEntrySchema>;
export type WisdomEntry = typeof wisdomEntries.$inferSelect;

// Meal planning: one planned meal per (day, slot). Surfaced in the dashboard
// meal-planning window. `date` is the calendar day the meal is for, stored at
// local midnight by the client. (#14)
export const mealSlotEnum = pgEnum("meal_slot", [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
]);
export type MealSlot = (typeof mealSlotEnum.enumValues)[number];

export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  date: timestamp("date").notNull(),
  slot: mealSlotEnum("slot").notNull(),
  title: varchar("title").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMealSchema = createInsertSchema(meals, {
  date: z.coerce.date(),
  title: z.string().trim().min(1, "title is required"),
}).omit({ id: true, userId: true, createdAt: true, updatedAt: true });
export type InsertMeal = z.infer<typeof insertMealSchema>;
export type Meal = typeof meals.$inferSelect;

// A single Brain Dump session: the raw transcript plus a record of what
// extraction produced from it, so the summary screen and history stay
// accurate even as the underlying extraction engine changes later.
export const brainDumps = pgTable("brain_dumps", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  transcript: text("transcript").notNull(),
  inputMethod: varchar("input_method").notNull().default("voice"),
  extractedCounts: jsonb("extracted_counts").$type<Record<string, number>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Extensible for future reminder types (task due dates, etc.) — only
// appointment reminders are generated today.
export const notificationTypeEnum = pgEnum("notification_type", [
  "appointment_reminder",
]);

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  type: notificationTypeEnum("type").notNull(),
  appointmentId: integer("appointment_id").references(
    () => appointments.id,
    { onDelete: "cascade" },
  ),
  message: varchar("message").notNull(),
  // When this reminder should become visible to the user.
  remindAt: timestamp("remind_at").notNull(),
  // Set once the background scheduler has handed this off to a push
  // channel (currently a no-op stub — see server/push.ts). Distinct from
  // `dismissed`, which tracks whether the user has cleared it in-app.
  firedAt: timestamp("fired_at"),
  dismissed: boolean("dismissed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications, {
  remindAt: z.coerce.date(),
}).omit({ id: true, userId: true, firedAt: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Long-term memory is always permission-based: the engine only ever
// *suggests* a pattern it noticed; nothing here becomes "confirmed" without
// the user saying yes. See server/memoryEngine.ts for how candidates are
// detected.
export const memoryCategoryEnum = pgEnum("memory_category", [
  "family",
  "church",
  "homeschool",
  "household",
  "shopping",
  "meals",
  "work",
  "business",
  "health",
  "notifications",
]);

export const memoryStatusEnum = pgEnum("memory_status", [
  "pending",
  "confirmed",
  "dismissed",
]);

export type MemoryCategory = (typeof memoryCategoryEnum.enumValues)[number];

export const memories = pgTable("memories", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  category: memoryCategoryEnum("category").notNull(),
  content: text("content").notNull(),
  status: memoryStatusEnum("status").notNull().default("pending"),
  // Identifies the recurring pattern this memory came from (e.g.
  // "shopping_day:thursday"), so the detection engine can avoid suggesting
  // the same thing twice and can honor "don't ask again".
  patternKey: varchar("pattern_key"),
  neverAskAgain: boolean("never_ask_again").notNull().default(false),
  confidence: real("confidence"),
  aiReasoning: text("ai_reasoning"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMemorySchema = createInsertSchema(memories).omit({
  id: true,
  userId: true,
  status: true,
  neverAskAgain: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMemory = z.infer<typeof insertMemorySchema>;
export type Memory = typeof memories.$inferSelect;

export const insertBrainDumpSchema = createInsertSchema(brainDumps, {
  extractedCounts: z.record(z.string(), z.number()).optional(),
}).omit({
  id: true,
  userId: true,
  createdAt: true,
});
export type InsertBrainDump = z.infer<typeof insertBrainDumpSchema>;
export type BrainDump = typeof brainDumps.$inferSelect;

// One row per user — a single Google account/calendar can be linked at a
// time. Tokens are Google OAuth tokens, entirely separate from the Replit
// Auth session (Replit Auth never grants Google Calendar scopes).
export const googleCalendarConnections = pgTable("google_calendar_connections", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  // Unix seconds, matching how the access token's own expiry is expressed.
  expiresAt: integer("expires_at").notNull(),
  googleCalendarId: varchar("google_calendar_id").notNull().default("primary"),
  // Google's incremental-sync cursor for events.list. Null forces a full
  // resync (also forced on a 410 Gone response, which means this token
  // expired on Google's side).
  syncToken: text("sync_token"),
  enabled: boolean("enabled").notNull().default(true),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type GoogleCalendarConnection =
  typeof googleCalendarConnections.$inferSelect;
export type UpsertGoogleCalendarConnection =
  typeof googleCalendarConnections.$inferInsert;
