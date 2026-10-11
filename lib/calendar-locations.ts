import { neighborhoods } from './events';
import type { CalendarEvent } from './google-calendar';

type Location = Pick<CalendarEvent, 'lat' | 'lng' | 'neighborhood' | 'locationPrecision'>;
const cache = new Map<string, { location: Location; expires: number }>();
const unavailable = /(?:to be (?:confirmed|announced)|\btbd\b|available (?:once|after)|upon approval|online|virtual|zoom)/i;

export async function locateCalendarEvents(events: CalendarEvent[], request: typeof fetch = fetch): Promise<CalendarEvent[]> {
  const deadline = AbortSignal.timeout(8000);
  const addresses = [...new Set(events.map(event => event.address?.trim()).filter((address): address is string => !!address && !unavailable.test(address)))];
  const resolved = new Map<string, Location>();
  let next = 0;
  async function worker() {
    while (next < addresses.length && !deadline.aborted) {
      const address = addresses[next++];
      const key = address.toLowerCase();
      const cached = cache.get(key);
      if (cached && cached.expires > Date.now()) { resolved.set(address, cached.location); continue; }
      const area = Object.keys(neighborhoods).find(name => new RegExp(`\\b${name}\\b`, 'i').test(address));
      let location: Location | undefined = area ? { lat: neighborhoods[area][0], lng: neighborhoods[area][1], neighborhood: area, locationPrecision: 'neighborhood' } : undefined;
      try {
        // Only the venue address is sent; never event titles, identity, or tokens.
        const query = new URLSearchParams({ q: address, lat: '34.018', lon: '-118.405', limit: '3' });
        const response = await request(`https://photon.komoot.io/api/?${query}`, { signal: deadline, cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          const feature = data.features?.find((item: { geometry?: { coordinates?: number[] }; properties?: { osm_key?: string; osm_value?: string; housenumber?: string; name?: string } }) => {
            const [lng, lat] = item.geometry?.coordinates || [];
            const properties = item.properties;
            // Reject distant matches and city/street centroids as exact venues.
            return Number.isFinite(lat) && Number.isFinite(lng) && lat >= 33.3 && lat <= 34.9 && lng >= -119.1 && lng <= -117.3 &&
              !!properties && (!/^\s*\d+/.test(address) || properties.housenumber === address.match(/^\s*(\d+[A-Za-z-]*)/)?.[1]) && (!!properties.housenumber || !['place', 'boundary', 'highway'].includes(properties.osm_key || '') && !['city', 'town', 'village', 'suburb', 'neighbourhood', 'residential', 'road'].includes(properties.osm_value || '') && !!properties.name);
          });
          if (feature) location = { lat: feature.geometry.coordinates[1], lng: feature.geometry.coordinates[0], neighborhood: area || feature.properties.city || '', locationPrecision: 'venue' };
        }
      } catch { /* A map lookup must never prevent calendar sync. */ }
      if (location) {
        resolved.set(address, location);
        if (cache.size >= 500) cache.delete(cache.keys().next().value!);
        cache.set(key, { location, expires: Date.now() + (location.locationPrecision === 'venue' ? 86400000 : 300000) });
      }
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  return events.map(event => {
    const address = event.address?.trim() || '';
    const location = resolved.get(address);
    if (location) return { ...event, ...location };
    const area = !unavailable.test(address) && Object.keys(neighborhoods).find(name => new RegExp(`\\b${name}\\b`, 'i').test(address));
    return area ? { ...event, lat: neighborhoods[area][0], lng: neighborhoods[area][1], neighborhood: area, locationPrecision: 'neighborhood' } : event;
  });
}
