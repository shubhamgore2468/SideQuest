'use client';

import { useSignIn, useAuth, useUser } from '@clerk/nextjs';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sidequest } from './sidequest';
import { CALENDAR_SCOPES } from '@/lib/calendar-scopes';
import { findGoogleAccount } from '@/lib/google-account';

export function SidequestSession({ authEnabled }: { authEnabled: boolean }) {
  return authEnabled ? <AuthenticatedSidequest /> : <Sidequest accountControls={<Button variant="outline" disabled title="Sign-in is temporarily unavailable on this deployment.">Sign in unavailable</Button>} />;
}

function AuthenticatedSidequest() {
  const { isLoaded, userId, signOut } = useAuth();
  const { signIn } = useSignIn();
  const { user } = useUser();
  const [connecting, setConnecting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState('');
  if (!isLoaded) return <p role="status" className="site-shell">Loading your session…</p>;
  const logout = async () => {
    setLoggingOut(true);
    setError('');
    try {
      await signOut();
      // A full navigation clears private React state and cached server content.
      window.location.replace('/');
    } catch {
      setError('Could not log out. Please try again.');
      setLoggingOut(false);
    }
  };
  const login = async () => {
    setError(''); setConnecting(true);
    try {
      const result = await signIn.sso({ strategy: 'oauth_google', redirectUrl: '/', redirectCallbackUrl: '/sso-callback' });
      if (result.error) throw result.error;
    } catch { setError('Google sign-in could not start. Please try again.'); setConnecting(false); }
  };
  const connectCalendar = async () => {
    setError(''); setConnecting(true);
    try {
      if (!user) throw new Error('Your account is still loading. Please try again.');
      const google = findGoogleAccount(user.externalAccounts);
      const result = google
        ? await google.reauthorize({ additionalScopes: CALENDAR_SCOPES, redirectUrl: '/?view=day' })
        : await user.createExternalAccount({ strategy: 'oauth_google', additionalScopes: CALENDAR_SCOPES, redirectUrl: '/?view=day' });
      const url = result.verification?.externalVerificationRedirectURL;
      if (!url) throw new Error('Calendar authorization could not start. Please try again.');
      window.location.assign(url.href);
    } catch (error) { setError(error instanceof Error ? error.message : 'Calendar authorization failed.'); setConnecting(false); }
  };
  return <Sidequest key={userId || 'guest'} signedIn={!!userId} connectCalendar={connectCalendar} calendarConnecting={connecting} accountControls={<>
    {userId ? <Button variant="outline" disabled={loggingOut} onClick={logout}>{loggingOut ? 'Logging out…' : 'Log out'}</Button> :
      <Button variant="outline" disabled={connecting} onClick={login}>{connecting ? 'Connecting…' : 'Sign in with Google'}</Button>}
    {error && <span role="alert">{error}</span>}
  </>} />;
}
