import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, userSettingsTable } from "@workspace/db";
import { GetCalendarEventsParams } from "@workspace/api-zod";
import { getUpcomingEvents } from "../lib/calendar";
import { analyzeEventForFocus } from "../lib/gemini";

const router: IRouter = Router();

router.get("/calendar/events/:userEmail", async (req, res): Promise<void> => {
  const rawEmail = Array.isArray(req.params.userEmail) ? req.params.userEmail[0] : req.params.userEmail;
  const parsed = GetCalendarEventsParams.safeParse({ userEmail: rawEmail });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const settings = await db
    .select()
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userEmail, parsed.data.userEmail))
    .limit(1);

  let events: Awaited<ReturnType<typeof getUpcomingEvents>> = [];

  if (settings.length && settings[0].googleAccessToken) {
    events = await getUpcomingEvents(settings[0].googleAccessToken, 7);
  }

  if (!events.length) {
    const now = new Date();
    events = [
      {
        event_id: `demo-evt-1`,
        title: "Deep Work: Engineering Sprint",
        start_time: new Date(now.getTime() + 1 * 3600000).toISOString(),
        end_time: new Date(now.getTime() + 3 * 3600000).toISOString(),
        description: "Critical feature development",
      },
      {
        event_id: `demo-evt-2`,
        title: "Team Standup",
        start_time: new Date(now.getTime() + 4 * 3600000).toISOString(),
        end_time: new Date(now.getTime() + 4.5 * 3600000).toISOString(),
        description: "Daily team sync",
      },
      {
        event_id: `demo-evt-3`,
        title: "Study: Machine Learning Exam",
        start_time: new Date(now.getTime() + 6 * 3600000).toISOString(),
        end_time: new Date(now.getTime() + 8 * 3600000).toISOString(),
        description: "Final exam preparation",
      },
      {
        event_id: `demo-evt-4`,
        title: "Lunch with Friend",
        start_time: new Date(now.getTime() + 24 * 3600000).toISOString(),
        end_time: new Date(now.getTime() + 25 * 3600000).toISOString(),
        description: null,
      },
      {
        event_id: `demo-evt-5`,
        title: "Writing: Research Paper",
        start_time: new Date(now.getTime() + 26 * 3600000).toISOString(),
        end_time: new Date(now.getTime() + 29 * 3600000).toISOString(),
        description: "Finish the literature review section",
      },
    ];
  }

  const enrichedEvents = await Promise.all(
    events.map(async (event) => {
      try {
        const analysis = await analyzeEventForFocus({
          title: event.title,
          description: event.description ?? undefined,
          startTime: event.start_time,
          endTime: event.end_time,
        });
        return {
          event_id: event.event_id,
          title: event.title,
          start_time: event.start_time,
          end_time: event.end_time,
          description: event.description,
          ai_focus_score: analysis.focusScore,
          suggested_intensity: analysis.intensity,
        };
      } catch {
        return {
          event_id: event.event_id,
          title: event.title,
          start_time: event.start_time,
          end_time: event.end_time,
          description: event.description,
          ai_focus_score: null,
          suggested_intensity: null,
        };
      }
    }),
  );

  res.json(enrichedEvents);
});

export default router;
