import { database } from '@/lib/database';
import { body, guarded, identity, json, HttpError } from '@/lib/api';
import { guestToken } from '@/lib/session';
export async function POST(request:Request){return guarded(async()=>{const owner=await identity(request);const data=await body(request);if(!['contact','itinerary'].includes(String(data.kind)))throw new HttpError(400,'Choose a share type.');const db=database();if(!await db.prepare('SELECT id FROM profiles WHERE user_id=?').bind(owner).first())throw new HttpError(400,'Create your profile first.');const column=data.kind==='contact'?'contact_token':'itinerary_token';const token=data.disable===true?null:guestToken();await db.prepare(`UPDATE profiles SET ${column}=? WHERE user_id=?`).bind(token,owner).run();return json({token});});}
