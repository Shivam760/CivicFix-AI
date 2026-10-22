import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { MapPin, X } from 'lucide-react';
import LocationPicker from './LocationPicker';
import { ErrorBox, btnPrimary, btnSecondary } from './ui';

/**
 * MapPickerDialog
 * The map picker in a pop-up window (full screen on phones). It works on a
 * draft pin: Cancel (or Esc) keeps the old location, "Use this location"
 * hands the new one to onConfirm.
 *
 * Props: open, title, description, confirmLabel,
 *        latitude, longitude (the current location, '' if none),
 *        onConfirm({ latitude, longitude, address }) (address: the place found
 *          at the pin or chosen in search, or '' if none),
 *        onCancel(), busy, error (optional, e.g. while saving a home location),
 *        idPrefix
 */
export default function MapPickerDialog({ open, ...props }) {
  // A portal puts the pop-up at the end of <body>, above every page layout.
  return createPortal(
    <AnimatePresence>{open && <Panel key="map-dialog" {...props} />}</AnimatePresence>,
    document.body
  );
}

function Panel({
  title = 'Choose the spot on the map',
  description,
  confirmLabel = 'Use this location',
  latitude,
  longitude,
  onConfirm,
  onCancel,
  busy = false,
  error = '',
  idPrefix = 'dialog-map',
}) {
  const reduce = useReducedMotion();
  // The draft starts at the current location; nothing changes until confirmed.
  const [draft, setDraft] = useState({ latitude: latitude ?? '', longitude: longitude ?? '' });
  const address = useRef('');
  const hasPin = draft.latitude !== '' && draft.longitude !== '';

  // Esc closes; the page behind does not scroll while the pop-up is open.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [busy, onCancel]);

  const confirm = () => {
    if (hasPin && !busy) onConfirm({ ...draft, address: address.current });
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${idPrefix}-title`}
      className="fixed inset-0 z-[1200] flex items-stretch sm:items-center justify-center sm:p-6 bg-stone-900/60 backdrop-blur-xs"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0 : 0.15 }}
      onMouseDown={(e) => {
        // A click on the dark backdrop (not the window) cancels.
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <motion.div
        className="bg-surface w-full sm:max-w-3xl h-full sm:h-auto sm:max-h-[92vh] sm:rounded-3xl border-border sm:border shadow-xl flex flex-col"
        initial={reduce ? false : { y: 24, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        exit={reduce ? undefined : { y: 24, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
      >
        <header className="flex items-start justify-between gap-3 px-4 sm:px-6 pt-4 sm:pt-5 pb-3 border-b border-border">
          <div className="min-w-0">
            <h2 id={`${idPrefix}-title`} className="text-base sm:text-lg font-bold text-navy flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
              {title}
            </h2>
            {description && <p className="text-xs text-muted mt-1 leading-relaxed">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="text-stone-400 hover:text-stone-600 rounded-lg p-1.5 transition-colors"
            aria-label="Close map"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          <LocationPicker
            idPrefix={idPrefix}
            latitude={draft.latitude}
            longitude={draft.longitude}
            disabled={busy}
            mapHeight="h-[52vh] sm:h-[56vh]"
            onChange={(lat, lng) => setDraft({ latitude: lat, longitude: lng })}
            onPlaceFound={(name) => {
              address.current = name;
            }}
            onAddressFound={(name) => {
              address.current = name;
            }}
          />
        </div>

        <footer className="px-4 sm:px-6 py-3 border-t border-border space-y-2">
          <ErrorBox>{error}</ErrorBox>
          <div className="flex items-center justify-end gap-2">
            <button type="button" className={btnSecondary} onClick={onCancel} disabled={busy}>
              Cancel
            </button>
            <button type="button" className={btnPrimary} onClick={confirm} disabled={!hasPin || busy}>
              {busy ? 'Saving...' : confirmLabel}
            </button>
          </div>
        </footer>
      </motion.div>
    </motion.div>
  );
}
