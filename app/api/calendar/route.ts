import { auth, clerkClient } from '@clerk/nextjs/server';
import { authConfigured } from '@/lib/auth-config';
import { json } from '@/lib/api';
import { CALENDAR_SCOPES } from '@/lib/calendar-scopes';
import { CalendarError, readGoogleCalendarSnapshot } from '@/lib/google-calendar';
import { isGoogleAccount } from '@/lib/google-account';
import { locateCalendarEvents } from '@/lib/calendar-locations';

export async function GET() {
  const requestId = crypto.randomUUID();
  const started = Date.now();
  let stage = 'Check sign-in configuration';
  const fail = (status: number, error: string, code: string, needsConsent = false, details: Record<string, unknown> = {}) => {
    const diagnostics = { requestId, code, stage, elapsedMs: Date.now() - started, ...details };
    // Log only curated diagnostics; never tokens, request headers or raw provider responses.
    console.error('sidequest_calendar_sync_failed', diagnostics);
    return json({ error, needsConsent, diagnostics }, status);
  };
  try {
    if (!authConfigured()) return fail(503, 'Google sign-in is not configured on this server.', 'AUTH_NOT_CONFIGURED');
    stage = 'Check signed-in session';
    const { userId } = await auth();
    if (!userId) return fail(401, 'Your session has expired. Sign in with Google again.', 'SESSION_REQUIRED');
    const client = await clerkClient();
    stage = 'Load Google connection from Clerk';
    const user = await client.users.getUser(userId);
    stage = 'Retrieve Google access token from Clerk';
    const { data } = await client.users.getUserOauthAccessToken(userId, 'google');
    if (!data.length) {
      const googleConnected = user.externalAccounts.some(isGoogleAccount);
      return fail(403, googleConnected ? 'Your Google connection has no usable access token. Reconnect Google Calendar.' : 'Link Google to your current Sidequest account to connect your calendar.',
        googleConnected ? 'GOOGLE_TOKEN_MISSING' : 'GOOGLE_ACCOUNT_MISSING', true,
        { connectedProviders: user.externalAccounts.map(account => account.provider).filter(provider => typeof provider === 'string' && /^[\w.-]{1,100}$/.test(provider)) });
    }
    const token = data.find(item => {
      const scopes = item.scopes || [];
      return scopes.includes('https://www.googleapis.com/auth/calendar.readonly') || CALENDAR_SCOPES.every(s => scopes.includes(s));
    });
    if (!token) return fail(403, 'Grant Google Calendar read-only access to sync your events.', 'CALENDAR_SCOPES_MISSING', true);
    stage = 'Read Google Calendar';
    const sync = await readGoogleCalendarSnapshot(token.token);
    stage = 'Locate calendar venues';
    sync.events = await locateCalendarEvents(sync.events);
    const account = user.externalAccounts.find(item => item.id === token.externalAccountId || item.externalAccountId === token.externalAccountId);
    return json({ ...sync, accountEmail: account?.emailAddress || '', syncedAt: new Date().toISOString(),
      diagnostics: { requestId, stage: 'Complete', elapsedMs: Date.now() - started } });
  } catch (error) {
    if (error instanceof CalendarError)
      return fail(error.status, error.message, error.diagnostics.code || 'CALENDAR_SYNC_FAILED', error.needsConsent, error.diagnostics);
    const provider = error as { status?: unknown; errors?: { code?: unknown }[] } | null;
    const upstreamStatus = typeof provider?.status === 'number' ? provider.status : undefined;
    const reasons = Array.isArray(provider?.errors) ? provider.errors.map(item => item?.code).filter((code): code is string => typeof code === 'string' && /^[\w.-]{1,100}$/.test(code)) : [];
    const clerkFailure = stage.includes('Clerk');
    return fail(502, clerkFailure ? 'Clerk could not load your Google connection. Retry, or reconnect Google Calendar.' : 'Calendar sync failed on the server. See error details below.',
      clerkFailure ? 'CLERK_REQUEST_FAILED' : 'CALENDAR_SERVER_ERROR', clerkFailure && upstreamStatus === 404,
      { ...(upstreamStatus ? { upstreamStatus } : {}), ...(reasons.length ? { reasons } : {}) });
  }
}
