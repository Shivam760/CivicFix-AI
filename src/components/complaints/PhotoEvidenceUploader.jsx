import React, { useState, useRef } from 'react';
import { Trash2, CheckCircle2, AlertCircle, Link as LinkIcon, Camera, RefreshCw } from 'lucide-react';

/**
 * PhotoEvidenceUploader
 * 
 * Interactive photographic evidence uploader supporting:
 * - Drag-and-drop file ingestion
 * - Local file browser dialog (JPG, PNG, WEBP, GIF, HEIC)
 * - Immediate live client-side image preview via FileReader (base64 Data URL)
 * - File metadata inspection (filename, file size in KB/MB)
 * - File removal and replacement
 * - Secondary URL input toggle for external evidence links
 * 
 * BACKEND INTEGRATION SPECIFICATION FOR FASTAPI:
 * ============================================================================
 * When FastAPI is implemented, this component provides two integration paths:
 * 1. Standard Multipart Form (Recommended):
 *    Use the raw `file` object passed in `onChange(dataUrl, fileObject)`:
 *    const formData = new FormData();
 *    formData.append('evidence_photo', fileObject);
 *    FastAPI: `async def create_complaint(evidence_photo: UploadFile = File(None), ...)`
 * 2. Pre-signed Object Storage (AWS S3 / Cloudflare R2 / MinIO):
 *    Request pre-signed PUT URL from FastAPI -> Upload file directly -> Send returned key.
 * 3. Base64 Data URL (Current local offline demo):
 *    Transmits the base64 string directly in `attachmentUrl` for instant zero-dependency preview.
 * ============================================================================
 */
export default function PhotoEvidenceUploader({
  value = '',
  onChange,
  id = 'photo-evidence-uploader',
  label = 'Upload Photo Evidence',
  helperText = 'Clear photos of potholes, faulty wiring, or water leaks expedite municipal crew verification.',
  maxSizeMB = 10,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileMeta, setFileMeta] = useState(null);
  const [error, setError] = useState(null);
  const [showUrlFallback, setShowUrlFallback] = useState(false);
  const [urlInput, setUrlInput] = useState(value && !value.startsWith('data:') ? value : '');
  const fileInputRef = useRef(null);

  const processFile = (file) => {
    setError(null);

    // Validate mime type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, WEBP, GIF, etc.)');
      return;
    }

    // Validate size limit (maxSizeMB)
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`File size exceeds ${maxSizeMB}MB limit. Please upload a smaller photo.`);
      return;
    }

    // Format human-readable size
    const sizeStr = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
      : `${Math.round(file.size / 1024)} KB`;

    setFileMeta({
      name: file.name,
      size: sizeStr,
      type: file.type,
    });

    // Read as Data URL for immediate local preview and offline storage
    const reader = new FileReader();
    reader.onload = (e) => {
      const resultDataUrl = e.target.result;
      if (onChange) {
        onChange(resultDataUrl, file);
      }
    };
    reader.onerror = () => {
      setError('Failed to read image file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      processFile(droppedFile);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target?.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      processFile(selectedFile);
    }
  };

  const handleRemove = () => {
    setFileMeta(null);
    setError(null);
    setUrlInput('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onChange) {
      onChange('', null);
    }
  };

  const handleUrlApply = () => {
    if (!urlInput.trim()) {
      handleRemove();
      return;
    }
    setError(null);
    setFileMeta({
      name: 'Linked Remote Image',
      size: 'Remote URL',
      type: 'image/remote',
    });
    if (onChange) {
      onChange(urlInput.trim(), null);
    }
  };

  const hasPhoto = Boolean(value);

  return (
    <div className="space-y-2">
      {/* Label and Mode Switcher */}
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="block text-xs font-bold text-navy">
          {label}
        </label>
        <button
          type="button"
          onClick={() => setShowUrlFallback((prev) => !prev)}
          className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
        >
          <LinkIcon className="w-3 h-3" />
          <span>{showUrlFallback ? 'Switch to file upload' : 'Or paste image URL'}</span>
        </button>
      </div>

      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        id={id}
        type="file"
        accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.heic"
        onChange={handleFileInputChange}
        className="sr-only"
        tabIndex={-1}
      />

      {/* Mode A: URL Fallback Mode */}
      {showUrlFallback ? (
        <div className="space-y-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
              <LinkIcon className="w-4 h-4" />
            </div>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onBlur={handleUrlApply}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleUrlApply())}
              placeholder="https://images.unsplash.com/... (Photo evidence URL)"
              className="w-full pl-9 pr-20 py-2.5 rounded-xl bg-surface-canvas border border-border text-xs text-navy focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus-visible:ring-2 focus-visible:ring-primary"
            />
            <button
              type="button"
              onClick={handleUrlApply}
              className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg bg-primary hover:bg-emerald-600 text-white text-[11px] font-bold transition-colors cursor-pointer"
            >
              Apply
            </button>
          </div>
          <span className="text-[10.5px] text-muted block font-sans">
            Paste a publicly accessible photo link or switch back to upload directly from your device.
          </span>
        </div>
      ) : hasPhoto ? (
        /* State 1: Active Photo Preview Card */
        <div className="p-3.5 rounded-2xl bg-surface-canvas border border-emerald-300 shadow-2xs space-y-3">
          <div className="flex items-center gap-3.5">
            {/* Thumbnail */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-surface border border-border shrink-0 shadow-2xs">
              <img
                src={value}
                alt="Uploaded evidence preview"
                className="w-full h-full object-cover"
                onError={() => setError('Could not load image preview. Please verify file format.')}
              />
            </div>

            {/* Metadata and Status */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Photo Evidence Attached</span>
              </div>
              <p className="text-xs font-semibold text-navy truncate" title={fileMeta?.name || 'Evidence photo'}>
                {fileMeta?.name || 'Grievance photograph'}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-muted mt-0.5">
                {fileMeta?.size && <span>{fileMeta.size}</span>}
                <span>•</span>
                <span className="text-emerald-700 font-medium font-mono text-[10px] uppercase">
                  Ready for AI triage
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-surface hover:bg-white text-navy text-xs font-semibold shadow-2xs hover:border-emerald-300 transition-colors cursor-pointer"
                title="Replace with another photo"
              >
                <RefreshCw className="w-3.5 h-3.5 text-muted" />
                <span className="hidden sm:inline">Replace</span>
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50/80 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors cursor-pointer"
                title="Remove photo"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Remove</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* State 2: Drag & Drop Ingestion Zone */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative p-5 sm:p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center group ${
            isDragging
              ? 'border-emerald-500 bg-emerald-50/80 ring-4 ring-emerald-500/10'
              : 'border-border hover:border-emerald-400 bg-surface-canvas hover:bg-surface'
          }`}
        >
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="w-11 h-11 rounded-2xl bg-surface border border-border flex items-center justify-center text-muted group-hover:text-emerald-700 group-hover:border-emerald-300 group-hover:scale-105 transition-all shadow-2xs">
              <Camera className="w-5 h-5" />
            </div>

            <div className="space-y-0.5">
              <p className="text-xs sm:text-sm font-bold text-navy">
                <span className="text-emerald-700 underline underline-offset-2">Click to upload</span>
                <span> or drag &amp; drop photo</span>
              </p>
              <p className="text-[11px] text-muted">
                JPG, PNG, WEBP, HEIC up to {maxSizeMB}MB
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Helper text */}
      {!error && (
        <p className="text-[10.5px] text-muted block font-sans">
          {helperText}
        </p>
      )}
    </div>
  );
}
