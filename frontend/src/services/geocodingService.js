/**
 * src/services/geocodingService.js
 *
 * Address search (place name -> coordinates) and reverse geocoding
 * (coordinates -> address), with Geoapify when a key is set, otherwise
 * OpenStreetMap's free Nominatim (see mapConfig.js). These are the only calls
 * to a service other than our backend (apiClient.js handles ours).
 *
 * Nominatim's usage policy allows at most 1 request per second and no
 * search-as-you-type, so with it we search only when the user presses Search
 * (supportsAutocomplete() tells the map which mode to use).
 *
 * Every function returns { ok: true, data } or { ok: false, message } and
 * never throws.
 */

import { mapConfig } from './mapConfig';

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const GEOAPIFY = 'https://api.geoapify.com/v1/geocode';

const round5 = (n) => Number(Number(n).toFixed(5)); // 5 decimals is about 1 m

export function supportsAutocomplete() {
  return mapConfig().provider === 'geoapify';
}

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// "Sector 17, Ward 3, Chandigarh" -> title "Sector 17", subtitle "Ward 3, Chandigarh"
function splitName(name) {
  const [title, ...rest] = name.split(',');
  return { title: title.trim(), subtitle: rest.join(',').trim() };
}

/**
 * Places matching the text. `near` ([lat, lng], optional) ranks closer places
 * first with Geoapify. Results: [{ name, title, subtitle, latitude, longitude }].
 */
export async function searchPlaces(query, { near } = {}) {
  const q = query.trim();
  if (!q) return { ok: true, data: [] };
  const { provider, geoapifyKey } = mapConfig();
  try {
    if (provider === 'geoapify') {
      const params = new URLSearchParams({ text: q, format: 'json', limit: '5', lang: 'en', apiKey: geoapifyKey });
      // CivicFix is for Indian cities: only Indian places, nearest first.
      params.set('filter', 'countrycode:in');
      if (near) params.set('bias', `proximity:${near[1]},${near[0]}`);
      const body = await getJson(`${GEOAPIFY}/autocomplete?${params}`);
      return {
        ok: true,
        data: (body.results || []).map((r) => ({
          name: r.formatted,
          title: r.address_line1 || splitName(r.formatted).title,
          subtitle: r.address_line2 || splitName(r.formatted).subtitle,
          latitude: round5(r.lat),
          longitude: round5(r.lon),
        })),
      };
    }
    const rows = await getJson(`${NOMINATIM}/search?format=jsonv2&limit=5&q=${encodeURIComponent(q)}`);
    return {
      ok: true,
      data: rows.map((row) => ({
        name: row.display_name,
        ...splitName(row.display_name),
        latitude: round5(row.lat),
        longitude: round5(row.lon),
      })),
    };
  } catch (e) {
    return {
      ok: false,
      message: e.message?.startsWith('HTTP')
        ? 'Address search is not available right now. Place the pin on the map instead.'
        : 'Address search failed. Check your connection, or place the pin on the map.',
    };
  }
}

/** The address at a point: { ok: true, data: name or null }. */
export async function reverseGeocode(latitude, longitude) {
  const { provider, geoapifyKey } = mapConfig();
  try {
    if (provider === 'geoapify') {
      const params = new URLSearchParams({ lat: latitude, lon: longitude, format: 'json', lang: 'en', apiKey: geoapifyKey });
      const body = await getJson(`${GEOAPIFY}/reverse?${params}`);
      return { ok: true, data: body.results?.[0]?.formatted || null };
    }
    const row = await getJson(`${NOMINATIM}/reverse?format=jsonv2&zoom=18&lat=${latitude}&lon=${longitude}`);
    return { ok: true, data: row.display_name || null };
  } catch {
    return { ok: false, message: 'Could not look up the address here.' };
  }
}
