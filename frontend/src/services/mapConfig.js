/**
 * src/services/mapConfig.js
 *
 * Which map and address-search service the app uses (frontend/.env):
 *
 *   VITE_GEOAPIFY_API_KEY=...   -> Geoapify: search-as-you-type, styled light
 *                                  and dark maps. Free key: myprojects.geoapify.com
 *   VITE_MAP_PROVIDER=osm       -> force OpenStreetMap + Nominatim, even with a key
 *
 * Without a key the app uses OpenStreetMap + Nominatim (free, no key), so
 * removing the key switches back. Read on every call, so tests can change it.
 */

export function mapConfig() {
  const key = (import.meta.env.VITE_GEOAPIFY_API_KEY || '').trim();
  const forced = (import.meta.env.VITE_MAP_PROVIDER || '').trim().toLowerCase();
  const provider = key && forced !== 'osm' ? 'geoapify' : 'osm';
  return { provider, geoapifyKey: provider === 'geoapify' ? key : '' };
}
