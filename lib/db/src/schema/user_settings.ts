import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userSettingsTable = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userEmail: text("user_email").notNull().unique(),
  blockedSites: text("blocked_sites").notNull().default('["instagram.com","facebook.com","twitter.com","x.com","tiktok.com","youtube.com","reddit.com","snapchat.com","pinterest.com","netflix.com"]'),
  emergencySites: text("emergency_sites").notNull().default('["gmail.com","google.com","meet.google.com","maps.google.com","whatsapp.com"]'),
  triggerIntensity: text("trigger_intensity").notNull().default("medium"),
  advanceMinutes: integer("advance_minutes").notNull().default(5),
  calendarConnected: boolean("calendar_connected").notNull().default(false),
  googleAccessToken: text("google_access_token"),
  googleRefreshToken: text("google_refresh_token"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSettingsSchema = createInsertSchema(userSettingsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UserSettings = typeof userSettingsTable.$inferSelect;
