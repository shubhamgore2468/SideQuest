export type WeekEvent = {
  id: string; title: string; host: string; start: string; end: string | null;
  neighborhood: string; address?: string; lat: number | null; lng: number | null;
  locationPrecision: 'venue' | 'neighborhood' | 'unknown';
  format: string; tags: string[]; description: string; audience: string;
  sourceUrl: string; registrationUrl: string; status: 'check-source' | 'open' | 'waitlist' | 'closed';
  checkedAt: string; parking?: string; featured?: boolean;
};
export const neighborhoods: Record<string, [number, number]> = {
  'Santa Monica': [34.0195,-118.4912], Venice: [33.985,-118.4695], 'Playa Vista': [33.976,-118.419],
  'Culver City': [34.0211,-118.3965], 'Beverly Hills': [34.0736,-118.4004], Downtown: [34.0467,-118.2519],
  'West Hollywood': [34.09,-118.3617], 'El Segundo': [33.9192,-118.4165], 'Arts District': [34.0407,-118.2345],
  'South LA': [33.989,-118.291], 'Mid City': [34.041,-118.35], Brentwood: [34.052,-118.473],
};
const base = 'https://www.tech-week.com/calendar/la';
function event(id:string,title:string,host:string,date:string,time:string,end:string|null,neighborhood:string,format:string,tags:string[],description:string,audience:string,slug?:string): WeekEvent {
  const coordinate=neighborhoods[neighborhood];
  const sourceUrl=slug ? `${base}/events/${slug}` : `${base}?host=${encodeURIComponent(id)}`;
  return {id,title,host,start:`2026-10-${date}T${time}:00-07:00`,end:end?`2026-10-${date}T${end}:00-07:00`:null,neighborhood,lat:coordinate?.[0]??null,lng:coordinate?.[1]??null,locationPrecision:coordinate?'neighborhood':'unknown',format,tags,description,audience,sourceUrl,registrationUrl:sourceUrl,status:'check-source',checkedAt:'2026-10-06T08:30:00Z'};
}
// Curated fallback: facts from the linked official listings, checked October 6, 2026.
// Neighborhood centroids are approximate area markers, never claimed as venue coordinates.
export const curatedEvents: WeekEvent[] = [
 event('jpm-kickoff','LA Tech Week Kickoff: From Zero to Scale','JP Morgan · H5efounders','12','08:45','11:45','Playa Vista','Panel',['Founders','Investing'],'Founder and investor panels, followed by coffee and conversation about building and scaling companies.','Founders, investors, and operators','la-tech-week-kickoff-from-zero-to-scale-393384e2-27e4-470d-a420-0541f6e543ef'),
 event('vibe-code-mama','AI Creator Salon with Michelle Phan','Vibe Code Mama','12','15:00',null,'','Salon',['AI','Creators'],'An AI creator salon hosted by Vibe Code Mama. Check the official listing for admission and venue details.','Creators and people exploring AI'),
 event('wonder-ventures','The Penmar Social','Wonder Ventures · Tinder','12','16:00',null,'','Networking',['Founders','Networking'],'A gathering for founders and operators hosted by Wonder Ventures and Tinder.','Founders and operators'),
 event('hsbc','The Official a16z Tech Week Kickoff','HSBC · a16z Speedrun · Fenwick','12','18:00',null,'Santa Monica','Networking',['Founders','Networking'],'Start the week at the official kickoff in Santa Monica. Visit the organizer listing for current registration details.','The wider tech community'),
 event('builders-brews','Builders & Brews LA','Tavily','13','09:00','17:00','Santa Monica','Hackathon',['AI','Engineering','Developer Tools'],'A day of workshops, technical mentorship, and building with Tavily and Nebius. Bring a project or join with an idea.','Builders, developers, and AI enthusiasts','builders-and-brews-la-cdfc3da3-079b-430b-827f-a6e700d16d42'),
 event('adobe','Who owns creativity now?','Adobe · Greycroft','13','16:00',null,'','Panel',['AI','Creators'],'A conversation hosted by Adobe and Greycroft about creativity. See the official listing for location and admission.','Creators and technology professionals'),
 event('google-codelabs','Google Codelabs','Google for Developers','14','09:00','17:00','Venice','Workshop',['AI','Engineering','Developer Tools'],'Guided coding sessions covering AI, cloud, and full-stack apps, with Google Developer Experts. Bring a laptop and charger.','Developers and technical founders','google-codelabs-at-fd1e364b-fdf7-4f41-b6db-9c325d8edb74'),
 event('founder-golden-hour','Founder Golden Hour','Fin · Fireworks · Vanta','14','18:00','20:00','Venice','Happy Hour',['Founders','AI','Networking'],'A founder social by the water, with food, drinks, and time for conversation. The organizer specifies limited space and no plus ones.','Founders','founder-golden-hour-w-fin-fireworks-vanta-ab491a8d-da36-4f0c-9859-2cc891025ea3'),
 event('pitch-roast-young','Pitch Roast: Young Founders Edition','Newgen Venture Partners','14','18:00','20:00','Santa Monica','Pitch Event',['Founders','Investing'],'Short founder pitches, candid feedback from investors and operators, and a mixer afterward.','Emerging founders, investors, and builders','pitch-roast-young-founders-edition-1c12b981-c799-4763-94ac-3a703bad05c2'),
 event('pitch-roast','Pitch Roast Live','Pitch Roast Live · Atlassian','15','18:00','21:00','Santa Monica','Pitch Event',['Founders','Investing','Creators'],'Startup pitches meet live comedy, with comedians and venture investors giving founders feedback.','Founders and startup-curious attendees','pitch-roast-live-0c491a5d-f286-4917-a01f-9cab00f3792d'),
 event('elevenlabs-party','a16z × ElevenLabs Official Afterparty','ElevenLabs · a16z Speedrun','16','18:00','22:00','Venice','Happy Hour',['AI','Creators','Networking'],'A Tech Week closing celebration with announcements and music. The exact location is shared by the organizer after approval.','Creators, founders, and the tech community','a16z-elevenlabs-official-afterparty-b1629b8e-0162-4c65-9aff-1018902ad0a3'),
 event('black-l-a-tech-week-community-collective','Future Builders: Family STEM Day','Black L.A. Tech Week Community Collective','18','14:00',null,'South LA','Community',['Community','Engineering'],'A community STEM event listed on the official LA Tech Week calendar. Check the host for the full program and admission.','Families and curious future builders'),
];
curatedEvents[0].address='13031 West Jefferson Blvd, Building 500, Los Angeles, CA 90094';
curatedEvents[0].parking='Host directions: enter Gate 2 off Alla Road, turn left, and drive to the far end of the lot near Building 500. Confirm access with the host.';
curatedEvents[4].featured=true;

