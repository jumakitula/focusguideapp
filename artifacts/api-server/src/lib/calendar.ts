import { google } from "googleapis";
import { logger } from "./logger";

export interface GoogleCalendarEvent {
  event_id: string;
  title: string;
  start_time: string;
  end_time: string;
  description: string | null;
}

export async function getUpcomingEvents(
  accessToken: string,
  daysAhead = 7,
): Promise<GoogleCalendarEvent[]> {
  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const now = new Date();
    const timeMax = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: now.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 50,
    });

    const events = response.data.items ?? [];

    return events
      .filter((e) => e.start?.dateTime)
      .map((e) => ({
        event_id: e.id ?? `evt-${Date.now()}`,
        title: e.summary ?? "Untitled Event",
        start_time: e.start!.dateTime!,
        end_time: e.end?.dateTime ?? e.start!.dateTime!,
        description: e.description ?? null,
      }));
  } catch (err) {
    logger.error({ err }, "Failed to fetch Google Calendar events");
    return [];
  }
}
