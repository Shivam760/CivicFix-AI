/**
 * Shared Leaflet setup for every map (LocationPicker, the Nearby issues map):
 * the tiles (OpenStreetMap, or Geoapify with a key) and pins drawn in our own
 * colours. The light/dark tint of the OpenStreetMap tiles is in styles/map.css.
 */
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../../styles/map.css';
import { useTheme } from '../../context/ThemeContext';
import { mapConfig } from '../../services/mapConfig';

// Where a map starts when there is nothing to show yet (Chandigarh, where the demo data is).
export const DEFAULT_CENTER = [30.7333, 76.7794];

// OpenStreetMap's free tiles (no API key). map.css tints them to match the
// page: a warmer, softer look in light mode and a darkened one in dark mode.
const OSM_TILES = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  styled: false,
};

// Geoapify's styled tiles (with VITE_GEOAPIFY_API_KEY): a real light and dark
// style, so map.css leaves them untinted.
const GEOAPIFY_STYLES = { light: 'osm-bright-smooth', dark: 'dark-matter' };
const GEOAPIFY_ATTRIBUTION =
  'Powered by <a href="https://www.geoapify.com/">Geoapify</a> | &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * The tiles for the current provider (services/mapConfig.js) and theme:
 * { url, attribution, styled }. Use `url` as the TileLayer's key, so React
 * swaps the layer when the theme changes, and add the class "cf-styled" to
 * the map when `styled` is true.
 */
export function useMapTiles() {
  const { isDark } = useTheme();
  const { provider, geoapifyKey } = mapConfig();
  if (provider !== 'geoapify') return OSM_TILES;
  const style = GEOAPIFY_STYLES[isDark ? 'dark' : 'light'];
  return {
    url: `https://maps.geoapify.com/v1/tile/${style}/{z}/{x}/{y}.png?apiKey=${encodeURIComponent(geoapifyKey)}`,
    attribution: GEOAPIFY_ATTRIBUTION,
    styled: true,
  };
}

// Pin colours per report status, matching the status badges.
export const STATUS_PIN_COLORS = {
  reported: '#d97706',
  under_review: '#2563eb',
  in_progress: '#0d9488',
  awaiting_verification: '#7c3aed',
  resolved: '#059669',
  closed: '#78716c',
};

const pinCache = new Map();

/**
 * A map pin as an SVG in the given colour. Leaflet's default pin is a blue
 * PNG that does not fit our design (and bundlers break its image URLs).
 */
export function pinIcon(color = '#059669') {
  if (!pinCache.has(color)) {
    pinCache.set(
      color,
      L.divIcon({
        className: 'cf-pin',
        html: `<svg viewBox="0 0 32 44" width="32" height="44" aria-hidden="true">
          <path d="M16 1.5C8 1.5 1.5 7.9 1.5 15.9 1.5 26.6 16 42.5 16 42.5S30.5 26.6 30.5 15.9C30.5 7.9 24 1.5 16 1.5z"
            fill="${color}" stroke="#fff" stroke-width="2.5"/>
          <circle cx="16" cy="16" r="5.5" fill="#fff"/>
        </svg>`,
        iconSize: [32, 44],
        iconAnchor: [16, 43], // the tip of the pin
        popupAnchor: [0, -38],
      })
    );
  }
  return pinCache.get(color);
}

// The user's home on the Nearby map: a round badge with a house.
export const homeIcon = L.divIcon({
  className: 'cf-home',
  html: `<span><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg></span>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});
