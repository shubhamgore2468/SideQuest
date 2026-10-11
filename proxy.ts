import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse, type NextRequest, type NextFetchEvent } from 'next/server';
import { authConfiguration } from '@/lib/auth-config';

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  const { publishableKey, secretKey } = authConfiguration();
  // Keep the diagnostic route available even when Clerk configuration is broken.
  if (request.nextUrl.pathname === '/api/auth-status') return NextResponse.next();
  // Clerk reads CLERK_SECRET_KEY directly from the server environment. Passing
  // it as a dynamic option would require CLERK_ENCRYPTION_KEY as well.
  return publishableKey && secretKey ? clerkMiddleware({ publishableKey })(request, event) : NextResponse.next();
}
export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)'],
};
