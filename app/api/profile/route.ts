import { database } from '@/lib/database';
import { body, field, guarded, identity, json, social, HttpError } from '@/lib/api';
export async function POST(request:Request){return guarded(async()=>{
 const owner=await identity(request);const data=await body(request);
 const name=field(data.name,80,true),role=field(data.role,100),company=field(data.company,100),bio=field(data.bio,500),seeking=field(data.seeking,250),offering=field(data.offering,250),linkedin=social(data.linkedin,['linkedin.com']),twitter=social(data.twitter,['x.com','twitter.com']),phone=field(data.phone,40),email=field(data.email,254);
 if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new HttpError(400,'Please check your email address.');
 if(!Array.isArray(data.interests)||data.interests.length>8||data.interests.some(t=>typeof t!=='string'||t.length>40))throw new HttpError(400,'Choose up to eight interests.');
 const db=database();const existing=await db.prepare('SELECT id FROM profiles WHERE user_id=?').bind(owner).first<{id:string}>();const id=existing?.id||crypto.randomUUID();
 await db.prepare('INSERT INTO profiles (user_id,id,name,role,company,bio,interests,seeking,offering,linkedin,twitter,phone,email,share_phone,share_email,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET name=excluded.name,role=excluded.role,company=excluded.company,bio=excluded.bio,interests=excluded.interests,seeking=excluded.seeking,offering=excluded.offering,linkedin=excluded.linkedin,twitter=excluded.twitter,phone=excluded.phone,email=excluded.email,share_phone=excluded.share_phone,share_email=excluded.share_email,updated_at=excluded.updated_at').bind(owner,id,name,role,company,bio,JSON.stringify([...new Set(data.interests)]),seeking,offering,linkedin,twitter,phone,email,data.sharePhone===true?1:0,data.shareEmail===true?1:0,new Date().toISOString()).run();
 return json({id});
});}
