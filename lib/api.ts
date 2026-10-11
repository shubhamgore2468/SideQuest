import { sessionOwner } from '@/lib/session';
import { allowedRequestOrigin } from '@/lib/request-origin';
export const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
export async function identity(request?:Request) {
 if(request && !allowedRequestOrigin(request)) throw new HttpError(403,'This request is not allowed. Reload Sidequest and try again.');
 return sessionOwner();
}
export class HttpError extends Error { constructor(public status:number,message:string){super(message);} }
export async function guarded(fn:()=>Promise<Response>){try{return await fn();}catch(e){ if(e instanceof HttpError)return json({error:e.message},e.status); if(e instanceof SyntaxError)return json({error:'Invalid request.'},400); console.error('sidequest_request_failed',e instanceof Error?e.message:'Unknown error');return json({error:'We could not save or load this right now. Please try again.'},503);}}
export async function body(request:Request):Promise<Record<string,unknown>> {const text=await request.text();if(text.length>20000)throw new HttpError(413,'Request is too large.');const data=JSON.parse(text);if(!data||typeof data!=='object'||Array.isArray(data))throw new HttpError(400,'Invalid request.');return data;}
export function field(x:unknown,max:number,required=false){if(typeof x!=='string'){if(required)throw new HttpError(400,'Please complete the required fields.');return '';}const v=x.trim();if(v.length>max||required&&!v)throw new HttpError(400,'Please check your input lengths.');return v;}
export function social(x:unknown,host:string[]){const value=field(x,300);if(!value)return '';try{const u=new URL(value);if(u.protocol!=='https:'||!host.includes(u.hostname.replace(/^www\./,'')))throw 0;return u.href;}catch{throw new HttpError(400,'Use a full https link to your LinkedIn or X profile.');}}
