import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, userSettingsTable } from "@workspace/db";
import {
  GetUserSettingsParams,
  UpdateUserSettingsParams,
  UpdateUserSettingsBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/settings/:userEmail", async (req, res): Promise<void> => {
  const rawEmail = Array.isArray(req.params.userEmail) ? req.params.userEmail[0] : req.params.userEmail;
  const parsed = GetUserSettingsParams.safeParse({ userEmail: rawEmail });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const rows = await db
    .select()
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userEmail, parsed.data.userEmail))
    .limit(1);

  if (!rows.length) {
    await db.insert(userSettingsTable).values({ userEmail: parsed.data.userEmail });
    const newRows = await db
      .select()
      .from(userSettingsTable)
      .where(eq(userSettingsTable.userEmail, parsed.data.userEmail))
      .limit(1);
    res.json(mapSettings(newRows[0]));
    return;
  }

  res.json(mapSettings(rows[0]));
});

router.put("/settings/:userEmail", async (req, res): Promise<void> => {
  const rawEmail = Array.isArray(req.params.userEmail) ? req.params.userEmail[0] : req.params.userEmail;
  const paramsParsed = UpdateUserSettingsParams.safeParse({ userEmail: rawEmail });
  const bodyParsed = UpdateUserSettingsBody.safeParse(req.body);

  if (!paramsParsed.success) {
    res.status(400).json({ error: paramsParsed.error.message });
    return;
  }
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.message });
    return;
  }

  const userEmail = paramsParsed.data.userEmail;
  const body = bodyParsed.data;

  const existing = await db
    .select()
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userEmail, userEmail))
    .limit(1);

  const updates: Partial<typeof userSettingsTable.$inferInsert> = {};
  if (body.blocked_sites !== undefined) updates.blockedSites = JSON.stringify(body.blocked_sites);
  if (body.emergency_sites !== undefined) updates.emergencySites = JSON.stringify(body.emergency_sites);
  if (body.trigger_intensity !== undefined) updates.triggerIntensity = body.trigger_intensity;
  if (body.advance_minutes !== undefined) updates.advanceMinutes = body.advance_minutes;
  if (body.google_access_token !== undefined) {
    updates.googleAccessToken = body.google_access_token;
    updates.calendarConnected = !!body.google_access_token;
  }

  if (!existing.length) {
    await db.insert(userSettingsTable).values({ userEmail, ...updates });
  } else {
    await db.update(userSettingsTable).set(updates).where(eq(userSettingsTable.userEmail, userEmail));
  }

  const updated = await db
    .select()
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userEmail, userEmail))
    .limit(1);

  res.json(mapSettings(updated[0]));
});

function mapSettings(s: typeof userSettingsTable.$inferSelect) {
  let blockedSites: string[] = [];
  let emergencySites: string[] = [];
  try { blockedSites = JSON.parse(s.blockedSites); } catch { /* skip */ }
  try { emergencySites = JSON.parse(s.emergencySites); } catch { /* skip */ }

  return {
    user_email: s.userEmail,
    blocked_sites: blockedSites,
    emergency_sites: emergencySites,
    trigger_intensity: s.triggerIntensity,
    advance_minutes: s.advanceMinutes,
    calendar_connected: s.calendarConnected,
    google_access_token: null,
  };
}

export default router;
