import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from 'react-leaflet';
import { LocateFixed, Search, MapPin, MousePointerClick, Loader2 } from 'lucide-react';
import { btnSecondary, inputClass, labelClass } from './ui';
import { pinIcon, DEFAULT_CENTER, useMapTiles } from './mapSetup';
import { getBrowserLocation } from '../../utils/location';
import { searchPlaces, reverseGeocode, supportsAutocomplete } from '../../services/geocodingService';

const round5 = (n) => Number(n.toFixed(5)); // 5 decimals is about 1 m

// Clicking anywhere on the map moves the pin there.
function ClickToPlace({ onPick, disabled }) {
  useMapEvents({
    click(e) {
      if (!disabled) onPick(round5(e.latlng.lat), round5(e.latlng.lng));
    },
  });
  return null;
}

// Moves the map to the pin when it is set from outside the map
// (search result, "Use my location", typed coordinates).
function FollowPin({ position }) {
  const map = useMap();
  const key = position ? position.join(',') : '';
  useEffect(() => {
    if (position) map.flyTo(position, Math.max(map.getZoom(), 16), { duration: 0.6 });
    // Only when the coordinates change, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
}

// Small round button floating on the map (above Leaflet's layers).
const mapButton =
  'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface/95 backdrop-blur border border-border shadow-md text-xs font-bold text-navy hover:text-primary hover:bg-surface transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-default';

/**
 * LocationPicker
 * Map with a pin: click the map or drag the pin, search for an address, or
 * use the device location (shown with its accuracy circle). The coordinates
 * are filled in for the user and can still be typed by hand. After the pin
 * moves, the address there is looked up. Search suggests places while typing
 * with Geoapify; with Nominatim it waits for Enter/Search (its usage rules).
 *
 * Props: latitude, longitude ('' or number/string), onChange(latitude, longitude),
 *        onPlaceFound(name) (optional: a chosen search result's name),
 *        onAddressFound(name) (optional: the address where the pin was put),
 *        disabled, idPrefix
 */
export default function LocationPicker({
  latitude,
  longitude,
  onChange,
  onPlaceFound,
  onAddressFound,
  disabled,
  idPrefix = 'map',
}) {
  const tiles = useMapTiles();
  const autocomplete = supportsAutocomplete();
  const [query, setQuery] = useState('');
  const [accuracy, setAccuracy] = useState(null); // { center, meters } after "Use my location"
  const chosenQuery = useRef(''); // the text put in the box by choosing a result
  const searchId = useRef(0); // ignores answers to older searches
  const lookupTimer = useRef(null);
  const lookupId = useRef(0);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState('');

  const hasPin = latitude !== '' && latitude != null && longitude !== '' && longitude != null
    && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));
  const position = hasPin ? [Number(latitude), Number(longitude)] : null;

  // Looks up the address at the pin. Waits a moment so quick clicks or drags
  // make one request (Nominatim allows 1 per second), and drops old answers.
  const lookUpAddress = (lat, lng) => {
    if (!onAddressFound) return;
    clearTimeout(lookupTimer.current);
    const id = ++lookupId.current;
    lookupTimer.current = setTimeout(async () => {
      const res = await reverseGeocode(lat, lng);
      if (id === lookupId.current && res.ok && res.data) onAddressFound(res.data);
    }, 800);
  };
  useEffect(() => () => clearTimeout(lookupTimer.current), []);

  // Typed coordinates: look up the address once both are valid numbers.
  const typeCoordinates = (lat, lng) => {
    setAccuracy(null);
    onChange(lat, lng);
    const a = Number(lat);
    const b = Number(lng);
    if (lat !== '' && lng !== '' && Math.abs(a) <= 90 && Math.abs(b) <= 180) lookUpAddress(a, b);
  };

  const pick = (lat, lng, { lookup = true, gpsAccuracy = null } = {}) => {
    setMessage('');
    setAccuracy(gpsAccuracy ? { center: [lat, lng], meters: gpsAccuracy } : null);
    onChange(String(lat), String(lng));
    if (lookup) lookUpAddress(lat, lng);
  };

  const runSearch = async (text) => {
    const id = ++searchId.current;
    setMessage('');
    setSearching(true);
    const res = await searchPlaces(text, { near: position || DEFAULT_CENTER });
    if (id !== searchId.current) return; // the user typed more meanwhile
    setSearching(false);
    if (!res.ok) {
      setMessage(res.message);
      setResults([]);
    } else {
      setResults(res.data);
      if (res.data.length === 0) setMessage('No place found. Try other words, or place the pin on the map.');
    }
  };

  const handleSearch = () => runSearch(query);

  // Geoapify only: suggest places while typing, 350 ms after the last key.
  useEffect(() => {
    const text = query.trim();
    if (!autocomplete || text.length < 3 || text === chosenQuery.current) return undefined;
    const timer = setTimeout(() => runSearch(text), 350);
    return () => clearTimeout(timer);
    // runSearch changes every render; the query is what matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, autocomplete]);

  const chooseResult = (place) => {
    pick(place.latitude, place.longitude, { lookup: false }); // the result already names the place
    setResults([]);
    chosenQuery.current = place.title;
    setQuery(place.title);
    if (onPlaceFound) onPlaceFound(place.name);
  };

  const useMyLocation = async () => {
    setMessage('');
    setLocating(true);
    try {
      const loc = await getBrowserLocation();
      pick(loc.latitude, loc.longitude, { gpsAccuracy: loc.accuracy });
    } catch (e) {
      setMessage(e.message);
    } finally {
      setLocating(false);
    }
  };

  return (
    <div className="space-y-2.5">
      {/* Address search. Without Geoapify it runs only on Enter or the button. */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id={`${idPrefix}-search`}
              aria-label="Search for an address or place"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearch();
                }
                if (e.key === 'Escape') setResults([]);
              }}
              placeholder={autocomplete ? 'Start typing an address or place...' : 'Search an address or place, e.g. Sector 17 Chandigarh'}
              className={`${inputClass} pl-9`}
              disabled={disabled || (searching && !autocomplete)}
              autoComplete="off"
            />
          </div>
          <button type="button" className={btnSecondary} onClick={handleSearch} disabled={disabled || searching || !query.trim()}>
            {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{searching ? 'Searching' : 'Search'}</span>
          </button>
        </div>

        {/* Results float over the map like a dropdown. */}
        {results.length > 0 && (
          <ul className="absolute left-0 right-0 top-full mt-1.5 z-[1100] rounded-xl border border-border bg-surface shadow-lg overflow-hidden divide-y divide-border">
            {results.map((place) => (
              <li key={`${place.latitude},${place.longitude},${place.name}`}>
                <button
                  type="button"
                  onClick={() => chooseResult(place)}
                  className="w-full flex items-start gap-2.5 text-left px-3 py-2.5 hover:bg-surface-canvas cursor-pointer"
                >
                  <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-xs font-bold text-navy truncate">{place.title}</span>
                    <span className="block text-[11px] text-muted truncate">{place.subtitle}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* isolate keeps Leaflet's high z-index layers below our dialogs. */}
      <div className="relative isolate h-64 sm:h-80 rounded-2xl overflow-hidden border border-border shadow-xs">
        <MapContainer
          center={position || DEFAULT_CENTER}
          zoom={position ? 16 : 12}
          className={`h-full w-full ${tiles.styled ? 'cf-styled' : ''}`}
          scrollWheelZoom
        >
          <TileLayer key={tiles.url} url={tiles.url} attribution={tiles.attribution} />
          {accuracy && (
            <Circle
              center={accuracy.center}
              radius={accuracy.meters}
              pathOptions={{ color: '#059669', weight: 1.5, fillColor: '#10b981', fillOpacity: 0.12 }}
              interactive={false}
            />
          )}
          <ClickToPlace onPick={pick} disabled={disabled} />
          <FollowPin position={position} />
          {position && (
            <Marker
              key={position.join(',')}
              position={position}
              icon={pinIcon()}
              draggable={!disabled}
              keyboard={false}
              eventHandlers={{
                dragend: (e) => {
                  const p = e.target.getLatLng();
                  pick(round5(p.lat), round5(p.lng));
                },
              }}
            />
          )}
        </MapContainer>

        {/* Controls on top of the map. */}
        <div className="absolute top-3 right-3 z-[1000]">
          <button type="button" className={mapButton} onClick={useMyLocation} disabled={disabled || locating}>
            {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5 text-primary" />}
            {locating ? 'Locating...' : 'Use my location'}
          </button>
        </div>
        <div className="absolute bottom-3 left-3 z-[1000] pointer-events-none">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface/90 backdrop-blur border border-border shadow-sm text-[11px] font-semibold text-navy">
            {position ? (
              <>
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span className="tabular-nums">{Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}</span>
                {accuracy && <span className="tabular-nums text-muted font-normal">· GPS ±{accuracy.meters} m</span>}
                <span className="text-muted font-normal hidden sm:inline">· drag the pin to adjust</span>
              </>
            ) : (
              <>
                <MousePointerClick className="w-3.5 h-3.5 text-primary" /> Click the map to place the pin
              </>
            )}
          </span>
        </div>
      </div>

      {message && <p className="text-[11px] text-rose-600">{message}</p>}

      <details className="text-xs group">
        <summary className="cursor-pointer text-muted font-semibold hover:text-navy select-none">Type coordinates instead</summary>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div>
            <label htmlFor={`${idPrefix}-lat`} className={labelClass}>Latitude</label>
            <input
              id={`${idPrefix}-lat`}
              type="number"
              step="any"
              min={-90}
              max={90}
              value={latitude ?? ''}
              onChange={(e) => typeCoordinates(e.target.value, longitude ?? '')}
              className={inputClass}
              disabled={disabled}
            />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-lng`} className={labelClass}>Longitude</label>
            <input
              id={`${idPrefix}-lng`}
              type="number"
              step="any"
              min={-180}
              max={180}
              value={longitude ?? ''}
              onChange={(e) => typeCoordinates(latitude ?? '', e.target.value)}
              className={inputClass}
              disabled={disabled}
            />
          </div>
        </div>
      </details>
    </div>
  );
}
