import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs';
import { authConfiguration } from '@/lib/auth-config';

// Check deployment credentials at request time, rather than freezing guest mode during the build.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Sidequest — Your LA Tech Week",
  description: "Find your events, your people, and your next stop. An independent LA Tech Week companion, October 12–18, 2026.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { publishableKey, secretKey } = authConfiguration();
  return (
    <html lang="en">
      <body className="antialiased">{publishableKey && secretKey ? <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/" signInFallbackRedirectUrl="/" signUpFallbackRedirectUrl="/">{children}</ClerkProvider> : children}</body>
    </html>
  );
}
