import { cookies } from 'next/headers';
import { HttpError } from './api';
import { auth } from '@clerk/nextjs/server';
import { authConfigured } from './auth-config';
import { allowedRequestOrigin } from './request-origin';
export async function signedInOwner() {
 if (!authConfigured()) return null;
 const { userId } = await auth();
 return userId ? `clerk:${userId}` : null;
}
export async function sessionOwner(){const account=await signedInOwner();if(account)return account;const token=(await cookies()).get('sq_guest')?.value;if(token&&/^[a-f0-9]{64}$/.test(token))return 'guest:'+token;throw new HttpError(401,'Reload this page to start your private planning session.');}
export function guestToken(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');}
export function validateOrigin(request:Request){if(!allowedRequestOrigin(request))throw new HttpError(403,'This request is not allowed. Reload Sidequest and try again.');}
