import type { CalendarEvent, CalendarSync } from './google-calendar';

export type CalendarDiagnostics = {
  requestId?: string; code?: string; stage?: string; upstreamStatus?: number;
  reasons?: string[]; calendar?: string; elapsedMs?: number; httpStatus?: number; connectedProviders?: string[];
};
export type CalendarResponse = CalendarSync & { accountEmail: string; syncedAt: string; diagnostics?: CalendarDiagnostics };
export class CalendarClientError extends Error {
  constructor(message: string, public needsConsent: boolean, public diagnostics: CalendarDiagnostics) { super(message); }
}

export async function fetchCalendarSync(request: typeof fetch = fetch): Promise<CalendarResponse> {
  let response: Response;
  try {
    response = await request('/api/calendar', { cache: 'no-store', signal: AbortSignal.timeout(60000) });
  } catch (error) {
    const timeout = error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name);
    throw new CalendarClientError(timeout ? 'Calendar sync took too long. Please retry.' : 'Could not reach Sidequest. Check your connection and retry.', false,
      { code: timeout ? 'CLIENT_TIMEOUT' : 'CLIENT_NETWORK_ERROR', stage: 'Contact Sidequest' });
  }
  let data;
  try { data = await response.json(); } catch {
    throw new CalendarClientError('Sidequest returned an unreadable response. Please retry.', false,
      { code: 'SERVER_INVALID_RESPONSE', stage: 'Read Sidequest response', httpStatus: response.status });
  }
  if (!response.ok) throw new CalendarClientError(typeof data?.error === 'string' ? data.error : 'Calendar sync failed. See error details below.',
    data?.needsConsent === true, { ...data?.diagnostics, httpStatus: response.status });
  if (!data || !Array.isArray(data.events) || !Array.isArray(data.calendars) || typeof data.syncedAt !== 'string' || !Number.isFinite(Date.parse(data.syncedAt)) ||
    !data.events.every((event: CalendarEvent) => event && typeof event.id === 'string' && typeof event.title === 'string' && typeof event.calendarSource === 'string' && Number.isFinite(Date.parse(event.start)) && Number.isFinite(Date.parse(event.end || ''))) ||
    !data.calendars.every((calendar: CalendarSync['calendars'][number]) => calendar && typeof calendar.name === 'string' && Number.isFinite(calendar.eventCount)))
    throw new CalendarClientError('Sidequest returned incomplete calendar data. This sync was not applied.', false,
      { ...data?.diagnostics, code: 'SERVER_INVALID_DATA', stage: 'Validate sync results', httpStatus: response.status });
  return data as CalendarResponse;
}
