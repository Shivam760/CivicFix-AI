/**
 * Reads the GPS position a phone camera stored in a photo (EXIF), in the
 * browser, before upload. The backend removes this data when it saves the
 * photo, so it is only used here to compare with the report's pin.
 * Resolves to { latitude, longitude } or null (no GPS, or not readable).
 */
export async function readPhotoGps(file) {
  try {
    // Loaded only when needed, so the library is not in the main bundle.
    const { default: exifr } = await import('exifr');
    const gps = await exifr.gps(file);
    if (!gps || !Number.isFinite(gps.latitude) || !Number.isFinite(gps.longitude)) return null;
    return { latitude: Number(gps.latitude.toFixed(5)), longitude: Number(gps.longitude.toFixed(5)) };
  } catch {
    return null;
  }
}
