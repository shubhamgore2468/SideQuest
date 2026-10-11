import { authConfigured } from '@/lib/auth-config';
import { GoogleCallback } from '@/components/google-callback';
import Link from 'next/link';
export default function SSOCallback() {
  return authConfigured() ? <GoogleCallback /> : <p>Google sign-in is not configured. <Link href="/">Return to Sidequest</Link></p>;
}
