'use client';
import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CalendarDiagnostics } from '@/lib/calendar-client';

export function CalendarSyncError({ message, diagnostics, lastSyncedAt }: { message: string; diagnostics: CalendarDiagnostics | null; lastSyncedAt: string }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  const report = JSON.stringify({ error: message, ...diagnostics }, null, 2);
  return <div className="calendar-sync-error" role="alert">
    <p><AlertCircle size={18}/><strong>Calendar sync failed</strong></p>
    <p>{message}</p>
    {lastSyncedAt && <p>The events below are from the last successful sync at {new Date(lastSyncedAt).toLocaleString()}. They may be out of date.</p>}
    <details open><summary>Error details</summary><pre>{report}</pre></details>
    <Button variant="outline" onClick={async () => { setCopyError(''); try { await navigator.clipboard.writeText(report); setCopied(true); } catch { setCopied(false); setCopyError('Copy is unavailable. Select and copy the details above.'); } }}>{copied ? 'Copied' : 'Copy error details'}</Button>
    {copyError && <p role="status">{copyError}</p>}
  </div>;
}
