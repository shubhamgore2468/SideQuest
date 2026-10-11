import type { WeekEvent } from './events';

export const WEEK_START = '2026-10-12T00:00:00-07:00';
export const WEEK_END = '2026-10-19T00:00:00-07:00';
export type CalendarEvent = WeekEvent & { calendarSource: string; allDay: boolean };
export type CalendarSync = {
  events: CalendarEvent[];
  calendars: { name: string; eventCount: number; receivedCount: number; skippedCount: number }[];
  rangeStart: string;
  rangeEnd: string;
};
type GoogleEvent = {
  id?: string; iCalUID?: string; summary?: string; status?: string; location?: string;
  htmlLink?: string; start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  attendees?: { self?: boolean; responseStatus?: string }[];
};
type GoogleCalendar = { id: string; summary?: string; accessRole?: string; deleted?: boolean };

export class CalendarError extends Error {
  constructor(public status: number, public needsConsent: boolean, message: string,
    public diagnostics: { code?: string; stage?: string; upstreamStatus?: number; reasons?: string[]; calendar?: string } = {}) { super(message); }
}

export function normalizeCalendarEvent(event: GoogleEvent, calendar: GoogleCalendar): CalendarEvent | null {
  if (!event.id || event.status === 'cancelled' || event.attendees?.some(a => a.self && a.responseStatus === 'declined')) return null;
  const allDay = !!event.start?.date;
  // All-day dates are floating calendar dates; display them on that date in LA.
  const start = event.start?.date ? `${event.start.date}T00:00:00-07:00` : event.start?.dateTime;
  const end = event.end?.date ? `${event.end.date}T00:00:00-07:00` : event.end?.dateTime;
  if (!start || !Number.isFinite(Date.parse(start)) || !end || !Number.isFinite(Date.parse(end))) return null;
  if (Date.parse(start) >= Date.parse(WEEK_END) || Date.parse(end) <= Date.parse(WEEK_START)) return null;
  let link = 'https://calendar.google.com/';
  try { const url = new URL(event.htmlLink || ''); if (url.protocol === 'https:' && ['www.google.com', 'calendar.google.com'].includes(url.hostname)) link = url.href; } catch {}
  return {
    id: `google:${event.iCalUID || `${calendar.id}:${event.id}`}:${start}`,
    title: event.summary || 'Busy', start, end, allDay, calendarSource: calendar.summary || 'Google Calendar',
    host: calendar.summary || 'Google Calendar', address: event.location || '', neighborhood: '',
    lat: null, lng: null, locationPrecision: 'unknown', format: 'Calendar event', tags: [],
    description: '', audience: '', sourceUrl: link, registrationUrl: link,
    status: 'check-source', checkedAt: new Date().toISOString(),
  };
}

