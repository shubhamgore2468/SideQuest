import { authConfiguration } from '@/lib/auth-config';

export const dynamic = 'force-dynamic';
export async function GET() {
  const { publishableKey, secretKey } = authConfiguration();
  return Response.json({
    configured: Boolean(publishableKey && secretKey),
    publishableKeyPresent: Boolean(publishableKey),
    secretKeyPresent: Boolean(secretKey),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
