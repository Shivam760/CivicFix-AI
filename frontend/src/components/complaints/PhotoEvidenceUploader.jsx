import React, { useState, useRef } from 'react';
import { AlertCircle, Camera, ImagePlus, Loader2 } from 'lucide-react';
import { checkPhoto, shrinkPhotoIfNeeded } from '../../utils/photos';

// Phones and tablets: a coarse (finger) pointer.
const isTouchDevice = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

/**
 * PhotoEvidenceUploader
 * Pick a photo by drag-and-drop or the file chooser, or (on phones) take one
 * with the camera. It only prepares and checks the file; the parent decides
 * when to upload it. The backend checks the real image type and size again.
 *
 * "Take photo" uses <input capture="environment">, which opens the back
 * camera on phones. Desktop browsers ignore `capture`, so the button is
 * shown only on touch devices.
 *
 * Props:
 *   onSelect(file)  called with a File that passed the checks
 *   disabled, label, helperText, id
 */
export default function PhotoEvidenceUploader({
  onSelect,
  disabled = false,
  id = 'photo-evidence-uploader',
  label = 'Add a photo',
  helperText = 'JPEG, PNG or WebP. Large photos are shrunk to fit the 5 MB limit. Location data (GPS) is removed when the photo is saved.',
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [showCamera] = useState(isTouchDevice);
  const busy = disabled || preparing;

  const processFile = async (file) => {
    setError(null);
    setPreparing(true);
    let prepared = file;
    try {
      prepared = await shrinkPhotoIfNeeded(file);
    } catch {
      // Could not redraw it (unusual format): check the original as it is.
    }
    setPreparing(false);
    const problem = checkPhoto(prepared);
    setError(problem);
    // The original goes along too: shrinking drops its metadata (e.g. GPS).
    if (!problem) onSelect(prepared, file);
  };

  const stop = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    stop(e);
    setIsDragging(false);
    if (busy) return;
    const file = e.dataTransfer?.files?.[0];
    if (file) processFile(file);
  };

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset so choosing the same file again still fires onChange.
    e.target.value = '';
  };

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-xs font-bold text-navy">
        {label}
      </label>

      {/* Hidden inputs: one opens the file chooser, the other the camera. */}
      <input
        ref={fileInputRef}
        id={id}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        onChange={handleInputChange}
        className="sr-only"
        tabIndex={-1}
        disabled={busy}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleInputChange}
        className="sr-only"
        tabIndex={-1}
        disabled={busy}
        aria-hidden="true"
      />

      {showCamera && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 px-3 py-3 rounded-2xl bg-primary hover:bg-emerald-600 text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Camera className="w-4 h-4" /> Take photo
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 px-3 py-3 rounded-2xl border border-border bg-surface hover:bg-surface-canvas text-navy text-xs font-bold disabled:opacity-50 cursor-pointer"
          >
            <ImagePlus className="w-4 h-4" /> From gallery
          </button>
        </div>
      )}

      {!showCamera && (
        <div
          role="button"
          tabIndex={busy ? -1 : 0}
          aria-disabled={busy}
          onDragOver={(e) => {
            stop(e);
            if (!busy) setIsDragging(true);
          }}
          onDragLeave={(e) => {
            stop(e);
            setIsDragging(false);
          }}
          onDrop={handleDrop}
          onClick={() => !busy && fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (!busy && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`relative p-5 sm:p-6 rounded-2xl border-2 border-dashed transition-all text-center group ${
            busy
              ? 'opacity-50 cursor-not-allowed border-border bg-surface-canvas'
              : isDragging
              ? 'cursor-pointer border-emerald-500 bg-emerald-50/80 ring-4 ring-emerald-500/10'
              : 'cursor-pointer border-border hover:border-emerald-400 bg-surface-canvas hover:bg-surface'
          }`}
        >
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="w-11 h-11 rounded-2xl bg-surface border border-border flex items-center justify-center text-muted group-hover:text-emerald-700 group-hover:border-emerald-300 transition-all shadow-2xs">
              <ImagePlus className="w-5 h-5" />
            </div>
            <p className="text-xs sm:text-sm font-bold text-navy">
              <span className="text-emerald-700 underline underline-offset-2">Click to choose</span>
              <span> or drag &amp; drop a photo</span>
            </p>
          </div>
        </div>
      )}

      {preparing && (
        <p className="text-[11px] text-primary font-semibold flex items-center gap-1.5" role="status">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Preparing photo...
        </p>
      )}
      {error ? (
        <div role="alert" className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <p className="text-[10.5px] text-muted">{helperText}</p>
      )}
    </div>
  );
}