export async function readGoogleCalendarSnapshot(token: string, request: typeof fetch = fetch): Promise<CalendarSync> {
  const deadline = AbortSignal.timeout(45000);
  async function list<T>(path: string, params: Record<string, string>, calendar?: string): Promise<T[]> {
    const context = { stage: calendar ? 'Read calendar events' : 'List Google calendars', ...(calendar ? { calendar } : {}) };
    const items: T[] = [];
    let pageToken = '';
    const seen = new Set<string>();
    do {
      const query = new URLSearchParams({ ...params, ...(pageToken ? { pageToken } : {}) });
      let response: Response;
      try {
        response = await request(`https://www.googleapis.com/calendar/v3/${path}?${query}`, {
          headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: deadline,
        });
      } catch (error) {
        const timeout = deadline.aborted || (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name));
        throw new CalendarError(timeout ? 504 : 502, false,
          timeout ? 'Google Calendar sync timed out. Please retry.' : 'Sidequest could not reach Google Calendar. Please retry.',
          { ...context, code: timeout ? 'GOOGLE_TIMEOUT' : 'GOOGLE_NETWORK_ERROR' });
      }
      if (!response.ok) {
        const details = await response.json().catch(() => null);
        const reasons: string[] = [...(Array.isArray(details?.error?.errors) ? details.error.errors : []), ...(Array.isArray(details?.error?.details) ? details.error.details : [])]
          .map((e: { reason?: string }) => e?.reason).filter((reason: unknown): reason is string => typeof reason === 'string' && /^[\w.-]{1,100}$/.test(reason));
        const diagnostics = { ...context, upstreamStatus: response.status, reasons };
        if (response.status === 401 || reasons.includes('insufficientPermissions') || reasons.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT'))
          throw new CalendarError(403, true, 'Grant Google Calendar read-only access to sync your events.', { ...diagnostics, code: 'GOOGLE_PERMISSION_DENIED' });
        if (reasons.includes('accessNotConfigured') || reasons.includes('SERVICE_DISABLED'))
          throw new CalendarError(503, false, 'Google Calendar API is not enabled for this Google connection.', { ...diagnostics, code: 'GOOGLE_API_DISABLED' });
        if (response.status === 429 || reasons.some(reason => /rateLimit|quota/i.test(reason)))
          throw new CalendarError(429, false, 'Google Calendar rate limit reached. Wait a minute and retry.', { ...diagnostics, code: 'GOOGLE_RATE_LIMIT' });
        throw new CalendarError(502, false, 'Google Calendar rejected the sync request. See error details below.', { ...diagnostics, code: 'GOOGLE_REQUEST_FAILED' });
      }
      let data: { items?: T[]; nextPageToken?: string };
      try {
        data = await response.json();
        if (!data || typeof data !== 'object' || (!Array.isArray(data.items) && data.items !== undefined) || (data.nextPageToken !== undefined && typeof data.nextPageToken !== 'string') || !('items' in data || 'kind' in data || 'nextPageToken' in data)) throw new Error('Invalid response');
      } catch {
        throw new CalendarError(502, false, 'Google returned an unreadable calendar response. Please retry.', { ...context, code: 'GOOGLE_INVALID_RESPONSE', upstreamStatus: response.status });
      }
      items.push(...(data.items || []));
      pageToken = data.nextPageToken || '';
      if (pageToken && (seen.has(pageToken) || seen.size >= 100)) throw new CalendarError(503, false, 'Calendar sync could not finish. Please try again.', { ...context, code: 'GOOGLE_PAGINATION_FAILED' });
      if (pageToken) seen.add(pageToken);
    } while (pageToken);
    return items;
  }
  const calendars = await list<GoogleCalendar>('users/me/calendarList', { maxResults: '250', showHidden: 'true', minAccessRole: 'reader' });
  const events = new Map<string, CalendarEvent>();
  const checkedCalendars: CalendarSync['calendars'] = [];
  // Include subscribed calendars, not only primary: Partiful feeds live here.
  for (const calendar of calendars) {
    if (!calendar || typeof calendar.id !== 'string' || !calendar.id)
      throw new CalendarError(502, false, 'Google returned a calendar without an identifier.', { code: 'GOOGLE_INVALID_CALENDAR', stage: 'List Google calendars' });
    if (calendar.deleted) continue;
    const records = await list<GoogleEvent>(`calendars/${encodeURIComponent(calendar.id)}/events`, {
      timeMin: WEEK_START, timeMax: WEEK_END, singleEvents: 'true', showDeleted: 'false',
      orderBy: 'startTime', maxResults: '2500', timeZone: 'America/Los_Angeles',
    }, calendar.summary || 'Google Calendar');
    let eventCount = 0;
    for (const record of records) {
      const event = normalizeCalendarEvent(record, calendar);
      if (event) { events.set(event.id, event); eventCount++; }
    }
    checkedCalendars.push({ name: calendar.summary || 'Google Calendar', eventCount, receivedCount: records.length, skippedCount: records.length - eventCount });
  }
  return {
    events: [...events.values()].sort((a, b) => Date.parse(a.start) - Date.parse(b.start)),
    calendars: checkedCalendars, rangeStart: WEEK_START, rangeEnd: WEEK_END,
  };
}

export async function readGoogleCalendar(token: string, request: typeof fetch = fetch): Promise<CalendarEvent[]> {
  return (await readGoogleCalendarSnapshot(token, request)).events;
}
