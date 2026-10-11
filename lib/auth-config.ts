// Read server environment dynamically: NEXT_PUBLIC property access is otherwise
// replaced by Next.js at build time and can stay empty after runtime changes.
export function authConfiguration() {
  const env = process.env;
  return {
    publishableKey: env['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY']?.trim() || '',
    secretKey: env['CLERK_SECRET_KEY']?.trim() || '',
  };
}
export function authConfigured() {
  const { publishableKey, secretKey } = authConfiguration();
  return Boolean(publishableKey && secretKey);
}
