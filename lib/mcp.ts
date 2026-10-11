import { curatedEvents, neighborhoods, type WeekEvent } from './events';
const ENDPOINT='https://www.tech-week.com/api/mcp';
type Tool={name:string;inputSchema?:{properties?:Record<string,{type?:string;enum?:unknown[];default?:unknown;maximum?:number}>;required?:string[]}};
export function readRpc(text:string){
 try{return JSON.parse(text);}catch{}
 for(const line of text.split('\n').filter(l=>l.startsWith('data:'))){try{const p=JSON.parse(line.slice(5));if(p.result||p.error)return p;}catch{}}
 throw new Error('Unsupported MCP response');
}
export function discoveryArguments(tool:Tool):Record<string,unknown>{
 const properties=tool.inputSchema?.properties||{};const result:Record<string,unknown>={};
 for(const [key,schema] of Object.entries(properties)){
  if(/^(city|location|city_slug)$/.test(key)){ const chosen=schema.enum?.find(v=>typeof v==='string'&&/^(la|los angeles)$/i.test(v));result[key]=schema.type==='array'?[chosen||'la']:chosen||'la'; }
  // A city-wide catalogue must not search event text for dates or the city name.
  if(/^(query|search|q)$/.test(key)&&tool.inputSchema?.required?.includes(key))result[key]='';
  if(key==='limit')result[key]=Math.min(75,schema.maximum??75);
 }
 for(const key of tool.inputSchema?.required||[]){if(!(key in result)){const s=properties[key];if(s?.default!==undefined)result[key]=s.default;else throw new Error('Unsupported required MCP argument: '+key);}}
 return result;
}
function strings(value:unknown):string[]{return Array.isArray(value)?value.map(v=>typeof v==='string'?v:String(v?.name||'')).filter(Boolean):typeof value==='string'?value.split(',').map(v=>v.trim()):[];}
function https(value:unknown):string|null{try{const u=new URL(String(value));return u.protocol==='https:'?u.href:null;}catch{return null;}}
export function mcpData(raw:unknown):any{
 let data:any=raw;
 if(data?.isError)throw new Error('Tech Week event tool returned an error');
 if(data?.structuredContent)data=data.structuredContent;
 else if(data?.content){const text=data.content.filter((x:any)=>x.type==='text').map((x:any)=>x.text).join('\n');try{data=JSON.parse(text);}catch{throw new Error('Unsupported event tool response');}}
 return data;
}
export function normalizeMcpEvents(raw:unknown):WeekEvent[]{
 const data=mcpData(raw);
 const list=Array.isArray(data)?data:data?.events||data?.items||data?.data?.events||data?.data;
 if(!Array.isArray(list))return [];
 return list.flatMap((r:any)=>{
  const title=r.title||r.name;const start=r.startsAt||r.start_at||r.startAt||r.start_date||r.start;const city=String(r.city||r.citySlug||r.city_slug||r.location?.city||'');
  if(!title||!start||!Number.isFinite(Date.parse(start))||!/(los angeles|^la$)/i.test(city))return [];
  const d=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(start));
  if(d<'2026-10-12'||d>'2026-10-18')return [];
  const source=https(r.eventUrl||r.url||r.event_url||r.source_url);if(!source)return [];
  const neighborhood=String(r.neighborhoods?.[0]||r.neighborhood||r.location?.neighborhood||'').replace(/ \(LA\)$/,'');const coord=neighborhoods[neighborhood];
  // Exact venues require an explicit public-location indication; otherwise preserve area privacy.
  const publicVenue=r.location_visibility==='public'||r.location?.visibility==='public';
  const lat=Number(r.latitude??r.lat??r.location?.latitude);const lng=Number(r.longitude??r.lng??r.location?.longitude);
  const exact=publicVenue&&Number.isFinite(lat)&&Number.isFinite(lng)&&lat>33&&lat<35&&lng>-119&&lng<-117;
  const end=r.endsAt||r.end_at||r.endAt||r.end;const status=String(r.registration||r.rsvp_status||r.registration_status||'').toLowerCase();
  return [{id:String(r.id||source),title:String(title).slice(0,300),host:strings(r.hosts||r.host||r.organizer).join(' · '),start:new Date(start).toISOString(),end:end&&Number.isFinite(Date.parse(end))&&Date.parse(end)>Date.parse(start)?new Date(end).toISOString():null,neighborhood,address:publicVenue&&typeof r.address==='string'?r.address:undefined,lat:exact?lat:coord?.[0]??null,lng:exact?lng:coord?.[1]??null,locationPrecision:exact?'venue':coord?'neighborhood':'unknown',format:strings(r.formats||r.format||r.type).join(' · ')||'Event',tags:strings(r.themes||r.topics||r.tags).slice(0,8),description:String(r.description||r.excerpt||r.summary||'See the organizer for the event details.').replace(/<[^>]*>/g,'').slice(0,1800),audience:String(r.audience||'See the organizer description'),sourceUrl:source,registrationUrl:https(r.registration_url||r.rsvp_url)||source,status:['open','available'].includes(status)?'open':status.includes('waitlist')?'waitlist':['full','closed','sold_out','cancelled','canceled'].includes(status)?'closed':'check-source',featured:r.isFeatured===true,checkedAt:new Date().toISOString()} as WeekEvent];
 });
}
export async function connectOfficialMcp(){
 const deadline=AbortSignal.timeout(30000);
 let session='';let serial=0;
 const rpc=async(method:string,params:unknown)=>{const res=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2025-03-26',...(session?{'Mcp-Session-Id':session}:{})},body:JSON.stringify({jsonrpc:'2.0',id:++serial,method,params}),signal:AbortSignal.any([deadline,AbortSignal.timeout(6000)])});if(!res.ok)throw new Error(`MCP ${method}: HTTP ${res.status}`);session=res.headers.get('mcp-session-id')||session;const payload=readRpc(await res.text());if(payload.error)throw new Error(`MCP ${method}: ${payload.error.message||'request rejected'}`);return payload.result;};
 await rpc('initialize',{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'sidequest',version:'1.0.0'}});
 const notification=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream',...(session?{'Mcp-Session-Id':session,'MCP-Protocol-Version':'2025-03-26'}:{})},body:JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'}),signal:AbortSignal.any([deadline,AbortSignal.timeout(6000)])});if(!notification.ok)throw new Error('MCP initialization failed');await notification.body?.cancel();
 return rpc;
}
type Rpc=(method:string,params:unknown)=>Promise<any>;
export async function fetchOfficialEvents(client?:Rpc):Promise<WeekEvent[]>{
 const rpc=client||await connectOfficialMcp();
 const listed=await rpc('tools/list',{});
 const tool=listed.tools?.find((t:Tool)=>t.name==='search_events');
 if(!tool?.inputSchema?.properties?.page)throw new Error('No supported paginated event tool');
 const args=discoveryArguments(tool);
 const events=new Map<string,WeekEvent>();
 const seen=new Set<string>();
 for(let page=1;page<=50;page++){
  const data=mcpData(await rpc('tools/call',{name:tool.name,arguments:{...args,page}}));
  if(!Array.isArray(data.events)||data.page!==page||typeof data.hasMore!=='boolean')throw new Error('Invalid event pagination response');
  const normalized=normalizeMcpEvents(data);
  if(normalized.length!==data.events.length)throw new Error(`Could not read ${data.events.length-normalized.length} events on page ${page}`);
  const before=seen.size;
  for(const event of normalized){seen.add(event.id);events.set(event.id,event);}
  if(data.hasMore&&seen.size===before)throw new Error('Event pagination stopped making progress');
  if(!data.hasMore){
   if(!events.size)throw new Error('No verified LA events in MCP result');
   if(data.totalIsUpperBound===false&&typeof data.total==='number'&&events.size!==data.total)throw new Error('Event count changed during sync; refresh to try again');
   return [...events.values()];
  }
 }
 throw new Error('Event pagination exceeded the safety limit');
}
export const fallbackCatalogue={events:curatedEvents,source:'curated' as const,checkedAt:'2026-10-06T08:30:00Z',message:'Live events could not load. Showing 12 curated events, not the full LA schedule. Browse the official calendar for all events.'};
