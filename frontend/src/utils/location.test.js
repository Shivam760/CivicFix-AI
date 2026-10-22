import { describe, it, expect } from 'vitest';
import { validateLocation, distanceKm, formatDistance } from './location';

// A report must say where the problem is, in words and as coordinates.
describe('validateLocation', () => {
  const ok = { location_text: 'Opposite the bus stop', latitude: '30.741', longitude: '76.782' };

  it('accepts a description plus both coordinates', () => {
    expect(validateLocation(ok)).toBe('');
  });

  it('requires a place description', () => {
    expect(validateLocation({ ...ok, location_text: '   ' })).not.toBe('');
  });

  it('requires both coordinates', () => {
    expect(validateLocation({ ...ok, latitude: '' })).not.toBe('');
    expect(validateLocation({ ...ok, longitude: '' })).not.toBe('');
    expect(validateLocation({ ...ok, latitude: null, longitude: null })).not.toBe('');
  });

  it('rejects coordinates outside the valid range', () => {
    expect(validateLocation({ ...ok, latitude: '91' })).not.toBe('');
    expect(validateLocation({ ...ok, longitude: '-181' })).not.toBe('');
  });

  it('accepts numbers as well as strings (the edit form starts from the saved report)', () => {
    expect(validateLocation({ ...ok, latitude: 30.741, longitude: 76.782 })).toBe('');
  });
});

describe('distanceKm', () => {
  it('matches the backend: 0.009 degrees of latitude is about 1 km', () => {
    expect(distanceKm(30.7, 76.8, 30.709, 76.8)).toBeCloseTo(1.0, 1);
    expect(distanceKm(30.7, 76.8, 30.7, 76.8)).toBe(0);
  });

  it('formats short distances in metres and long ones in km', () => {
    expect(formatDistance(0.042)).toBe('40 m');
    expect(formatDistance(1.26)).toBe('1.3 km');
  });
});
