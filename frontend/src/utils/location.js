/**
 * Asks the browser for the device's position (the user must allow it).
 * Resolves to { latitude, longitude, accuracy } with coordinates rounded to
 * 5 decimals (about 1 m) and accuracy in metres,
 * or rejects with a readable message.
 */
export function getBrowserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('This browser cannot share its location. Place the pin on the map instead.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: Number(pos.coords.latitude.toFixed(5)),
          longitude: Number(pos.coords.longitude.toFixed(5)),
          accuracy: Math.round(pos.coords.accuracy), // metres, as the device estimates it
        }),
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? 'Location permission was denied. Place the pin on the map instead.'
              : 'Could not get your location. Place the pin on the map instead.'
          )
        ),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

/**
 * Checks a report's location: a place description and both coordinates are
 * required (coordinates let nearby residents verify a repair later).
 * Returns an error message, or '' when the location is fine.
 */
export function validateLocation({ location_text, latitude, longitude }) {
  if (!String(location_text ?? '').trim()) return 'Describe where the problem is.';
  if (latitude === '' || latitude == null || longitude === '' || longitude == null) {
    return 'Place the pin on the map at the exact spot.';
  }
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return 'Latitude must be between -90 and 90, longitude between -180 and 180.';
  }
  return '';
}

/**
 * Great-circle distance in km between two points (the haversine formula, the
 * same as the backend's distance_km).
 */
export function distanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

// 0.042 km -> "40 m", 1.26 km -> "1.3 km"
export function formatDistance(km) {
  return km < 1 ? `${Math.round((km * 1000) / 10) * 10} m` : `${km.toFixed(1)} km`;
}
