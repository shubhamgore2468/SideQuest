import { database } from '@/lib/database';
import { fetchOfficialEvents, fallbackCatalogue } from '@/lib/mcp';
import { json } from '@/lib/api';
import { mergeEventCatalog } from '@/lib/events';
export async function GET(request:Request){
 const refresh=new URL(request.url).searchParams.get('refresh')==='1';
 let previous:{payload:string;checked_at:string}|null=null;
 try{
  previous=await database().prepare('SELECT payload, checked_at FROM catalogue WHERE id = ?').bind('la').first<{payload:string;checked_at:string}>();
  if(!refresh&&previous&&Date.now()-Date.parse(previous.checked_at)<900000){const value=JSON.parse(previous.payload);if(value.catalogVersion===2)return json({...value,events:mergeEventCatalog(value.events)});}
 }catch{}
 try{
  const incoming=await fetchOfficialEvents();
  const existing=previous?mergeEventCatalog(JSON.parse(previous.payload).events):undefined;
  const events=mergeEventCatalog(incoming,existing);const value={catalogVersion:2,events,source:'official',checkedAt:new Date().toISOString(),message:`Loaded ${incoming.length} events from the official LA calendar. Previously saved listings are also retained; check each event’s source before traveling.`};
  try{await database().prepare('INSERT INTO catalogue (id, payload, checked_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload, checked_at=excluded.checked_at').bind('la',JSON.stringify(value),value.checkedAt).run();}catch{}
  return json(value);
 }catch(error){
  console.error('sidequest_event_sync_failed',error instanceof Error?error.message:'Unknown error');
  if(previous){const value=JSON.parse(previous.payload);return json({...value,events:mergeEventCatalog(value.events),source:'cached',message:'Live events could not load. Showing the last saved list; events may be missing. Browse the official calendar for the full schedule.'});}
  return json(fallbackCatalogue);
 }
}
