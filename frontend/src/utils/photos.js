// The backend accepts only these, up to 5 MB (api-contract.md section 10).
export const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_SIDE_PX = 2560; // longest side after shrinking: plenty for evidence

export function formatFileSize(bytes) {
  return bytes > 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(2)} MB` : `${Math.round(bytes / 1024)} KB`;
}

// Returns an error message, or null when the file may be uploaded.
export function checkPhoto(file) {
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) return 'Please choose a JPEG, PNG or WebP image.';
  if (file.size > MAX_PHOTO_BYTES) return `This photo is ${formatFileSize(file.size)}. The limit is 5 MB.`;
  return null;
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

/**
 * Phone cameras often produce photos over 5 MB. If the photo is too big,
 * redraw it at most 2560 px on its longest side as a JPEG, lowering the
 * quality until it fits. Smaller photos are returned unchanged.
 * (The backend still checks the real type and size, and strips metadata.)
 */
export async function shrinkPhotoIfNeeded(file) {
  if (file.size <= MAX_PHOTO_BYTES || !ALLOWED_PHOTO_TYPES.includes(file.type)) return file;

  // imageOrientation: 'from-image' keeps phone photos the right way up.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, MAX_SIDE_PX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  for (const quality of [0.85, 0.75, 0.6]) {
    const blob = await canvasToBlob(canvas, quality);
    if (blob && blob.size <= MAX_PHOTO_BYTES) {
      const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
      return new File([blob], name, { type: 'image/jpeg', lastModified: file.lastModified });
    }
  }
  return file; // still too big: checkPhoto will explain
}
