import { google } from 'googleapis';

function getClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) return null;

  const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
  return google.calendar({ version: 'v3', auth });
}

export async function createMeetEvent(params: {
  taskId: string;
  title: string;
  description?: string;
  date: string;        // 'YYYY-MM-DD'
  time?: string;       // 'HH:MM'
  duration?: number;   // minutes, default 60
  attendeeEmails: string[];
  timezone?: string;
}): Promise<{ meetLink: string | null; calendarEventId: string | null }> {
  const calendar = getClient();
  if (!calendar) {
    console.warn('[Google Calendar] credentials not configured — skipping Meet creation');
    return { meetLink: null, calendarEventId: null };
  }

  const { taskId, title, description, date, time, duration = 60, attendeeEmails, timezone = 'Asia/Kolkata' } = params;

  const startTime = time || '09:00';
  const [sh, sm] = startTime.split(':').map(Number);
  const startMs = (sh * 60 + sm) * 60000;
  const endMs = startMs + duration * 60000;
  const endH = String(Math.floor(endMs / 3600000)).padStart(2, '0');
  const endM = String(Math.floor((endMs % 3600000) / 60000)).padStart(2, '0');

  const startDateTime = `${date}T${startTime}:00`;
  const endDateTime = `${date}T${endH}:${endM}:00`;

  const event = await calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
    conferenceDataVersion: 1,
    sendUpdates: attendeeEmails.length > 0 ? 'all' : 'none',
    requestBody: {
      summary: title,
      description: description || undefined,
      start: { dateTime: startDateTime, timeZone: timezone },
      end:   { dateTime: endDateTime,   timeZone: timezone },
      attendees: attendeeEmails.map(email => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: `knerd-${taskId}-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email',  minutes: 1440 }, // 1 day
          { method: 'popup',  minutes: 15 },
        ],
      },
    },
  });

  return {
    meetLink: event.data.hangoutLink || null,
    calendarEventId: event.data.id || null,
  };
}

export async function deleteMeetEvent(calendarEventId: string): Promise<void> {
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
