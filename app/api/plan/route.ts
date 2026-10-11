import { database } from '@/lib/database';
import { body, field, guarded, json, HttpError } from '@/lib/api';
import { sessionOwner, validateOrigin } from '@/lib/session';
export async function POST(request:Request){return guarded(async()=>{
 validateOrigin(request);const owner=await sessionOwner();const data=await body(request);const eventId=field(data.eventId,600,true);
 const db=database();
 if(data.remove===true)await db.prepare('DELETE FROM plans WHERE owner=? AND event_id=?').bind(owner,eventId).run();
 else{const status=field(data.status,20)||'interested';if(!['interested','applied','confirmed','waitlisted'].includes(status))throw new HttpError(400,'Choose a valid registration status.');await db.prepare('INSERT INTO plans (owner,event_id,status) VALUES (?,?,?) ON CONFLICT(owner,event_id) DO UPDATE SET status=excluded.status').bind(owner,eventId,status).run();}
 return json({ok:true});
});}
