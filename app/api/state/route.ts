import { cookies } from 'next/headers';
import { database } from '@/lib/database';
import { publicProfile } from '@/lib/models';
import { guarded, json } from '@/lib/api';
import { guestToken, signedInOwner } from '@/lib/session';

export async function GET() {
  return guarded(async () => {
    const jar = await cookies();
    let guest = jar.get('sq_guest')?.value;
    const fresh = !guest || !/^[a-f0-9]{64}$/.test(guest);
    if (fresh) guest = guestToken();
    const owner = await signedInOwner() || `guest:${guest}`;
    const db = database();
    const profile = await db.prepare('SELECT * FROM profiles WHERE user_id=?').bind(owner).first<Record<string, unknown>>();
    const plans = await db.prepare('SELECT event_id as eventId, status FROM plans WHERE owner=?').bind(owner).all();
    const attendance = await db.prepare('SELECT event_id as eventId, solo FROM attendance WHERE owner=?').bind(owner).all();
    const response = json({ profile: profile ? { ...publicProfile(profile), phone: profile.phone, email: profile.email,
        sharePhone: !!profile.share_phone, shareEmail: !!profile.share_email,
        contactToken: profile.contact_token, itineraryToken: profile.itinerary_token } : null,
      plans: plans.results, attendance: attendance.results });
    if (fresh) response.headers.append('Set-Cookie',
      `sq_guest=${guest}; Path=/; HttpOnly; ${process.env.NODE_ENV === 'production' ? 'Secure; ' : ''}SameSite=Lax; Max-Age=31536000`);
    return response;
  });
}