function eventIdentity(event: WeekEvent): string {
  // Host-calendar URLs are not event identities: a host can run many events.
  try {
    const url = new URL(event.sourceUrl);
    if (/\/events\/[^/]+\/?$/.test(url.pathname)) {
      const uuid = url.pathname.match(/([a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})\/?$/i)?.[1];
      return `${url.origin}${uuid ? `/events/${uuid.toLowerCase()}` : url.pathname.replace(/\/$/, '')}`;
    }
  } catch {}
  return `${event.title.trim().toLowerCase()}|${Date.parse(event.start)}`;
}

// Keep the application's IDs stable when an upstream source changes its IDs.
// Retain previously checked listings if a partial update omits them, so a
// saved plan never disappears solely because the latest feed is incomplete.
export function mergeEventCatalog(incoming: WeekEvent[], previous: WeekEvent[] = curatedEvents): WeekEvent[] {
  const records = new Map<string, WeekEvent>();
  for (const event of previous) records.set(eventIdentity(event), event);
  for (const event of incoming) {
    const key = eventIdentity(event);
    const existing = records.get(key);
    records.set(key, existing ? { ...event, id: existing.id } : event);
  }
  return [...records.values()];
}
export const dayKey=(e:WeekEvent)=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',day:'2-digit'}).format(new Date(e.start));
export const timeLabel=(value:string)=>new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',hour:'numeric',minute:'2-digit'}).format(new Date(value));
export function eventSearch(e:WeekEvent,q:string) { return `${e.title} ${e.host} ${e.neighborhood} ${e.tags.join(' ')} ${e.format}`.toLowerCase().includes(q.toLowerCase().trim()); }
export function mapsSearch(query:string) { return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`; }
export function directions(origin:WeekEvent|null,destination:WeekEvent) { const params=new URLSearchParams({api:'1',destination:destination.address||`${destination.neighborhood}, Los Angeles, CA`}); if(origin) params.set('origin',origin.address||`${origin.neighborhood}, Los Angeles, CA`); return `https://www.google.com/maps/dir/?${params}`; }
export function eventGap(a:WeekEvent,b:WeekEvent):number|null { return a.end ? Math.round((Date.parse(b.start)-Date.parse(a.end))/60000):null; }
export function isConflict(a:WeekEvent,b:WeekEvent) { return !!a.end && !!b.end && Date.parse(a.start)<Date.parse(b.end) && Date.parse(b.start)<Date.parse(a.end); }
const escapeICS=(s:string)=>s.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
export function calendarFile(events:WeekEvent[]) {
 const stamp=(s:string)=>new Date(s).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z/,'Z');
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Sidequest//LA Tech Week//EN','CALSCALE:GREGORIAN',...events.flatMap(e=>['BEGIN:VEVENT',`UID:${e.id}@sidequest.la`,`DTSTAMP:${stamp(new Date().toISOString())}`,`DTSTART:${stamp(e.start)}`,...(e.end?[`DTEND:${stamp(e.end)}`]:[]),`SUMMARY:${escapeICS(e.title)}`,`LOCATION:${escapeICS(e.address||e.neighborhood||'Check organizer for location')}`,`DESCRIPTION:${escapeICS('Saved plan only. Register with the organizer: '+e.registrationUrl)}`,`URL:${e.sourceUrl}`,'END:VEVENT']),'END:VCALENDAR'].join('\r\n');
}
