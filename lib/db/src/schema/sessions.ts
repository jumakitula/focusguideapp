import { pgTable, text, serial, timestamp, boolean, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const focusSessionsTable = pgTable("focus_sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  userEmail: text("user_email").notNull(),
  eventId: text("event_id"),
  eventTitle: text("event_title").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  focusIntensity: text("focus_intensity").notNull().default("medium"),
  blockedSites: text("blocked_sites").notNull().default("[]"),
  emergencySites: text("emergency_sites").notNull().default("[]"),
  isActive: boolean("is_active").notNull().default(false),
  aiReason: text("ai_reason"),
  completed: boolean("completed").notNull().default(false),
  completionVerified: boolean("completion_verified").notNull().default(false),
  completionNote: text("completion_note"),
  overrideCount: integer("override_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFocusSessionSchema = createInsertSchema(focusSessionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFocusSession = z.infer<typeof insertFocusSessionSchema>;
export type FocusSession = typeof focusSessionsTable.$inferSelect;
