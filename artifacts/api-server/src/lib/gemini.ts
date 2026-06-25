import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "./logger";

const apiKey = process.env.GEMINI_API_KEY ?? "";

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export interface CalendarEventForAnalysis {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
}

export interface FocusAnalysis {
  shouldFocus: boolean;
  intensity: "low" | "medium" | "high" | "critical";
  blockedSites: string[];
  emergencySites: string[];
  aiReason: string;
  focusScore: number;
}

const DEFAULT_BLOCKED = [
  "instagram.com", "facebook.com", "twitter.com", "x.com",
  "tiktok.com", "youtube.com", "reddit.com", "snapchat.com",
  "pinterest.com", "netflix.com", "primevideo.com", "hotstar.com",
];

const DEFAULT_EMERGENCY = [
  "gmail.com", "google.com", "meet.google.com", "maps.google.com", "whatsapp.com",
];

export async function analyzeEventForFocus(
  event: CalendarEventForAnalysis,
  userBlockedSites?: string[],
  userEmergencySites?: string[],
): Promise<FocusAnalysis> {
  try {
    const model = getGenAI().getGenerativeModel({ model: "gemini-1.5-flash" });

    const blocked = userBlockedSites?.length ? userBlockedSites : DEFAULT_BLOCKED;
    const emergency = userEmergencySites?.length ? userEmergencySites : DEFAULT_EMERGENCY;

    const prompt = `You are a productivity AI analyzing a calendar event to determine if the user needs focus mode (internet blocking) during this event.

Calendar Event:
Title: ${event.title}
Description: ${event.description ?? "No description"}
Start: ${event.startTime}
End: ${event.endTime}

User's blocked sites (if focus is needed): ${blocked.join(", ")}
User's emergency sites (always allowed): ${emergency.join(", ")}

Analyze this event and respond with ONLY valid JSON (no markdown, no code blocks):
{
  "shouldFocus": boolean (true if this event requires deep focus/concentration),
  "intensity": "low" | "medium" | "high" | "critical",
  "focusScore": number 0-10,
  "blockedSites": [list of specific sites to block for this event type],
  "emergencySites": [list of sites that should always be allowed],
  "aiReason": "one sentence explaining why focus mode is/isn't needed"
}

Guidelines:
- "critical": exams, important presentations, deadline work
- "high": coding sessions, writing, deep work meetings
- "medium": general work meetings, study sessions
- "low": casual calls, light reading
- If the event is purely social/personal (birthday party, lunch), shouldFocus=false`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const jsonStr = text.replace(/```json\n?|\n?```/g, "").trim();
    const analysis = JSON.parse(jsonStr) as FocusAnalysis;
    return analysis;
  } catch (err) {
    logger.error({ err }, "Gemini analysis failed, using fallback");
    return {
      shouldFocus: true,
      intensity: "medium",
      blockedSites: userBlockedSites?.length ? userBlockedSites : DEFAULT_BLOCKED,
      emergencySites: userEmergencySites?.length ? userEmergencySites : DEFAULT_EMERGENCY,
      aiReason: "AI analysis unavailable — applying standard focus mode",
      focusScore: 5,
    };
  }
}

export async function verifyTaskCompletion(
  eventTitle: string,
  description: string,
  imageBase64?: string,
): Promise<{ verified: boolean; message: string; aiAnalysis: string; confidence: number }> {
  try {
    const model = getGenAI().getGenerativeModel({ model: "gemini-1.5-flash" });

    let prompt = `You are verifying if a user has completed their focus session task.

Focus session event: "${eventTitle}"
User's completion description: "${description}"`;

    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{ text: prompt }];

    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64,
        },
      });
      parts.push({
        text: '\n\nAnalyze the image as proof of completion. Respond with ONLY valid JSON:\n{"verified": boolean, "confidence": 0.0-1.0, "message": "short verdict", "aiAnalysis": "detailed analysis of the proof"}'
      });
    } else {
      parts.push({
        text: '\n\nBased on the description alone, determine if this seems like a genuine completion. Respond with ONLY valid JSON:\n{"verified": boolean, "confidence": 0.0-1.0, "message": "short verdict", "aiAnalysis": "your reasoning"}'
      });
    }

    const result = await model.generateContent(parts);
    const text = result.response.text().trim();
    const jsonStr = text.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(jsonStr) as {
      verified: boolean;
      confidence: number;
      message: string;
      aiAnalysis: string;
    };

    return {
      verified: parsed.verified,
      message: parsed.message,
      aiAnalysis: parsed.aiAnalysis,
      confidence: parsed.confidence,
    };
  } catch (err) {
    logger.error({ err }, "Gemini completion verification failed");
    return {
      verified: description.length > 20,
      message: description.length > 20 ? "Completion accepted based on description" : "Insufficient proof provided",
      aiAnalysis: "AI verification unavailable",
      confidence: 0.5,
    };
  }
}
