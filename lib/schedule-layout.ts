import type { WeekEvent } from './events';

export type ScheduledEvent = WeekEvent & { calendarSource?: string; allDay?: boolean };
export type PositionedEvent = { event: ScheduledEvent; start: number; end: number; column: number; columns: number; overlaps: boolean };

export function localMinutes(value: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value));
  return Number(parts.find(p => p.type === 'hour')?.value) * 60 + Number(parts.find(p => p.type === 'minute')?.value);
}
export function scheduleDate(value: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}

// Partition connected overlap groups, then reuse a column when its event ends.
export function layoutSchedule(events: ScheduledEvent[]): PositionedEvent[] {
  const timed = events.filter(e => !e.allDay).map(event => {
    const start = localMinutes(event.start);
    const end = event.end ? (scheduleDate(event.end) !== scheduleDate(event.start) ? 1440 : localMinutes(event.end)) : Math.min(1440, start + 60);
    return { event, start, end: Math.max(start + 1, end), column: 0, columns: 1, overlaps: false };
  }).sort((a, b) => a.start - b.start || b.end - a.end);
  const groups: PositionedEvent[][] = [];
  let group: PositionedEvent[] = [], groupEnd = -1;
  for (const item of timed) {
    if (item.start >= groupEnd) { if (group.length) groups.push(group); group = []; groupEnd = -1; }
    group.push(item); groupEnd = Math.max(groupEnd, item.end);
  }
  if (group.length) groups.push(group);
  for (const items of groups) {
    const ends: number[] = [];
    for (const item of items) {
      const free = ends.findIndex(end => end <= item.start);
      item.column = free < 0 ? ends.length : free;
      ends[item.column] = item.end;
      item.overlaps = !!item.event.end && items.some(other => other !== item && !!other.event.end && item.start < other.end && other.start < item.end);
    }
    for (const item of items) item.columns = ends.length;
  }
  return timed;
}
