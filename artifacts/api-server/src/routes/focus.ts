import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, focusSessionsTable, userSettingsTable } from "@workspace/db";
import {
  GetActiveSessionParams,
  ListSessionsParams,
  SyncCalendarParams,
  LogOverrideParams,
  LogOverrideBody,
  SubmitCompletionParams,
  SubmitCompletionBody,
  GetDashboardParams,
} from "@workspace/api-zod";
import { analyzeEventForFocus, verifyTaskCompletion } from "../lib/gemini";
import { getUpcomingEvents } from "../lib/calendar";
import { logger } from "../lib/logger";
import { randomUUID } from "crypto";

const router: IRouter = Router();

router.get("/focus/active/:userEmail", async (req, res): Promise<void> => {
  const rawEmail = Array.isArray(req.params.userEmail) ? req.params.userEmail[0] : req.params.userEmail;
  const parsed = GetActiveSessionParams.safeParse({ userEmail: rawEmail });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const now = new Date().toISOString();
  const sessions = await db
    .select()
    .from(focusSessionsTable)
    .where(and(eq(focusSessionsTable.userEmail, parsed.data.userEmail), eq(focusSessionsTable.isActive, true)))
    .limit(1);

  if (!sessions.length) {
    res.status(404).json({ error: "No active session" });
    return;
  }

  const session = sessions[0];
  const isStillActive = session.endTime > now;

  if (!isStillActive) {
    await db
      .update(focusSessionsTable)
      .set({ isActive: false })
      .where(eq(focusSessionsTable.id, session.id));
    res.status(404).json({ error: "No active session" });
    return;
  }

  res.json(mapSession(session));
});

router.get("/focus/sessions/:userEmail", async (req, res): Promise<void> => {
  const rawEmail = Array.isArray(req.params.userEmail) ? req.params.userEmail[0] : req.params.userEmail;
  const parsed = ListSessionsParams.safeParse({ userEmail: rawEmail });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const sessions = await db
    .select()
    .from(focusSessionsTable)
    .where(eq(focusSessionsTable.userEmail, parsed.data.userEmail))
    .orderBy(desc(focusSessionsTable.createdAt))
    .limit(50);

  res.json(sessions.map(mapSession));
});

router.post("/focus/sync/:userEmail", async (req, res): Promise<void> => {
  const rawEmail = Array.isArray(req.params.userEmail) ? req.params.userEmail[0] : req.params.userEmail;
  const parsed = SyncCalendarParams.safeParse({ userEmail: rawEmail });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userEmail = parsed.data.userEmail;

  let settings = await db
    .select()
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userEmail, userEmail))
    .limit(1);

  if (!settings.length) {
    await db.insert(userSettingsTable).values({ userEmail });
    settings = await db.select().from(userSettingsTable).where(eq(userSettingsTable.userEmail, userEmail)).limit(1);
  }

  const userSettings = settings[0];
  const blockedSites: string[] = JSON.parse(userSettings.blockedSites);
  const emergencySites: string[] = JSON.parse(userSettings.emergencySites);

  let calendarEvents: Awaited<ReturnType<typeof getUpcomingEvents>> = [];

  if (userSettings.googleAccessToken) {
    calendarEvents = await getUpcomingEvents(userSettings.googleAccessToken, 3);
  }

  if (!calendarEvents.length) {
    const now = new Date();
    calendarEvents = [
      {
        event_id: `demo-${Date.now()}-1`,
        title: "Deep Work: Project Development",
        start_time: new Date(now.getTime() + 30 * 60000).toISOString(),
        end_time: new Date(now.getTime() + 150 * 60000).toISOString(),
        description: "Focused coding session for the main project features",
      },
      {
        event_id: `demo-${Date.now()}-2`,
        title: "Study Session: Exam Prep",
        start_time: new Date(now.getTime() + 3 * 3600000).toISOString(),
        end_time: new Date(now.getTime() + 5 * 3600000).toISOString(),
        description: "Critical exam preparation, no distractions allowed",
      },
    ];
  }

  let sessionsCreated = 0;
  let sessionsUpdated = 0;

  for (const event of calendarEvents) {
    const analysis = await analyzeEventForFocus(
      {
        title: event.title,
        description: event.description ?? undefined,
        startTime: event.start_time,
        endTime: event.end_time,
      },
      blockedSites,
      emergencySites,
    );

    if (!analysis.shouldFocus) continue;

    const sessionId = randomUUID();
    const startTime = new Date(event.start_time);
    const endTime = new Date(event.end_time);
    const now = new Date();
    const isCurrentlyActive = startTime <= now && endTime > now;

    const existing = await db
      .select()
      .from(focusSessionsTable)
      .where(
        and(
          eq(focusSessionsTable.userEmail, userEmail),
          eq(focusSessionsTable.eventId, event.event_id),
        ),
      )
      .limit(1);

    if (existing.length) {
      await db
        .update(focusSessionsTable)
        .set({
          focusIntensity: analysis.intensity,
          blockedSites: JSON.stringify(analysis.blockedSites),
          emergencySites: JSON.stringify(analysis.emergencySites),
          isActive: isCurrentlyActive,
          aiReason: analysis.aiReason,
        })
        .where(eq(focusSessionsTable.id, existing[0].id));
      sessionsUpdated++;
    } else {
      await db.insert(focusSessionsTable).values({
        sessionId,
        userEmail,
        eventId: event.event_id,
        eventTitle: event.title,
        startTime: event.start_time,
        endTime: event.end_time,
        focusIntensity: analysis.intensity,
        blockedSites: JSON.stringify(analysis.blockedSites),
        emergencySites: JSON.stringify(analysis.emergencySites),
        isActive: isCurrentlyActive,
        aiReason: analysis.aiReason,
        completed: false,
        completionVerified: false,
        overrideCount: 0,
      });
      sessionsCreated++;
    }
  }

  res.json({
    sessions_created: sessionsCreated,
    sessions_updated: sessionsUpdated,
    message: `Synced ${calendarEvents.length} events. Created ${sessionsCreated}, updated ${sessionsUpdated} focus sessions.`,
    events_analyzed: calendarEvents.length,
  });
});

