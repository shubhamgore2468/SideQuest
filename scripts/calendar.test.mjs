import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { test } from 'node:test';

const source = ts.transpileModule(readFileSync(new URL('../lib/google-calendar.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { normalizeCalendarEvent, readGoogleCalendar, readGoogleCalendarSnapshot, CalendarError } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const clientSource = ts.transpileModule(readFileSync(new URL('../lib/calendar-client.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { fetchCalendarSync, CalendarClientError } = await import(`data:text/javascript;base64,${Buffer.from(clientSource).toString('base64')}`);
const accountSource = ts.transpileModule(readFileSync(new URL('../lib/google-account.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { findGoogleAccount, isGoogleAccount } = await import(`data:text/javascript;base64,${Buffer.from(accountSource).toString('base64')}`);
const calendar = { id: 'primary', summary: 'Personal' };
const event = { id: 'one', iCalUID: 'same-event', summary: 'Meetup', start: { dateTime: '2026-10-12T18:00:00-07:00' }, end: { dateTime: '2026-10-12T19:00:00-07:00' } };

test('recognizes Google provider names and preserves the matching account', () => {
  for (const provider of ['google', 'oauth_google']) {
    const linked = { provider, id: 'connected-google' };
    assert.equal(findGoogleAccount([{ provider: 'oauth_other' }, linked]), linked);
    assert.equal(isGoogleAccount(linked), true);
  }
  assert.equal(findGoogleAccount([{ provider: 'chatgpt' }, {}]), undefined);
  assert.equal(findGoogleAccount([]), undefined);
});

test('filters cancelled, declined, malformed and outside-week events', () => {
  assert.equal(normalizeCalendarEvent({ ...event, status: 'cancelled' }, calendar), null);
  assert.equal(normalizeCalendarEvent({ ...event, attendees: [{ self: true, responseStatus: 'declined' }] }, calendar), null);
  assert.equal(normalizeCalendarEvent({ ...event, start: { dateTime: 'invalid' } }, calendar), null);
  assert.equal(normalizeCalendarEvent({ ...event, start: { date: '2026-10-19' }, end: { date: '2026-10-20' } }, calendar), null);
});

test('preserves floating all-day dates and rejects unsafe event links', () => {
  const normalized = normalizeCalendarEvent({ ...event, start: { date: '2026-10-12' }, end: { date: '2026-10-13' }, htmlLink: 'javascript:alert(1)' }, calendar);
  assert.equal(normalized.start, '2026-10-12T00:00:00-07:00');
  assert.equal(normalized.allDay, true);
  assert.equal(normalized.sourceUrl, 'https://calendar.google.com/');
});

test('paginates calendars and events, includes Partiful subscriptions, deduplicates copies', async () => {
  const calls = [];
  const mock = async (input, options) => {
    const url = new URL(input); calls.push(url);
    assert.equal(options.headers.Authorization, 'Bearer private-token');
    assert.equal(options.cache, 'no-store');
    if (url.pathname.endsWith('/calendarList')) return Response.json(url.searchParams.has('pageToken') ? { items: [{ id: 'partiful@feed', summary: 'Partiful' }] } : { items: [calendar], nextPageToken: 'next-calendar' });
    assert.equal(url.searchParams.get('singleEvents'), 'true');
    assert.equal(url.searchParams.get('timeMin'), '2026-10-12T00:00:00-07:00');
    if (url.pathname.includes('partiful')) return Response.json({ items: [event, { ...event, id: 'partiful', iCalUID: 'partiful-unique' }] });
    return Response.json(url.searchParams.has('pageToken') ? { items: [{ ...event, status: 'cancelled' }] } : { items: [event], nextPageToken: 'next-event' });
  };
  const events = await readGoogleCalendar('private-token', mock);
  assert.equal(events.length, 2);
  assert.equal(calls.length, 5);
  assert.ok(events.some(e => e.calendarSource === 'Partiful'));
});

test('distinguishes missing consent from a disabled Google API', async () => {
  await assert.rejects(readGoogleCalendar('token', async () => Response.json({ error: { errors: [{ reason: 'insufficientPermissions' }] } }, { status: 403 })), e => e instanceof CalendarError && e.needsConsent);
  await assert.rejects(readGoogleCalendar('token', async () => Response.json({ error: { errors: [{ reason: 'accessNotConfigured' }] } }, { status: 403 })), e => e instanceof CalendarError && !e.needsConsent && /not enabled/.test(e.message));
});

test('empty sync reports the exact date range and calendars checked', async () => {
  const snapshot = await readGoogleCalendarSnapshot('token', async input => {
    const url = new URL(input);
    return Response.json({ items: url.pathname.endsWith('/calendarList') ? [calendar, { id: 'feed', summary: 'Partiful' }] : [] });
  });
  assert.deepEqual(snapshot.events, []);
  assert.deepEqual(snapshot.calendars, [{ name: 'Personal', eventCount: 0, receivedCount: 0, skippedCount: 0 }, { name: 'Partiful', eventCount: 0, receivedCount: 0, skippedCount: 0 }]);
  assert.equal(snapshot.rangeStart, '2026-10-12T00:00:00-07:00');
  assert.equal(snapshot.rangeEnd, '2026-10-19T00:00:00-07:00');
});


test('invalid success payloads produce an error instead of an empty calendar', async () => {
  for (const payload of [{}, { items: 'invalid' }]) {
    await assert.rejects(readGoogleCalendarSnapshot('secret-token', async () => Response.json(payload)), e => e instanceof CalendarError && e.diagnostics.code === 'GOOGLE_INVALID_RESPONSE');
  }
});

test('network failures and timeouts report their stage without exposing tokens', async () => {
  for (const [name, code] of [['TypeError', 'GOOGLE_NETWORK_ERROR'], ['TimeoutError', 'GOOGLE_TIMEOUT']]) {
    await assert.rejects(readGoogleCalendarSnapshot('secret-token', async () => { const error = new Error('secret-token raw response'); error.name = name; throw error; }), e => {
      assert.equal(e.diagnostics.code, code);
      assert.equal(e.diagnostics.stage, 'List Google calendars');
      assert.ok(!JSON.stringify(e.diagnostics).includes('secret-token'));
      assert.ok(!e.message.includes('secret-token'));
      return true;
    });
  }
});

test('calendar-specific Google failures include status and reason', async () => {
  await assert.rejects(readGoogleCalendarSnapshot('secret-token', async input => {
    if (new URL(input).pathname.endsWith('/calendarList')) return Response.json({ items: [calendar] });
    return Response.json({ error: { message: 'raw secret-token provider message', errors: [{ reason: 'forbidden' }] } }, { status: 403 });
  }), e => {
    assert.deepEqual(e.diagnostics, { stage: 'Read calendar events', calendar: 'Personal', upstreamStatus: 403, reasons: ['forbidden'], code: 'GOOGLE_REQUEST_FAILED' });
    assert.ok(!e.message.includes('secret-token'));
    return true;
  });
});

test('client preserves server diagnostics and rejects HTML and incomplete success responses', async () => {
  await assert.rejects(fetchCalendarSync(async () => Response.json({ error: 'Calendar access denied', needsConsent: true, diagnostics: { requestId: 'trace-123', code: 'GOOGLE_PERMISSION_DENIED' } }, { status: 403 })), e =>
    e instanceof CalendarClientError && e.needsConsent && e.diagnostics.requestId === 'trace-123' && e.diagnostics.httpStatus === 403);
  await assert.rejects(fetchCalendarSync(async () => new Response('<html>Error</html>', { status: 502 })), e => e.diagnostics.code === 'SERVER_INVALID_RESPONSE');
  await assert.rejects(fetchCalendarSync(async () => Response.json({ events: [] })), e => e.diagnostics.code === 'SERVER_INVALID_DATA');
});

test('client accepts valid empty sync and explains browser connection failures', async () => {
  const payload = { events: [], calendars: [], syncedAt: '2026-10-10T12:00:00Z', accountEmail: 'test@example.com' };
  assert.deepEqual(await fetchCalendarSync(async () => Response.json(payload)), payload);
  await assert.rejects(fetchCalendarSync(async () => { throw new TypeError('Failed to fetch'); }), e => e.diagnostics.code === 'CLIENT_NETWORK_ERROR');
});
