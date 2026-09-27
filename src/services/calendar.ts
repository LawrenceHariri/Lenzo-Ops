/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const REMINDERS_CALENDAR_ID =
  'c_38831ba55000a59be614a22dd12281552ce579e5489b1d84a6397ef57f15edbe@group.calendar.google.com';

/**
 * Parses "YYYY-MM-DD HH:mm" into start Date and start+15m end Date
 */
export function parseWhenToDates(whenStr: string): { startDate: Date; endDate: Date } {
  const str = String(whenStr || '').trim();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
  let startDate: Date;

  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const hour = parseInt(match[4], 10);
    const minute = parseInt(match[5], 10);
    startDate = new Date(year, month, day, hour, minute, 0);
  } else {
    startDate = new Date(str);
  }

  if (isNaN(startDate.getTime())) {
    startDate = new Date();
  }

  // Event is 15 minutes long
  const endDate = new Date(startDate.getTime() + 15 * 60 * 1000);
  return { startDate, endDate };
}

/**
 * Creates a 15-minute event in the dedicated reminders Google Calendar
 * with title "⏰ " + text, popup notification at start time, and description = link to the app.
 * Returns the created event ID.
 */
export async function createCalendarReminderEvent(
  text: string,
  when: string,
  accessToken: string
): Promise<string> {
  const { startDate, endDate } = parseWhenToDates(when);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const appLink =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://lenzohariri.com';

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
    REMINDERS_CALENDAR_ID
  )}/events`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: `⏰ ${text.trim()}`,
      description: appLink,
      start: {
        dateTime: startDate.toISOString(),
        timeZone,
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone,
      },
      reminders: {
        useDefault: false,
        overrides: [{ method: 'popup', minutes: 0 }],
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Calendar error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  if (!data?.id) {
    throw new Error('Google Calendar event created but no ID was returned.');
  }

  return data.id;
}

/**
 * Deletes an event from the Google Calendar
 */
export async function deleteCalendarReminderEvent(
  eventId: string,
  accessToken: string
): Promise<boolean> {
  if (!eventId || !eventId.trim()) return true;

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
    REMINDERS_CALENDAR_ID
  )}/events/${encodeURIComponent(eventId.trim())}`;

  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  // If already gone or deleted, treat as success
  if (res.status === 404 || res.status === 410) {
    return true;
  }

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to delete Google Calendar event (${res.status}): ${errorText}`);
  }

  return true;
}
