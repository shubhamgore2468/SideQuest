import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
const moduleURL = source => `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64')}`;
const eventsURL = moduleURL(readFileSync(new URL('../lib/events.ts', import.meta.url), 'utf8'));
const source = readFileSync(new URL('../lib/calendar-locations.ts', import.meta.url), 'utf8').replace("'./events'", JSON.stringify(eventsURL));
const { locateCalendarEvents } = await import(moduleURL(source));
const event = address => ({id:address,address,lat:null,lng:null,neighborhood:'',locationPrecision:'unknown'});
const response = features => new Response(JSON.stringify({features}));
test('maps address coordinates and shares lookup for duplicate venues', async () => {
  let calls = 0;
  const result = await locateCalendarEvents([event('740 S Sepulveda Blvd, El Segundo, CA'),event('740 S Sepulveda Blvd, El Segundo, CA')], async () => { calls++; return response([{geometry:{coordinates:[-118.396,33.907]},properties:{housenumber:'740',osm_key:'building',osm_value:'commercial',city:'El Segundo'}}]); });
  assert.equal(calls,1);
  assert.equal(result[0].locationPrecision,'venue');
  assert.equal(result[1].lat,33.907);
});
test('lookup failure keeps calendar events and uses explicit neighborhood', async () => {
  const [result] = await locateCalendarEvents([event('Coffee meetup, Santa Monica')], async () => { throw new Error('offline'); });
  assert.equal(result.locationPrecision,'neighborhood');
  assert.equal(result.lat,34.0195);
});
test('rejects distant matches and leaves unannounced venues unpinned', async () => {
  let calls = 0;
  const result = await locateCalendarEvents([event('Venue available once approved'),event('Somewhere unfamiliar')], async () => { calls++; return response([{geometry:{coordinates:[13.4,52.5]},properties:{name:'Somewhere',osm_key:'amenity'}}]); });
  assert.equal(calls,1);
  assert.ok(result.every(item=>item.lat===null));
});
test('does not misrepresent a city centroid or wrong street number as a venue', async () => {
  const result = await locateCalendarEvents([event('123 Main Street, Venice')], async () => response([{geometry:{coordinates:[-118.4695,33.985]},properties:{name:'Venice',osm_key:'place',osm_value:'suburb'}},{geometry:{coordinates:[-118.46,33.98]},properties:{housenumber:'999',osm_key:'building'}}]));
  assert.equal(result[0].locationPrecision,'neighborhood');
});
