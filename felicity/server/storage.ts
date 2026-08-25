import {
  users,
  appointments,
  tasks,
  notes,
  ideas,
  shoppingItems,
  prayerRequests,
  brainDumps,
  notifications,
  memories,
  googleCalendarConnections,
  type MemoryCategory,
  type User,
  type UpsertUser,
  type Appointment,
  type InsertAppointment,
  type Task,
  type InsertTask,
  type Note,
  type InsertNote,
  type Idea,
  type InsertIdea,
  type ShoppingItem,
  type InsertShoppingItem,
  type PrayerRequest,
  type InsertPrayerRequest,
  type BrainDump,
  type InsertBrainDump,
  type Notification,
  type InsertNotification,
  type Memory,
  type InsertMemory,
  type GoogleCalendarConnection,
} from "@shared/schema";
import { db } from "./db";
import { and, desc, eq, isNull, lte } from "drizzle-orm";

type AppointmentSyncState = {
  externalId?: string | null;
  googleUpdatedAt?: Date | null;
  syncStatus?: "synced" | "pending_push" | "conflict";
};

type GoogleCalendarConnectionInput = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  googleCalendarId?: string;
};

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  completeOnboarding(userId: string): Promise<User>;

  listAppointments(userId: string): Promise<Appointment[]>;
  getAppointment(userId: string, id: number): Promise<Appointment | undefined>;
  getAppointmentByExternalId(
    userId: string,
    externalId: string,
  ): Promise<Appointment | undefined>;
  listAppointmentsPendingPush(userId: string): Promise<Appointment[]>;
  createAppointment(
    userId: string,
    data: InsertAppointment,
    syncState?: AppointmentSyncState,
  ): Promise<Appointment>;
  updateAppointment(
    userId: string,
    id: number,
    data: Partial<InsertAppointment>,
    syncState?: AppointmentSyncState,
  ): Promise<Appointment | undefined>;
  deleteAppointment(userId: string, id: number): Promise<boolean>;

  getGoogleCalendarConnection(
    userId: string,
  ): Promise<GoogleCalendarConnection | undefined>;
  listEnabledGoogleCalendarConnections(): Promise<GoogleCalendarConnection[]>;
  upsertGoogleCalendarConnection(
    userId: string,
    data: GoogleCalendarConnectionInput,
  ): Promise<GoogleCalendarConnection>;
  updateGoogleCalendarConnection(
    userId: string,
    data: Partial<GoogleCalendarConnectionInput> & {
      syncToken?: string | null;
      enabled?: boolean;
      lastSyncedAt?: Date;
    },
  ): Promise<GoogleCalendarConnection | undefined>;
  deleteGoogleCalendarConnection(userId: string): Promise<boolean>;

  listTasks(userId: string): Promise<Task[]>;
  createTask(userId: string, data: InsertTask): Promise<Task>;
  updateTask(
    userId: string,
    id: number,
    data: Partial<InsertTask>,
  ): Promise<Task | undefined>;
  deleteTask(userId: string, id: number): Promise<boolean>;

  listNotes(userId: string): Promise<Note[]>;
  createNote(userId: string, data: InsertNote): Promise<Note>;
  updateNote(
    userId: string,
    id: number,
    data: Partial<InsertNote>,
  ): Promise<Note | undefined>;
  deleteNote(userId: string, id: number): Promise<boolean>;

  listIdeas(userId: string): Promise<Idea[]>;
  createIdea(userId: string, data: InsertIdea): Promise<Idea>;
  updateIdea(
    userId: string,
    id: number,
    data: Partial<InsertIdea>,
  ): Promise<Idea | undefined>;
  deleteIdea(userId: string, id: number): Promise<boolean>;

  listShoppingItems(userId: string): Promise<ShoppingItem[]>;
  createShoppingItem(
    userId: string,
    data: InsertShoppingItem,
  ): Promise<ShoppingItem>;
  updateShoppingItem(
    userId: string,
    id: number,
    data: Partial<InsertShoppingItem>,
  ): Promise<ShoppingItem | undefined>;
  deleteShoppingItem(userId: string, id: number): Promise<boolean>;

  listPrayerRequests(userId: string): Promise<PrayerRequest[]>;
  createPrayerRequest(
    userId: string,
    data: InsertPrayerRequest,
  ): Promise<PrayerRequest>;
  updatePrayerRequest(
    userId: string,
    id: number,
    data: Partial<InsertPrayerRequest>,
  ): Promise<PrayerRequest | undefined>;
  deletePrayerRequest(userId: string, id: number): Promise<boolean>;

  listBrainDumps(userId: string): Promise<BrainDump[]>;
  createBrainDump(userId: string, data: InsertBrainDump): Promise<BrainDump>;

  createNotification(
    userId: string,
    data: InsertNotification,
  ): Promise<Notification>;
  listDueNotifications(userId: string, now: Date): Promise<Notification[]>;
  listUnfiredDueNotifications(now: Date): Promise<Notification[]>;
  markNotificationFired(id: number): Promise<void>;
  dismissNotification(
    userId: string,
    id: number,
  ): Promise<Notification | undefined>;
  replaceAppointmentReminders(
    userId: string,
    appointmentId: number,
    rows: InsertNotification[],
  ): Promise<void>;

  listMemories(userId: string): Promise<Memory[]>;
  findMemoryByPatternKey(
    userId: string,
    patternKey: string,
  ): Promise<Memory | undefined>;
  createMemory(userId: string, data: InsertMemory): Promise<Memory>;
  // Used only by the onboarding conversation: the user is deliberately
  // volunteering this, so it skips the pending/confirm suggestion flow
  // that auto-detected patterns go through.
  createConfirmedMemory(
    userId: string,
    data: { category: MemoryCategory; content: string },
  ): Promise<Memory>;
  updateMemory(
    userId: string,
    id: number,
    data: Partial<InsertMemory>,
  ): Promise<Memory | undefined>;
  respondToMemory(
    userId: string,
    id: number,
    response: "yes" | "no" | "dont_ask_again",
  ): Promise<Memory | undefined>;
  deleteMemory(userId: string, id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async completeOnboarding(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ onboardingCompletedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async listAppointments(userId: string): Promise<Appointment[]> {
    return db
      .select()
      .from(appointments)
      .where(eq(appointments.userId, userId));
  }

  async getAppointment(
    userId: string,
    id: number,
  ): Promise<Appointment | undefined> {
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(and(eq(appointments.id, id), eq(appointments.userId, userId)));
    return appointment;
  }

  async getAppointmentByExternalId(
    userId: string,
    externalId: string,
  ): Promise<Appointment | undefined> {
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.userId, userId),
          eq(appointments.externalId, externalId),
        ),
      );
    return appointment;
  }

  async listAppointmentsPendingPush(userId: string): Promise<Appointment[]> {
    return db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.userId, userId),
          eq(appointments.syncStatus, "pending_push"),
        ),
      );
  }

  async createAppointment(
    userId: string,
    data: InsertAppointment,
    syncState?: AppointmentSyncState,
  ): Promise<Appointment> {
    const [appointment] = await db
      .insert(appointments)
      .values({ ...data, userId, ...syncState })
      .returning();
    return appointment;
  }

  async updateAppointment(
    userId: string,
    id: number,
    data: Partial<InsertAppointment>,
    syncState?: AppointmentSyncState,
  ): Promise<Appointment | undefined> {
    const [appointment] = await db
      .update(appointments)
      .set({ ...data, ...syncState, updatedAt: new Date() })
      .where(and(eq(appointments.id, id), eq(appointments.userId, userId)))
      .returning();
    return appointment;
  }

  async deleteAppointment(userId: string, id: number): Promise<boolean> {
    const result = await db
      .delete(appointments)
      .where(and(eq(appointments.id, id), eq(appointments.userId, userId)))
      .returning({ id: appointments.id });
    return result.length > 0;
  }

  async listTasks(userId: string): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.userId, userId));
  }

  async createTask(userId: string, data: InsertTask): Promise<Task> {
    const [task] = await db
      .insert(tasks)
      .values({ ...data, userId })
      .returning();
    return task;
  }

  async updateTask(
    userId: string,
    id: number,
    data: Partial<InsertTask>,
  ): Promise<Task | undefined> {
    const [task] = await db
      .update(tasks)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();
    return task;
  }

  async deleteTask(userId: string, id: number): Promise<boolean> {
    const result = await db
      .delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning({ id: tasks.id });
    return result.length > 0;
  }

  async listNotes(userId: string): Promise<Note[]> {
    return db.select().from(notes).where(eq(notes.userId, userId));
  }

  async createNote(userId: string, data: InsertNote): Promise<Note> {
    const [note] = await db
      .insert(notes)
      .values({ ...data, userId })
      .returning();
    return note;
  }

  async updateNote(
    userId: string,
    id: number,
    data: Partial<InsertNote>,
  ): Promise<Note | undefined> {
    const [note] = await db
      .update(notes)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .returning();
    return note;
  }

  async deleteNote(userId: string, id: number): Promise<boolean> {
    const result = await db
      .delete(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .returning({ id: notes.id });
    return result.length > 0;
  }

  async listIdeas(userId: string): Promise<Idea[]> {
    return db.select().from(ideas).where(eq(ideas.userId, userId));
  }

  async createIdea(userId: string, data: InsertIdea): Promise<Idea> {
    const [idea] = await db
      .insert(ideas)
      .values({ ...data, userId })
      .returning();
    return idea;
  }

  async updateIdea(
    userId: string,
    id: number,
    data: Partial<InsertIdea>,
  ): Promise<Idea | undefined> {
    const [idea] = await db
      .update(ideas)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(ideas.id, id), eq(ideas.userId, userId)))
      .returning();
    return idea;
  }

  async deleteIdea(userId: string, id: number): Promise<boolean> {
    const result = await db
      .delete(ideas)
      .where(and(eq(ideas.id, id), eq(ideas.userId, userId)))
      .returning({ id: ideas.id });
    return result.length > 0;
  }

  async listShoppingItems(userId: string): Promise<ShoppingItem[]> {
    return db
      .select()
      .from(shoppingItems)
      .where(eq(shoppingItems.userId, userId));
  }

  async createShoppingItem(
    userId: string,
    data: InsertShoppingItem,
  ): Promise<ShoppingItem> {
    const [item] = await db
      .insert(shoppingItems)
      .values({ ...data, userId })
      .returning();
    return item;
  }

  async updateShoppingItem(
    userId: string,
    id: number,
    data: Partial<InsertShoppingItem>,
  ): Promise<ShoppingItem | undefined> {
    const [item] = await db
      .update(shoppingItems)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(shoppingItems.id, id), eq(shoppingItems.userId, userId)))
      .returning();
    return item;
  }

  async deleteShoppingItem(userId: string, id: number): Promise<boolean> {
    const result = await db
      .delete(shoppingItems)
      .where(and(eq(shoppingItems.id, id), eq(shoppingItems.userId, userId)))
      .returning({ id: shoppingItems.id });
    return result.length > 0;
  }

  async listPrayerRequests(userId: string): Promise<PrayerRequest[]> {
    return db
      .select()
      .from(prayerRequests)
      .where(eq(prayerRequests.userId, userId));
  }

  async createPrayerRequest(
    userId: string,
    data: InsertPrayerRequest,
  ): Promise<PrayerRequest> {
    const [request] = await db
      .insert(prayerRequests)
      .values({ ...data, userId })
      .returning();
    return request;
  }

  async updatePrayerRequest(
    userId: string,
    id: number,
    data: Partial<InsertPrayerRequest>,
  ): Promise<PrayerRequest | undefined> {
    const [request] = await db
      .update(prayerRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(eq(prayerRequests.id, id), eq(prayerRequests.userId, userId)),
      )
      .returning();
    return request;
  }

  async deletePrayerRequest(userId: string, id: number): Promise<boolean> {
    const result = await db
      .delete(prayerRequests)
      .where(
        and(eq(prayerRequests.id, id), eq(prayerRequests.userId, userId)),
      )
      .returning({ id: prayerRequests.id });
    return result.length > 0;
  }

  async listBrainDumps(userId: string): Promise<BrainDump[]> {
    return db
      .select()
      .from(brainDumps)
      .where(eq(brainDumps.userId, userId));
  }

  async createBrainDump(
    userId: string,
    data: InsertBrainDump,
  ): Promise<BrainDump> {
    const [dump] = await db
      .insert(brainDumps)
      .values({ ...data, userId })
      .returning();
    return dump;
  }

  async createNotification(
    userId: string,
    data: InsertNotification,
  ): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values({ ...data, userId })
      .returning();
    return notification;
  }

  async listDueNotifications(
    userId: string,
    now: Date,
  ): Promise<Notification[]> {
    return db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.dismissed, false),
          lte(notifications.remindAt, now),
        ),
      )
      .orderBy(desc(notifications.remindAt));
  }

  async listUnfiredDueNotifications(now: Date): Promise<Notification[]> {
    return db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.dismissed, false),
          isNull(notifications.firedAt),
          lte(notifications.remindAt, now),
        ),
      );
  }

  async markNotificationFired(id: number): Promise<void> {
    await db
      .update(notifications)
      .set({ firedAt: new Date() })
      .where(eq(notifications.id, id));
  }

  async dismissNotification(
    userId: string,
    id: number,
  ): Promise<Notification | undefined> {
    const [notification] = await db
      .update(notifications)
      .set({ dismissed: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();
    return notification;
  }

  // Atomically swap an appointment's reminders: clear the existing rows and
  // insert the new set in a single transaction, so a failure can never leave
  // the appointment with reminders half-deleted. Scoped by userId as
  // defense-in-depth even though appointmentId is already user-owned.
  async replaceAppointmentReminders(
    userId: string,
    appointmentId: number,
    rows: InsertNotification[],
  ): Promise<void> {
    await db.transaction(async (tx) => {
      await tx
        .delete(notifications)
        .where(
          and(
            eq(notifications.appointmentId, appointmentId),
            eq(notifications.userId, userId),
          ),
        );
      if (rows.length > 0) {
        await tx
          .insert(notifications)
          .values(rows.map((r) => ({ ...r, userId })));
      }
    });
  }

  async listMemories(userId: string): Promise<Memory[]> {
    return db
      .select()
      .from(memories)
      .where(eq(memories.userId, userId))
      .orderBy(desc(memories.createdAt));
  }

  async findMemoryByPatternKey(
    userId: string,
    patternKey: string,
  ): Promise<Memory | undefined> {
    const [memory] = await db
      .select()
      .from(memories)
      .where(
        and(eq(memories.userId, userId), eq(memories.patternKey, patternKey)),
      );
    return memory;
  }

  async createMemory(userId: string, data: InsertMemory): Promise<Memory> {
    const [memory] = await db
      .insert(memories)
      .values({ ...data, userId })
      .returning();
    return memory;
  }

  async createConfirmedMemory(
    userId: string,
    data: { category: MemoryCategory; content: string },
  ): Promise<Memory> {
    const [memory] = await db
      .insert(memories)
      .values({ ...data, userId, status: "confirmed" })
      .returning();
    return memory;
  }

  async updateMemory(
    userId: string,
    id: number,
    data: Partial<InsertMemory>,
  ): Promise<Memory | undefined> {
    const [memory] = await db
      .update(memories)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(memories.id, id), eq(memories.userId, userId)))
      .returning();
    return memory;
  }

  async respondToMemory(
    userId: string,
    id: number,
    response: "yes" | "no" | "dont_ask_again",
  ): Promise<Memory | undefined> {
    const [memory] = await db
      .update(memories)
      .set({
        status: response === "yes" ? "confirmed" : "dismissed",
        neverAskAgain: response === "dont_ask_again",
        updatedAt: new Date(),
      })
      .where(and(eq(memories.id, id), eq(memories.userId, userId)))
      .returning();
    return memory;
  }

  async deleteMemory(userId: string, id: number): Promise<boolean> {
    const result = await db
      .delete(memories)
      .where(and(eq(memories.id, id), eq(memories.userId, userId)))
      .returning({ id: memories.id });
    return result.length > 0;
  }

  async getGoogleCalendarConnection(
    userId: string,
  ): Promise<GoogleCalendarConnection | undefined> {
    const [connection] = await db
      .select()
      .from(googleCalendarConnections)
      .where(eq(googleCalendarConnections.userId, userId));
    return connection;
  }

  async listEnabledGoogleCalendarConnections(): Promise<
    GoogleCalendarConnection[]
  > {
    return db
      .select()
      .from(googleCalendarConnections)
      .where(eq(googleCalendarConnections.enabled, true));
  }

  async upsertGoogleCalendarConnection(
    userId: string,
    data: GoogleCalendarConnectionInput,
  ): Promise<GoogleCalendarConnection> {
    const [connection] = await db
      .insert(googleCalendarConnections)
      .values({ ...data, userId })
      .onConflictDoUpdate({
        target: googleCalendarConnections.userId,
        set: {
          ...data,
          // Reconnecting always resumes syncing and starts from a clean
          // cursor — the previous syncToken belonged to the old grant.
          enabled: true,
          syncToken: null,
          updatedAt: new Date(),
        },
      })
      .returning();
    return connection;
  }

  async updateGoogleCalendarConnection(
    userId: string,
    data: Partial<GoogleCalendarConnectionInput> & {
      syncToken?: string | null;
      enabled?: boolean;
      lastSyncedAt?: Date;
    },
  ): Promise<GoogleCalendarConnection | undefined> {
    const [connection] = await db
      .update(googleCalendarConnections)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(googleCalendarConnections.userId, userId))
      .returning();
    return connection;
  }

  async deleteGoogleCalendarConnection(userId: string): Promise<boolean> {
    const result = await db
      .delete(googleCalendarConnections)
      .where(eq(googleCalendarConnections.userId, userId))
      .returning({ id: googleCalendarConnections.id });
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
