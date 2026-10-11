export function isGoogleAccount(account: { provider?: string | null }) {
  return account.provider === 'google' || account.provider === 'oauth_google';
}

export function findGoogleAccount<T extends { provider?: string | null }>(accounts: T[]) {
  return accounts.find(isGoogleAccount);
}
