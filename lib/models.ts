export type Profile={id:string;name:string;role:string;company:string;bio:string;interests:string[];seeking:string;offering:string;linkedin:string;twitter:string;solo?:boolean};
export type OwnProfile=Profile & {phone:string;email:string;sharePhone:boolean;shareEmail:boolean;contactToken:string|null;itineraryToken:string|null};
export type PlanItem={eventId:string;status:'interested'|'applied'|'confirmed'|'waitlisted'};
export type Connection={profileId:string;metAt:string;note:string;followUp:string;createdAt:string;profile:Profile|null};
export function matchReasons(a:Profile|null,b:Profile):string[]{
 if(!a) return [];
 const reasons=a.interests.filter(t=>b.interests.includes(t)).slice(0,2).map(t=>`Both interested in ${t}`);
 const words=(s:string)=>s.toLowerCase().match(/[a-z]{4,}/g)?.filter(w=>!['with','from','that','this','looking','help','need','want','have','your','about'].includes(w))||[];
 if(words(a.seeking).some(w=>words(b.offering).includes(w))) reasons.unshift('Offers something you are looking for');
 if(words(a.offering).some(w=>words(b.seeking).includes(w))) reasons.push('You may be able to help');
 return reasons.slice(0,3);
}
export function publicProfile(row:Record<string,unknown>):Profile {
 let interests:string[]=[]; try{interests=JSON.parse(String(row.interests||'[]'));}catch{}
 return {id:String(row.id),name:String(row.name),role:String(row.role||''),company:String(row.company||''),bio:String(row.bio||''),interests,seeking:String(row.seeking||''),offering:String(row.offering||''),linkedin:String(row.linkedin||''),twitter:String(row.twitter||''),solo:!!row.solo};
}
export function vcard(p:Profile & {phone?:string;email?:string}) {
 const esc=(s:string)=>s.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/[,;]/g,c=>'\\'+c);
 return ['BEGIN:VCARD','VERSION:3.0',`FN:${esc(p.name)}`,`ORG:${esc(p.company)}`,`TITLE:${esc(p.role)}`,...(p.phone?[`TEL;TYPE=CELL:${esc(p.phone)}`]:[]),...(p.email?[`EMAIL:${esc(p.email)}`]:[]),...(p.linkedin?[`URL:${esc(p.linkedin)}`]:[]),...(p.twitter?[`URL:${esc(p.twitter)}`]:[]),'END:VCARD'].join('\r\n');
}
