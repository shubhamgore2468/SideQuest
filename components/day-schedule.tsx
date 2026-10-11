'use client';

import { useState } from 'react';
import { CalendarDays, Clock3, ExternalLink, List, MapPin, Columns3, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { layoutSchedule, scheduleDate, type ScheduledEvent } from '@/lib/schedule-layout';
import { timeLabel, type WeekEvent } from '@/lib/events';
import type { PlanItem } from '@/lib/models';

const HOUR_HEIGHT = 64;
const hourLabel = (hour: number) => hour === 24 ? 'Midnight' : `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`;
const titleLabel = (title: string) => title.replace(/^\[Pending\]\s*/i, '').replace(/\s*#LATechWeek\s*\|\s*Partiful\s*$/i, '').trim();
const pending = (event: ScheduledEvent) => /^\[Pending\]/i.test(event.title);

export function DaySchedule({ events, plans, busy, onSelect, onStatus, onRemove }: {
  events: ScheduledEvent[]; plans: PlanItem[]; busy: boolean;
  onSelect: (event: WeekEvent) => void;
  onStatus: (event: WeekEvent, status: PlanItem['status']) => void;
  onRemove: (event: WeekEvent) => void;
}) {
  const [mode, setMode] = useState<'schedule' | 'list'>('schedule');
  const [detail, setDetail] = useState<ScheduledEvent | null>(null);
  const days = [...new Set(events.map(e => scheduleDate(e.start)))].sort();
  const open = (event: ScheduledEvent) => event.calendarSource ? setDetail(event) : onSelect(event);
  const source = (event: ScheduledEvent) => event.calendarSource || 'Saved in Sidequest';
  const times = (event: ScheduledEvent) => event.allDay ? 'All day · time not specified' : `${timeLabel(event.start)}${event.end ? ` – ${timeLabel(event.end)}` : ' · End time unlisted'}`;
  return <section className="schedule-view" aria-label="My Day schedule">
    <div className="schedule-toolbar"><div><strong>Calendar grid</strong><p>{mode === 'schedule' ? 'Hourly time grid · Overlapping events sit side by side' : 'Event list · Switch to Grid to compare overlapping times'}</p></div><div className="schedule-mode" role="group" aria-label="Schedule display">
      <button aria-pressed={mode === 'schedule'} onClick={() => setMode('schedule')}><Columns3 size={15}/>Grid</button>
      <button aria-pressed={mode === 'list'} onClick={() => setMode('list')}><List size={15}/>List</button>
    </div></div>
    <div className="schedule-legend"><span><i className="legend-calendar"/>Google Calendar</span><span><i className="legend-saved"/>Saved event</span><span><Columns3 size={13}/>Side by side = overlapping times</span></div>
    {events.some(event => !event.allDay && !event.end) && <p className="fine" style={{ marginBottom: 16 }}>Events with an unlisted end time use a one-hour placeholder and aren’t counted as confirmed conflicts.</p>}
    {days.map(date => {
      const dayEvents = events.filter(e => scheduleDate(e.start) === date);
      const allDay = dayEvents.filter(e => e.allDay);
      const positioned = layoutSchedule(dayEvents);
      const overlapCount = positioned.filter(e => e.overlaps).length;
      const firstHour = Math.min(8, Math.floor(Math.min(...positioned.map(e => e.start), 480) / 60));
      const lastHour = Math.min(24, Math.max(20, Math.ceil(Math.max(...positioned.map(e => e.end), 1200) / 60)));
      const hours = Array.from({ length: lastHour - firstHour + 1 }, (_, i) => firstHour + i);
      return <section className="schedule-day" key={date} aria-label={date}>
        <div className="schedule-day-heading"><div><CalendarDays size={18}/><h2>{new Date(`${date}T12:00:00-07:00`).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', weekday: 'long', month: 'short', day: 'numeric' })}</h2><span>{dayEvents.length} events</span></div>{overlapCount > 0 && <span className="schedule-overlap-summary">{overlapCount} events overlap</span>}</div>
        {!!allDay.length && <div className="schedule-all-day"><span className="schedule-all-day-label">ALL DAY</span><div>{allDay.map(event => <button key={event.id} className={`all-day-event ${event.calendarSource ? 'from-calendar' : 'from-sidequest'}`} onClick={() => open(event)}><strong>{titleLabel(event.title)}</strong>{pending(event) && <span className="schedule-pending">Pending</span>}<small>{source(event)}</small></button>)}<p>All-day entries have no specific time and aren’t counted as timing conflicts.</p></div></div>}
        {mode === 'schedule' ? <div className="schedule-grid-scroll"><div className="schedule-grid" aria-label="Hourly calendar grid, Pacific time" style={{ height: (lastHour - firstHour) * HOUR_HEIGHT + 20 }}>
          {hours.map(hour => <div className="schedule-hour" key={hour} style={{ top: (hour - firstHour) * HOUR_HEIGHT }}><span>{hourLabel(hour)}</span><i/></div>)}
          <div className="schedule-events">{!positioned.length && <p className="schedule-empty-grid">No timed events. All-day entries are shown above.</p>}{positioned.map(item => <button key={item.event.id}
            className={`schedule-event ${item.event.calendarSource ? 'from-calendar' : 'from-sidequest'} ${item.overlaps ? 'has-overlap' : ''}`}
            style={{ top: (item.start / 60 - firstHour) * HOUR_HEIGHT + 2, height: Math.max(20, (item.end - item.start) / 60 * HOUR_HEIGHT - 4), left: `calc(${item.column / item.columns * 100}% + 3px)`, width: `calc(${100 / item.columns}% - 6px)` }}
            title={`${item.event.title}\n${times(item.event)}${item.overlaps ? '\nOverlaps another timed event' : ''}`} aria-label={`${item.event.title}, ${times(item.event)}${item.overlaps ? ', overlaps another timed event' : ''}`} onClick={() => open(item.event)}>
              <span className="schedule-event-time">{times(item.event)}</span><strong>{titleLabel(item.event.title)}</strong><span className="schedule-event-meta">{pending(item.event) ? 'Pending · ' : ''}{source(item.event)}</span>{item.event.address && <span className="schedule-event-location"><MapPin size={11}/>{item.event.address}</span>}
          </button>)}</div>
        </div></div> : mode === 'list' && positioned.length > 0 ? <div className="schedule-agenda">{positioned.map(item => <article key={item.event.id} className="schedule-agenda-event"><div className="schedule-agenda-time"><Clock3 size={15}/>{times(item.event)}</div><div><button onClick={() => open(item.event)}><strong>{titleLabel(item.event.title)}</strong></button><p>{source(item.event)}{pending(item.event) && ' · Pending'}</p>{item.event.address && <p><MapPin size={13}/>{item.event.address}</p>}{item.overlaps && <span className="schedule-overlap-summary">Overlaps another timed event</span>}{!item.event.calendarSource && <div className="schedule-agenda-actions"><select aria-label={`Registration status for ${item.event.title}`} value={plans.find(p => p.eventId === item.event.id)?.status || 'interested'} disabled={busy} onChange={e => onStatus(item.event, e.target.value as PlanItem['status'])}>{['interested', 'applied', 'confirmed', 'waitlisted'].map(status => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}</select><Button size="icon" variant="ghost" aria-label={`Remove ${item.event.title}`} disabled={busy} onClick={() => onRemove(item.event)}><Trash2 size={15}/></Button></div>}</div></article>)}</div> : !positioned.length ? <p className="schedule-no-times">No timed events for this day.</p> : null}
      </section>;
    })}
    <Dialog open={!!detail} onOpenChange={open => { if (!open) setDetail(null); }}><DialogContent><DialogHeader><DialogTitle>{detail ? titleLabel(detail.title) : 'Calendar event'}</DialogTitle><DialogDescription>{detail && `Google Calendar · ${source(detail)}`}</DialogDescription></DialogHeader>{detail && <div className="schedule-detail"><p><Clock3 size={17}/>{times(detail)} · Pacific</p>{pending(detail) && <span className="schedule-pending">Pending approval</span>}{detail.address && <p><MapPin size={17}/>{detail.address}</p>}<p className="fine">{detail.allDay ? 'The calendar feed did not provide a specific time. Check Partiful for the latest details.' : 'Details are imported from Google Calendar. Confirm registration and venue with the organizer.'}</p><Button asChild><a href={detail.sourceUrl} target="_blank" rel="noopener noreferrer">Open in Google Calendar <ExternalLink size={15}/></a></Button></div>}</DialogContent></Dialog>
  </section>;
}