router.post("/focus/sessions/:sessionId/override", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;
  const paramsParsed = LogOverrideParams.safeParse({ sessionId: rawId });
  const bodyParsed = LogOverrideBody.safeParse(req.body);

  if (!paramsParsed.success) {
    res.status(400).json({ error: paramsParsed.error.message });
    return;
  }
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.message });
    return;
  }

  const session = await db
    .select()
    .from(focusSessionsTable)
    .where(eq(focusSessionsTable.sessionId, paramsParsed.data.sessionId))
    .limit(1);

  if (!session.length) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  await db
    .update(focusSessionsTable)
    .set({
      overrideCount: session[0].overrideCount + 1,
      isActive: false,
    })
    .where(eq(focusSessionsTable.id, session[0].id));

  req.log.info({ sessionId: paramsParsed.data.sessionId, reason: bodyParsed.data.reason }, "Focus session override logged");

  res.json({ success: true, message: "Override logged. Focus mode temporarily disabled." });
});

router.post("/focus/sessions/:sessionId/complete", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;
  const paramsParsed = SubmitCompletionParams.safeParse({ sessionId: rawId });
  const bodyParsed = SubmitCompletionBody.safeParse(req.body);

  if (!paramsParsed.success) {
    res.status(400).json({ error: paramsParsed.error.message });
    return;
  }
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.message });
    return;
  }

  const session = await db
    .select()
    .from(focusSessionsTable)
    .where(eq(focusSessionsTable.sessionId, paramsParsed.data.sessionId))
    .limit(1);

  if (!session.length) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const { user_email, description = "", image_base64 } = bodyParsed.data;

  const verification = await verifyTaskCompletion(
    session[0].eventTitle,
    description,
    image_base64,
  );

  if (verification.verified) {
    await db
      .update(focusSessionsTable)
      .set({
        completed: true,
        completionVerified: true,
        completionNote: description,
        isActive: false,
      })
      .where(eq(focusSessionsTable.id, session[0].id));
  } else {
    await db
      .update(focusSessionsTable)
      .set({
        completionNote: description,
      })
      .where(eq(focusSessionsTable.id, session[0].id));
  }

  req.log.info({ sessionId: paramsParsed.data.sessionId, verified: verification.verified }, "Task completion submitted");

  res.json({
    verified: verification.verified,
    message: verification.message,
    ai_analysis: verification.aiAnalysis,
    confidence: verification.confidence,
  });
});

router.get("/focus/dashboard/:userEmail", async (req, res): Promise<void> => {
  const rawEmail = Array.isArray(req.params.userEmail) ? req.params.userEmail[0] : req.params.userEmail;
  const parsed = GetDashboardParams.safeParse({ userEmail: rawEmail });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userEmail = parsed.data.userEmail;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const allSessions = await db
    .select()
    .from(focusSessionsTable)
    .where(eq(focusSessionsTable.userEmail, userEmail))
    .orderBy(desc(focusSessionsTable.startTime));

  const todaySessions = allSessions.filter((s) => s.startTime >= todayStart);
  const activeSessions = allSessions.filter((s) => s.isActive && s.endTime > now.toISOString());
  const upcomingSessions = allSessions.filter(
    (s) => !s.isActive && s.startTime > now.toISOString(),
  ).slice(0, 5);

  let focusMinutesToday = 0;
  for (const s of todaySessions) {
    const start = new Date(s.startTime);
    const end = new Date(s.endTime);
    const diff = (end.getTime() - start.getTime()) / 60000;
    focusMinutesToday += Math.round(diff);
  }

  const allBlocked: string[] = [];
  for (const s of allSessions.slice(0, 10)) {
    try {
      const sites: string[] = JSON.parse(s.blockedSites);
      allBlocked.push(...sites);
    } catch {
      // ignore
    }
  }
  const topBlocked = [...new Set(allBlocked)].slice(0, 6);

  res.json({
    active_session: activeSessions.length ? mapSession(activeSessions[0]) : null,
    upcoming_sessions: upcomingSessions.map(mapSession),
    total_sessions_today: todaySessions.length,
    focus_minutes_today: focusMinutesToday,
    top_blocked_sites: topBlocked,
  });
});

function mapSession(s: typeof focusSessionsTable.$inferSelect) {
  let blockedSites: string[] = [];
  let emergencySites: string[] = [];
  try { blockedSites = JSON.parse(s.blockedSites); } catch { /* skip */ }
  try { emergencySites = JSON.parse(s.emergencySites); } catch { /* skip */ }

  return {
    session_id: s.sessionId,
    event_title: s.eventTitle,
    start_time: s.startTime,
    end_time: s.endTime,
    focus_intensity: s.focusIntensity,
    blocked_sites: blockedSites,
    emergency_sites: emergencySites,
    is_active: s.isActive,
    ai_reason: s.aiReason,
    completed: s.completed,
    completion_verified: s.completionVerified,
    user_email: s.userEmail,
    event_id: s.eventId,
    override_count: s.overrideCount,
  };
}

export default router;
