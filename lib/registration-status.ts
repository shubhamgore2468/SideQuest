import type { PlanItem } from './models';
import type { ScheduledEvent } from './schedule-layout';

export type RegistrationFilter = 'all' | 'pending' | 'accepted';
export function registrationStatus(event: ScheduledEvent, plans: PlanItem[]): 'pending' | 'accepted' | 'other' {
  if (event.calendarSource) {
    if (/^\s*\[(pending|applied|waitlist(?:ed)?)\]/i.test(event.title)) return 'pending';
    if (/^\s*\[(accepted|approved|confirmed|going)\]/i.test(event.title)) return 'accepted';
    // Partiful's feed uses unprefixed titles for accepted events.
    if (/partiful/i.test(event.calendarSource) || /\|\s*Partiful\s*$/i.test(event.title)) {
      return /^\s*\[/.test(event.title) ? 'other' : 'accepted';
    }
    return 'other';
  }
  const status = plans.find(plan => plan.eventId === event.id)?.status;
  return status === 'confirmed' ? 'accepted' : status === 'applied' || status === 'waitlisted' ? 'pending' : 'other';
}
