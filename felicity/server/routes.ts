import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { storage } from "./storage";
import {
  insertAppointmentSchema,
  insertTaskSchema,
  insertNoteSchema,
  insertIdeaSchema,
  insertShoppingItemSchema,
  insertPrayerRequestSchema,
  insertMemorySchema,
  memoryCategoryEnum,
} from "@shared/schema";
import { extractionEngine } from "./extraction";
import { syncAppointmentReminders } from "./notifications";
import { ocrEngine } from "./ocr";
import { scanForMemories } from "./memoryEngine";
import { z } from "zod";
import {
  exchangeGoogleAuthCode,
  getGoogleAuthUrl,
  getValidAccessToken,
} from "./googleCalendarAuth";
import { listCalendars } from "./googleCalendarClient";
import {
  deleteAppointmentFromGoogle,
  pushAppointmentToGoogle,
  runFullSync,
} from "./googleCalendarSync";

const googleCalendarSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  googleCalendarId: z.string().min(1).optional(),
});

const memoryResponseSchema = z.object({
  response: z.enum(["yes", "no", "dont_ask_again"]),
});

const onboardingAnswerSchema = z.object({
  category: z.enum(memoryCategoryEnum.enumValues),
  content: z.string().min(1),
});

const brainDumpRequestSchema = z.object({
  transcript: z.string().min(1),
  inputMethod: z.enum(["voice", "manual", "ocr_upload"]).default("voice"),
});

