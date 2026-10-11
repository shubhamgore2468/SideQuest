import test from 'node:test';
import assert from 'node:assert/strict';
import { mcp } from '../scripts/events-module.mjs';
import { readFileSync } from 'node:fs';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/official-events.json',import.meta.url),'utf8'));

test('catalogue requests do not filter titles by the city name or date', () => {
  assert.deepEqual(mcp.discoveryArguments({ inputSchema: { properties: {
    city: { enum: ['SF', 'LA'] }, query: { type: 'string' }, limit: { maximum: 50 },
  } } }), { city: 'LA', limit: 50 });
});

test('required search text is empty for a catalogue request', () => {
  assert.deepEqual(mcp.discoveryArguments({ inputSchema: {
    properties: { query: { type: 'string' } }, required: ['query'],
  } }), { query: '' });
});

test('an unknown required argument fails explicitly instead of guessing', () => {
  assert.throws(() => mcp.discoveryArguments({ inputSchema: {
    properties: { edition: { type: 'string' } }, required: ['edition'],
  } }), /Unsupported required MCP argument: edition/);
});

test('the real search schema receives an array of cities and the documented page size', () => {
  assert.deepEqual(mcp.discoveryArguments(fixture.tool),{city:['la'],limit:75});
});

test('official fields preserve times, topics, links, status and approximate locations', () => {
  const events=mcp.normalizeMcpEvents({structuredContent:{events:fixture.events}});
  assert.equal(events.length,4);
  assert.equal(events[0].lat,null);
  assert.equal(events[1].start,fixture.events[1].startsAt);
  assert.equal(events[1].end,fixture.events[1].endsAt);
  assert.equal(events[1].sourceUrl,fixture.events[1].eventUrl);
  assert.deepEqual(events[1].tags,fixture.events[1].themes);
  assert.equal(events[1].description,fixture.events[1].excerpt);
  assert.equal(events[2].status,'waitlist');
  assert.equal(events[3].neighborhood,'Downtown');
  assert.equal(events[3].locationPrecision,'neighborhood');
});

const event=(id)=>({...fixture.events[1],id:String(id)});
function clientFor(pages){
  return async(method,params)=>{
    if(method==='tools/list')return {tools:[fixture.tool]};
    assert.equal(params.name,'search_events');
    assert.deepEqual(params.arguments.city,['la']);
    assert.equal(params.arguments.limit,75);
    return {structuredContent:pages(params.arguments.page)};
  };
}

test('all 802 results are collected across 11 pages, including the final short page', async () => {
  const requested=[];
  const events=await mcp.fetchOfficialEvents(clientFor(page=>{
    requested.push(page);
    const start=(page-1)*75;
    return {page,events:Array.from({length:Math.min(75,802-start)},(_,i)=>event(start+i)),hasMore:page<11,total:802,totalIsUpperBound:false};
  }));
  assert.equal(events.length,802);
  assert.deepEqual(requested,Array.from({length:11},(_,i)=>i+1));
  assert.equal(events.at(-1).id,'801');
});

test('a failed later page cannot be presented as a successful full sync', async () => {
  await assert.rejects(mcp.fetchOfficialEvents(clientFor(page=>{
    if(page===2)throw new Error('Page unavailable');
    return {page,events:[event(1)],hasMore:true};
  })),/Page unavailable/);
});

test('repeated pages and missing records fail explicitly', async () => {
  await assert.rejects(mcp.fetchOfficialEvents(clientFor(page=>({page,events:[event(1)],hasMore:true}))),/progress/);
  await assert.rejects(mcp.fetchOfficialEvents(clientFor(page=>({page,events:[event(1)],hasMore:false,total:802,totalIsUpperBound:false}))),/count changed/);
});

test('MCP tool errors do not look like an empty event list', () => {
  assert.throws(()=>mcp.normalizeMcpEvents({isError:true,content:[{type:'text',text:'Invalid arguments'}]}),/tool returned an error/);
});
