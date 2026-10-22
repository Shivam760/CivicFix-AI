import { describe, it, expect, vi, afterEach } from 'vitest';
import { searchPlaces, reverseGeocode, supportsAutocomplete } from './geocodingService';
import { mapConfig } from './mapConfig';

// Address search and reverse geocoding turn each provider's answer into the
// same shape, and never throw: failures become a readable message.

const okJson = (body) => vi.fn().mockResolvedValue({ ok: true, json: async () => body });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('mapConfig', () => {
  it('uses OpenStreetMap without a key', () => {
    vi.stubEnv('VITE_GEOAPIFY_API_KEY', '');
    expect(mapConfig()).toEqual({ provider: 'osm', geoapifyKey: '' });
    expect(supportsAutocomplete()).toBe(false);
  });

  it('uses Geoapify when a key is set', () => {
    vi.stubEnv('VITE_GEOAPIFY_API_KEY', 'k123');
    expect(mapConfig()).toEqual({ provider: 'geoapify', geoapifyKey: 'k123' });
    expect(supportsAutocomplete()).toBe(true);
  });

  it('can be forced back to OpenStreetMap while a key is set', () => {
    vi.stubEnv('VITE_GEOAPIFY_API_KEY', 'k123');
    vi.stubEnv('VITE_MAP_PROVIDER', 'osm');
    expect(mapConfig().provider).toBe('osm');
  });
});

describe('searchPlaces with Nominatim (no key)', () => {
  it('does not call the service for an empty query', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await searchPlaces('   ')).toEqual({ ok: true, data: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns names split into title/subtitle and rounded coordinates', async () => {
    vi.stubEnv('VITE_GEOAPIFY_API_KEY', '');
    const fetchMock = okJson([{ display_name: 'Sector 17, Ward 3, Chandigarh', lat: '30.7410123456', lon: '76.7820987654' }]);
    vi.stubGlobal('fetch', fetchMock);

    const res = await searchPlaces('sector 17');

    expect(res.data).toEqual([
      { name: 'Sector 17, Ward 3, Chandigarh', title: 'Sector 17', subtitle: 'Ward 3, Chandigarh', latitude: 30.74101, longitude: 76.7821 },
    ]);
    expect(fetchMock.mock.calls[0][0]).toContain('nominatim.openstreetmap.org/search');
    expect(fetchMock.mock.calls[0][0]).toContain('q=sector%2017');
  });

  it('reports an error status and a network failure as messages', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) }));
    expect((await searchPlaces('x')).message).toMatch(/not available/);

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    expect((await searchPlaces('x')).message).toMatch(/failed/);
  });
});

describe('searchPlaces with Geoapify', () => {
  it('asks for Indian places near the given point and maps the result', async () => {
    vi.stubEnv('VITE_GEOAPIFY_API_KEY', 'k123');
    const fetchMock = okJson({
      results: [{ formatted: 'Sector 17, Chandigarh, India', address_line1: 'Sector 17', address_line2: 'Chandigarh, India', lat: 30.74, lon: 76.78 }],
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await searchPlaces('sector 17', { near: [30.7, 76.8] });

    expect(res.data).toEqual([
      { name: 'Sector 17, Chandigarh, India', title: 'Sector 17', subtitle: 'Chandigarh, India', latitude: 30.74, longitude: 76.78 },
    ]);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe('/v1/geocode/autocomplete');
    expect(url.searchParams.get('apiKey')).toBe('k123');
    expect(url.searchParams.get('filter')).toBe('countrycode:in');
    expect(url.searchParams.get('bias')).toBe('proximity:76.8,30.7'); // Geoapify wants lon,lat
  });
});

describe('reverseGeocode', () => {
  it('returns the Nominatim address', async () => {
    vi.stubEnv('VITE_GEOAPIFY_API_KEY', '');
    vi.stubGlobal('fetch', okJson({ display_name: 'Shop 4, Sector 17, Chandigarh' }));
    expect(await reverseGeocode(30.74, 76.78)).toEqual({ ok: true, data: 'Shop 4, Sector 17, Chandigarh' });
  });

  it('returns the Geoapify address, or null when there is none', async () => {
    vi.stubEnv('VITE_GEOAPIFY_API_KEY', 'k123');
    vi.stubGlobal('fetch', okJson({ results: [{ formatted: 'Sector 17, Chandigarh' }] }));
    expect(await reverseGeocode(30.74, 76.78)).toEqual({ ok: true, data: 'Sector 17, Chandigarh' });

    vi.stubGlobal('fetch', okJson({ results: [] }));
    expect(await reverseGeocode(0, 0)).toEqual({ ok: true, data: null });
  });

  it('turns a failure into a message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    expect((await reverseGeocode(1, 2)).ok).toBe(false);
  });
});
