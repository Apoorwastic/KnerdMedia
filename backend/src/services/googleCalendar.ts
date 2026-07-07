import { google } from 'googleapis';

function getClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) return null;
  const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
  return google.calendar({ version: 'v3', auth });
}

function calcEndTime(date: string, time: string, duration: number) {
  const [h, m] = time.split(':').map(Number);
  const endTotal = h * 60 + m + duration;
  const endH = String(Math.floor(endTotal / 60)).padStart(2, '0');
  const endM = String(endTotal % 60).padStart(2, '0');
  return `${date}T${endH}:${endM}:00`;
}

export interface CalendarResult {
  meetLink: string | null;
  calendarEventId: string | null;
}

/** Creates a Google Calendar event WITH a Google Meet link (for MEETING tasks) */
export async function createMeetEvent(params: {
  taskId: string;
  title: string;
  description?: string;
  date: string;           // 'YYYY-MM-DD'
  time?: string;          // 'HH:MM'
  duration?: number;      // minutes, default 60
  attendeeEmails: string[];
  timezone?: string;
}): Promise<CalendarResult> {
  const calendar = getClient();
  if (!calendar) {
    console.warn('[Google Calendar] credentials not configured — skipping');
    return { meetLink: null, calendarEventId: null };
  }

  const { taskId, title, description, date, duration = 60, attendeeEmails, timezone = 'Asia/Kolkata' } = params;
  const time = params.time || '09:00';
  const startDateTime = `${date}T${time}:00`;
  const endDateTime = calcEndTime(date, time, duration);

  const event = await calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
    conferenceDataVersion: 1,
    sendUpdates: 'all',
    requestBody: {
      summary: title,
      description: description || undefined,
      start: { dateTime: startDateTime, timeZone: timezone },
      end:   { dateTime: endDateTime,   timeZone: timezone },
      attendees: attendeeEmails.map(email => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: `knerd-meet-${taskId}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 1440 },
          { method: 'popup', minutes: 15 },
        ],
      },
    },
  });

  return {
    meetLink: event.data.hangoutLink || null,
    calendarEventId: event.data.id || null,
  };
}

/** Creates a Google Calendar event WITHOUT a Meet link (for EVENT tasks and Operations events) */
export async function createCalendarEvent(params: {
  eventId: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  duration?: number;
  attendeeEmails: string[];
  timezone?: string;
}): Promise<CalendarResult> {
  const calendar = getClient();
  if (!calendar) {
    console.warn('[Google Calendar] credentials not configured — skipping');
    return { meetLink: null, calendarEventId: null };
  }

  const { eventId, title, description, date, duration = 60, attendeeEmails, timezone = 'Asia/Kolkata' } = params;
  const time = params.time || '09:00';
  const startDateTime = `${date}T${time}:00`;
  const endDateTime = calcEndTime(date, time, duration);

  const event = await calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
    sendUpdates: attendeeEmails.length > 0 ? 'all' : 'none',
    requestBody: {
      summary: title,
      description: description || undefined,
      start: { dateTime: startDateTime, timeZone: timezone },
      end:   { dateTime: endDateTime,   timeZone: timezone },
      attendees: attendeeEmails.map(email => ({ email })),
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 1440 },
          { method: 'popup', minutes: 30 },
        ],
      },
    },
  });

  return {
    meetLink: null,
    calendarEventId: event.data.id || null,
  };
}

export async function deleteCalendarEvent(calendarEventId: string): Promise<void> {
  const calendar = getClient();
  if (!calendar) return;
  try {
    await calendar.events.delete({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      eventId: calendarEventId,
      sendUpdates: 'all',
    });
  } catch (e) {
    console.warn('[Google Calendar] could not delete event:', e);
  }
}
