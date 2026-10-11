import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../lib/events.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { curatedEvents, mergeEventCatalog } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
);
const original = curatedEvents.find(event => event.id === 'builders-brews');

test('a saved event remains in My Day when the feed changes its ID', () => {
  const saved = { eventId: original.id, status: 'confirmed' };
  const incoming = { ...original, id: 'cdfc3da3-079b-430b-827f-a6e700d16d42', title: 'Updated workshop title' };
  const events = mergeEventCatalog([incoming]);
  const myDay = events.filter(event => event.id === saved.eventId);
  assert.equal(myDay.length, 1);
  assert.equal(myDay[0].title, incoming.title);
});

test('an official URL slug or tracking change preserves the saved event ID', () => {
  const incoming = {
    ...original, id: 'new-upstream-id', start: '2026-10-13T10:00:00-07:00',
    sourceUrl: 'https://www.tech-week.com/calendar/la/events/updated-name-cdfc3da3-079b-430b-827f-a6e700d16d42/?utm_source=test',
  };
  const events = mergeEventCatalog([incoming], [original]);
  assert.equal(events.length, 1);
  assert.equal(events[0].id, original.id);
  assert.equal(events[0].start, incoming.start);
});

test('a partial update retains previously saved events with their checked date', () => {
  const events = mergeEventCatalog([], [original]);
  assert.deepEqual(events, [original]);
});

test('different events from the same host calendar are not merged', () => {
  const first = { ...original, id: 'first', sourceUrl: 'https://www.tech-week.com/calendar/la?host=tavily' };
  const second = { ...first, id: 'second', start: '2026-10-14T09:00:00-07:00' };
  assert.equal(mergeEventCatalog([second], [first]).length, 2);
});