// Images are OCR'd in memory and discarded — nothing is written to disk,
// so there's no upload directory to manage or clean up.
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    res.json(user);
  });

  // Appointments — fixed date/time, protected, never moved without permission.
  app.get("/api/appointments", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const appointments = await storage.listAppointments(userId);
    res.json(appointments);
  });

  app.post("/api/appointments", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const parsed = insertAppointmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    let appointment = await storage.createAppointment(userId, parsed.data);
    await syncAppointmentReminders(userId, appointment);
    // Mirror to Google right away so it shows up there without waiting for
    // the next scheduled sync tick. Never fails the request — a Google hiccup
    // just leaves it "pending_push" for the periodic sync to retry.
    await pushAppointmentToGoogle(userId, appointment);
    appointment = (await storage.getAppointment(userId, appointment.id)) ?? appointment;
    res.status(201).json(appointment);
  });

  app.patch("/api/appointments/:id", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = Number(req.params.id);
    const parsed = insertAppointmentSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    let appointment = await storage.updateAppointment(userId, id, parsed.data);
    if (!appointment) return res.status(404).json({ message: "Not found" });
    await syncAppointmentReminders(userId, appointment);
    await pushAppointmentToGoogle(userId, appointment);
    appointment = (await storage.getAppointment(userId, id)) ?? appointment;
    res.json(appointment);
  });

  app.delete("/api/appointments/:id", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = Number(req.params.id);
    const appointment = await storage.getAppointment(userId, id);
    if (!appointment) return res.status(404).json({ message: "Not found" });
    await deleteAppointmentFromGoogle(userId, appointment);
    await storage.deleteAppointment(userId, id);
    res.status(204).end();
  });

  // Tasks — flexible, optional due date, unscheduled unless the user places them.
  app.get("/api/tasks", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const tasks = await storage.listTasks(userId);
    res.json(tasks);
  });

  app.post("/api/tasks", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const parsed = insertTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    const task = await storage.createTask(userId, parsed.data);
    res.status(201).json(task);
  });

  app.patch("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = Number(req.params.id);
    const parsed = insertTaskSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    const task = await storage.updateTask(userId, id, parsed.data);
    if (!task) return res.status(404).json({ message: "Not found" });
    res.json(task);
  });

  app.delete("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = Number(req.params.id);
    const deleted = await storage.deleteTask(userId, id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.status(204).end();
  });

  // Notes
  app.get("/api/notes", isAuthenticated, async (req: any, res) => {
    res.json(await storage.listNotes(req.user.claims.sub));
  });
  app.post("/api/notes", isAuthenticated, async (req: any, res) => {
    const parsed = insertNoteSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ message: parsed.error.message });
    res.status(201).json(await storage.createNote(req.user.claims.sub, parsed.data));
  });
  app.patch("/api/notes/:id", isAuthenticated, async (req: any, res) => {
    const parsed = insertNoteSchema.partial().safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ message: parsed.error.message });
    const note = await storage.updateNote(
      req.user.claims.sub,
      Number(req.params.id),
      parsed.data,
    );
    if (!note) return res.status(404).json({ message: "Not found" });
    res.json(note);
  });
  app.delete("/api/notes/:id", isAuthenticated, async (req: any, res) => {
    const deleted = await storage.deleteNote(
      req.user.claims.sub,
      Number(req.params.id),
    );
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.status(204).end();
  });

  // Ideas
  app.get("/api/ideas", isAuthenticated, async (req: any, res) => {
    res.json(await storage.listIdeas(req.user.claims.sub));
  });
  app.post("/api/ideas", isAuthenticated, async (req: any, res) => {
    const parsed = insertIdeaSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ message: parsed.error.message });
    res.status(201).json(await storage.createIdea(req.user.claims.sub, parsed.data));
  });
  app.patch("/api/ideas/:id", isAuthenticated, async (req: any, res) => {
    const parsed = insertIdeaSchema.partial().safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ message: parsed.error.message });
    const idea = await storage.updateIdea(
      req.user.claims.sub,
      Number(req.params.id),
      parsed.data,
    );
    if (!idea) return res.status(404).json({ message: "Not found" });
    res.json(idea);
  });
  app.delete("/api/ideas/:id", isAuthenticated, async (req: any, res) => {
    const deleted = await storage.deleteIdea(
      req.user.claims.sub,
      Number(req.params.id),
    );
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.status(204).end();
  });

  // Shopping items
  app.get("/api/shopping-items", isAuthenticated, async (req: any, res) => {
    res.json(await storage.listShoppingItems(req.user.claims.sub));
  });
  app.post("/api/shopping-items", isAuthenticated, async (req: any, res) => {
    const parsed = insertShoppingItemSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ message: parsed.error.message });
    res
      .status(201)
      .json(await storage.createShoppingItem(req.user.claims.sub, parsed.data));
  });
  app.patch(
    "/api/shopping-items/:id",
    isAuthenticated,
    async (req: any, res) => {
      const parsed = insertShoppingItemSchema.partial().safeParse(req.body);
      if (!parsed.success)
        return res.status(400).json({ message: parsed.error.message });
      const item = await storage.updateShoppingItem(
        req.user.claims.sub,
        Number(req.params.id),
        parsed.data,
      );
      if (!item) return res.status(404).json({ message: "Not found" });
      res.json(item);
    },
  );
  app.delete(
    "/api/shopping-items/:id",
    isAuthenticated,
    async (req: any, res) => {
      const deleted = await storage.deleteShoppingItem(
        req.user.claims.sub,
        Number(req.params.id),
      );
      if (!deleted) return res.status(404).json({ message: "Not found" });
      res.status(204).end();
    },
  );

  // Prayer requests
  app.get("/api/prayer-requests", isAuthenticated, async (req: any, res) => {
    res.json(await storage.listPrayerRequests(req.user.claims.sub));
  });
  app.post("/api/prayer-requests", isAuthenticated, async (req: any, res) => {
    const parsed = insertPrayerRequestSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ message: parsed.error.message });
    res
      .status(201)
      .json(await storage.createPrayerRequest(req.user.claims.sub, parsed.data));
  });
  app.patch(
    "/api/prayer-requests/:id",
    isAuthenticated,
    async (req: any, res) => {
      const parsed = insertPrayerRequestSchema.partial().safeParse(req.body);
      if (!parsed.success)
        return res.status(400).json({ message: parsed.error.message });
      const request = await storage.updatePrayerRequest(
        req.user.claims.sub,
        Number(req.params.id),
        parsed.data,
      );
      if (!request) return res.status(404).json({ message: "Not found" });
      res.json(request);
    },
  );
  app.delete(
    "/api/prayer-requests/:id",
    isAuthenticated,
    async (req: any, res) => {
      const deleted = await storage.deletePrayerRequest(
        req.user.claims.sub,
        Number(req.params.id),
      );
      if (!deleted) return res.status(404).json({ message: "Not found" });
      res.status(204).end();
    },
  );

  // OCR — reads text out of an uploaded photo (planner page, sticky note,
  // whiteboard, ...). Returns raw text only; the client feeds it into
  // /api/brain-dump (inputMethod: "ocr_upload") for review + extraction,
  // same as a voice transcript. The image itself is never persisted.
  app.post(
    "/api/ocr-upload",
    isAuthenticated,
    imageUpload.single("image"),
    async (req: any, res) => {
      if (!req.file) {
        return res.status(400).json({ message: "No image provided" });
      }
      try {
        const text = await ocrEngine.recognize(req.file.buffer);
        res.json({ text });
      } catch (err) {
        console.error("OCR failed:", err);
        res.status(500).json({
          message: "Couldn't read that image — try a clearer photo.",
        });
      }
    },
  );

  // Brain Dump — takes a transcript, runs it through the extraction engine,
  // and persists every item it found. The engine is swappable (see
  // server/extraction.ts); this route doesn't know or care whether it's
  // rule-based or LLM-backed.
  app.get("/api/brain-dumps", isAuthenticated, async (req: any, res) => {
    res.json(await storage.listBrainDumps(req.user.claims.sub));
  });

  app.post("/api/brain-dump", isAuthenticated, async (req: any, res) => {
    const parsed = brainDumpRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    const userId = req.user.claims.sub;
    const { transcript, inputMethod } = parsed.data;

    // "voice"/"manual" both came through the Brain Dump conversation flow;
    // "ocr_upload" is a distinct provenance per the item source enum.
    const source = inputMethod === "ocr_upload" ? "ocr_upload" : "brain_dump";

    const extracted = await extractionEngine.extract(transcript);

    const [createdAppointments, createdTasks, createdNotes, createdIdeas, createdShoppingItems, createdPrayerRequests] =
      await Promise.all([
        Promise.all(
          extracted.appointments.map((a) =>
            storage.createAppointment(userId, {
              title: a.title,
              startTime: a.startTime,
              allDay: a.allDay,
              source,
              confidence: a.confidence,
              aiReasoning: a.reasoning,
            }),
          ),
        ),
        Promise.all(
          extracted.tasks.map((t) =>
            storage.createTask(userId, {
              title: t.title,
              dueDate: t.dueDate,
              source,
              confidence: t.confidence,
              aiReasoning: t.reasoning,
            }),
          ),
        ),
        Promise.all(
          extracted.notes.map((n) =>
            storage.createNote(userId, {
              content: n.content,
              source,
              confidence: n.confidence,
              aiReasoning: n.reasoning,
            }),
          ),
        ),
        Promise.all(
          extracted.ideas.map((i) =>
            storage.createIdea(userId, {
              content: i.content,
              source,
              confidence: i.confidence,
              aiReasoning: i.reasoning,
            }),
          ),
        ),
        Promise.all(
          extracted.shoppingItems.map((s) =>
            storage.createShoppingItem(userId, {
              item: s.item,
              source,
              confidence: s.confidence,
              aiReasoning: s.reasoning,
            }),
          ),
        ),
        Promise.all(
          extracted.prayerRequests.map((p) =>
            storage.createPrayerRequest(userId, {
              content: p.content,
              source,
              confidence: p.confidence,
              aiReasoning: p.reasoning,
            }),
          ),
        ),
      ]);

    const brainDump = await storage.createBrainDump(userId, {
      transcript,
      inputMethod,
      extractedCounts: {
        appointments: createdAppointments.length,
        tasks: createdTasks.length,
        notes: createdNotes.length,
        ideas: createdIdeas.length,
        shoppingItems: createdShoppingItems.length,
        prayerRequests: createdPrayerRequests.length,
      },
    });

    // Best-effort: look for new recurring patterns worth suggesting as a
    // memory. Never let a detection hiccup fail the Brain Dump response.
    scanForMemories(userId).catch((err) =>
      console.error("Memory pattern scan failed:", err),
    );

    res.status(201).json({
      brainDump,
      appointments: createdAppointments,
      tasks: createdTasks,
      notes: createdNotes,
      ideas: createdIdeas,
      shoppingItems: createdShoppingItems,
      prayerRequests: createdPrayerRequests,
    });
  });

  // Notifications — currently just appointment reminders (1 day / 1 hour
  // before), regenerated whenever an appointment is created or updated.
  app.get("/api/notifications/due", isAuthenticated, async (req: any, res) => {
    const due = await storage.listDueNotifications(
      req.user.claims.sub,
      new Date(),
    );
    res.json(due);
  });

  app.patch(
    "/api/notifications/:id/dismiss",
    isAuthenticated,
    async (req: any, res) => {
      const notification = await storage.dismissNotification(
        req.user.claims.sub,
        Number(req.params.id),
      );
      if (!notification) return res.status(404).json({ message: "Not found" });
      res.json(notification);
    },
  );

  // Onboarding — a short, skippable first-run conversation. Answers are
  // volunteered directly by the user, so they land as confirmed memories
  // immediately instead of going through the pending/confirm flow that
  // auto-detected patterns use.
  app.post("/api/onboarding/answer", isAuthenticated, async (req: any, res) => {
    const parsed = onboardingAnswerSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ message: parsed.error.message });
    const memory = await storage.createConfirmedMemory(
      req.user.claims.sub,
      parsed.data,
    );
    res.status(201).json(memory);
  });

  app.post("/api/onboarding/complete", isAuthenticated, async (req: any, res) => {
    const user = await storage.completeOnboarding(req.user.claims.sub);
    res.json(user);
  });

  // Memories — "What I Know About You". Every suggestion starts as
  // `pending` and only becomes an active memory once the user says yes;
  // nothing here is ever written or acted on without that permission.
  app.get("/api/memories", isAuthenticated, async (req: any, res) => {
    res.json(await storage.listMemories(req.user.claims.sub));
  });

  app.post("/api/memories/scan", isAuthenticated, async (req: any, res) => {
    await scanForMemories(req.user.claims.sub);
    res.json(await storage.listMemories(req.user.claims.sub));
  });

  app.patch("/api/memories/:id", isAuthenticated, async (req: any, res) => {
    const parsed = insertMemorySchema.partial().safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ message: parsed.error.message });
    const memory = await storage.updateMemory(
      req.user.claims.sub,
      Number(req.params.id),
      parsed.data,
    );
    if (!memory) return res.status(404).json({ message: "Not found" });
    res.json(memory);
  });

  app.patch(
    "/api/memories/:id/respond",
    isAuthenticated,
    async (req: any, res) => {
      const parsed = memoryResponseSchema.safeParse(req.body);
      if (!parsed.success)
        return res.status(400).json({ message: parsed.error.message });
      const memory = await storage.respondToMemory(
        req.user.claims.sub,
        Number(req.params.id),
        parsed.data.response,
      );
      if (!memory) return res.status(404).json({ message: "Not found" });
      res.json(memory);
    },
  );

  app.delete("/api/memories/:id", isAuthenticated, async (req: any, res) => {
    const deleted = await storage.deleteMemory(
      req.user.claims.sub,
      Number(req.params.id),
    );
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.status(204).end();
  });

  // Google Calendar sync — a separate OAuth grant from Replit Auth (Replit
  // Auth never has Calendar scopes), so connection state lives in its own
  // table rather than piggybacking on the user's session tokens.
  app.get(
    "/api/integrations/google-calendar/connect",
    isAuthenticated,
    (req: any, res) => {
      res.redirect(getGoogleAuthUrl(req.user.claims.sub));
    },
  );

  app.get(
    "/api/integrations/google-calendar/callback",
    isAuthenticated,
    async (req: any, res) => {
      const code = req.query.code;
      if (typeof code !== "string") {
        return res.redirect("/calendar?google_calendar=error");
      }
      try {
        const tokens = await exchangeGoogleAuthCode(code);
        const userId = req.user.claims.sub;
        await storage.upsertGoogleCalendarConnection(userId, tokens);
        // Best-effort initial sync so the calendar isn't empty until the
        // next scheduled tick; a failure here doesn't undo the connection.
        runFullSync(userId).catch((err) =>
          console.error(`Initial Google Calendar sync failed for ${userId}:`, err),
        );
        res.redirect("/calendar?google_calendar=connected");
      } catch (err) {
        console.error("Google Calendar OAuth callback failed:", err);
        res.redirect("/calendar?google_calendar=error");
      }
    },
  );

  app.get(
    "/api/integrations/google-calendar/status",
    isAuthenticated,
    async (req: any, res) => {
      const connection = await storage.getGoogleCalendarConnection(
        req.user.claims.sub,
      );
      if (!connection) return res.json({ connected: false });
      res.json({
        connected: true,
        enabled: connection.enabled,
        googleCalendarId: connection.googleCalendarId,
        lastSyncedAt: connection.lastSyncedAt,
      });
    },
  );

  app.get(
    "/api/integrations/google-calendar/calendars",
    isAuthenticated,
    async (req: any, res) => {
      const userId = req.user.claims.sub;
      const connection = await storage.getGoogleCalendarConnection(userId);
      if (!connection) return res.status(404).json({ message: "Not connected" });
      const accessToken = await getValidAccessToken(userId);
      res.json(await listCalendars(accessToken));
    },
  );

  app.patch(
    "/api/integrations/google-calendar/settings",
    isAuthenticated,
    async (req: any, res) => {
      const parsed = googleCalendarSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }
      const connection = await storage.updateGoogleCalendarConnection(
        req.user.claims.sub,
        parsed.data,
      );
      if (!connection) return res.status(404).json({ message: "Not connected" });
      res.json({
        connected: true,
        enabled: connection.enabled,
        googleCalendarId: connection.googleCalendarId,
        lastSyncedAt: connection.lastSyncedAt,
      });
    },
  );

  app.post(
    "/api/integrations/google-calendar/sync",
    isAuthenticated,
    async (req: any, res) => {
      const userId = req.user.claims.sub;
      const connection = await storage.getGoogleCalendarConnection(userId);
      if (!connection) return res.status(404).json({ message: "Not connected" });
      await runFullSync(userId);
      res.json({ synced: true });
    },
  );

  app.delete(
    "/api/integrations/google-calendar",
    isAuthenticated,
    async (req: any, res) => {
      await storage.deleteGoogleCalendarConnection(req.user.claims.sub);
      res.status(204).end();
    },
  );

  return createServer(app);
}
