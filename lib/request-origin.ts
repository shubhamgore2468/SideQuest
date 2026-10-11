// The browser connects to the public host; a reverse proxy may rewrite the
// server request URL to an internal address. Host retains the request authority.
export function allowedRequestOrigin(request: Request): boolean {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false;
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    const browser = new URL(origin);
    if (!['http:', 'https:'].includes(browser.protocol) || origin !== browser.origin) return false;
    const server = new URL(request.url);
    if (browser.origin === server.origin) return true;
    const host = request.headers.get('host');
    // Do not trust arbitrary forwarded-host headers. Host is the actual HTTP
    // authority, and browsers cannot override it in cross-origin fetches.
    if (!host || browser.host.toLowerCase() !== host.toLowerCase()) return false;
    const protocol = request.headers.get('x-forwarded-proto');
    return browser.protocol === (protocol === 'https' ? 'https:' : protocol === 'http' ? 'http:' : server.protocol);
  } catch { return false; }
}
