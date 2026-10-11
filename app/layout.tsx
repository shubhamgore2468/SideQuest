import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs';
import { authConfigured } from '@/lib/auth-config';

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
  return (
    <html lang="en">
      <body className="antialiased">{authConfigured() ? <ClerkProvider afterSignOutUrl="/" signInFallbackRedirectUrl="/" signUpFallbackRedirectUrl="/">{children}</ClerkProvider> : children}</body>
    </html>
  );
}
