import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync(new URL('../lib/schedule-layout.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { layoutSchedule, localMinutes } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const event = (id, start, end, extras = {}) => ({ id, start: `2026-10-12T${start}:00-07:00`, end: end ? `2026-10-12T${end}:00-07:00` : null, ...extras });

test('overlapping events use separate columns and adjacent events reclaim space', () => {
  const [a, b, c] = layoutSchedule([event('a', '08:45', '11:45'), event('b', '09:30', '14:00'), event('c', '14:00', '15:00')]);
  assert.equal(a.column, 0); assert.equal(b.column, 1);
  assert.equal(a.columns, 2); assert.equal(b.columns, 2);
  assert.equal(a.overlaps, true); assert.equal(b.overlaps, true);
  assert.equal(c.columns, 1); assert.equal(c.overlaps, false);
});

test('all-day entries never create timing conflicts', () => {
  const layout = layoutSchedule([event('all-day', '00:00', '23:59', { allDay: true }), event('meeting', '10:00', '11:00')]);
  assert.equal(layout.length, 1); assert.equal(layout[0].columns, 1); assert.equal(layout[0].overlaps, false);
});

test('nested overlaps use three columns and reuse columns within a connected group', () => {
  const layout = layoutSchedule([event('long', '09:00', '15:00'), event('short', '10:00', '11:00'), event('nested', '10:30', '12:00'), event('later', '12:00', '14:00')]);
  assert.equal(layout[0].columns, 3);
  assert.equal(layout[3].column, 1);
  for (const a of layout) for (const b of layout) {
    if (a !== b && a.start < b.end && b.start < a.end) assert.notEqual(a.column, b.column);
  }
});

test('unknown end times use a placeholder without confirmed conflict warnings', () => {
  const layout = layoutSchedule([event('unknown', '09:00', null), event('known', '09:30', '10:30')]);
  assert.equal(layout[0].end, 600);
  assert.ok(layout.every(item => !item.overlaps));
});

test('UTC timestamps align to Los Angeles wall-clock time', () => {
  assert.equal(localMinutes('2026-10-12T16:30:00Z'), 570);
});
