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
]);

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
  source: itemSourceEnum("source").notNull().default("manual_entry"),
  confidence: real("confidence"),
  aiReasoning: text("ai_reasoning"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAppointmentSchema = createInsertSchema(appointments, {
  startTime: z.coerce.date(),
  endTime: z.coerce.date().nullish(),
}).omit({ id: true, userId: true, createdAt: true, updatedAt: true });
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
  source: itemSourceEnum("source").notNull().default("manual_entry"),
  confidence: real("confidence"),
  aiReasoning: text("ai_reasoning"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasks, {
  dueDate: z.coerce.date().nullish(),
}).omit({ id: true, userId: true, createdAt: true, updatedAt: true });
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
