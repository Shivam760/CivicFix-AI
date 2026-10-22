import React, { useEffect, useRef, useState } from 'react';
import { MapPin, MapPinned, Sparkles } from 'lucide-react';
import { btnSecondary, inputClass, labelClass } from './ui';
import MapPickerDialog from './MapPickerDialog';
import MapPreview from './MapPreview';

/**
 * LocationFields
 * Place description plus a pin on the map (latitude/longitude), all required
 * (checked by validateLocation in utils/location.js). The pin lets officials
 * find the problem and nearby residents (home within 2 km) verify a repair.
 *
 * The address found at the pin (or a chosen search result) fills the
 * description when it is empty or was filled the same way before. Text the
 * user typed is never overwritten: they get a "Use this" suggestion instead.
 *
 * Props: form { location_text, latitude, longitude }, onChange(name, value), disabled, idPrefix
 */
export default function LocationFields({ form, onChange, disabled, idPrefix = 'loc' }) {
  const autoText = useRef(''); // the last description we filled in ourselves
  const [suggestion, setSuggestion] = useState('');
  const [mapOpen, setMapOpen] = useState(false); // the map pop-up
  const hasPin = form.latitude !== '' && form.latitude != null && form.longitude !== '' && form.longitude != null;
  // The address arrives a moment after the pin moves; read the text as it is then.
  const currentText = useRef(form.location_text);
  useEffect(() => {
    currentText.current = form.location_text;
  }, [form.location_text]);

  const offerAddress = (name) => {
    const text = name.slice(0, 500);
    const current = currentText.current.trim();
    if (!current || current === autoText.current) {
      autoText.current = text;
      setSuggestion('');
      onChange('location_text', text);
    } else if (text !== current) {
      setSuggestion(text);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={`${idPrefix}-location-text`} className={labelClass}>
          Where is it? <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <MapPin className="w-4 h-4 text-emerald-600 absolute left-3 top-3 pointer-events-none" />
          <input
            id={`${idPrefix}-location-text`}
            maxLength={500}
            value={form.location_text}
            onChange={(e) => onChange('location_text', e.target.value)}
            placeholder="e.g. Near the main market, opposite the bus stop"
            className={`${inputClass} pl-9`}
            disabled={disabled}
          />
        </div>
        {suggestion && (
          <p className="mt-1.5 text-[11px] text-muted flex flex-wrap items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-primary" />
            Address at the pin: <span className="text-navy font-semibold">{suggestion}</span>
            <button
              type="button"
              className="font-bold text-primary underline cursor-pointer"
              onClick={() => {
                autoText.current = suggestion;
                onChange('location_text', suggestion);
                setSuggestion('');
              }}
            >
              Use this
            </button>
          </p>
        )}
        <p className="mt-1 text-[10.5px] text-muted">Add a landmark if it helps, e.g. "opposite the bus stop".</p>
      </div>

      <div>
        <span className={labelClass}>
          Exact spot on the map <span className="text-rose-500">*</span>
        </span>
        {hasPin ? (
          <div className="space-y-2">
            <MapPreview
              latitude={form.latitude}
              longitude={form.longitude}
              onClick={() => !disabled && setMapOpen(true)}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-muted tabular-nums">
                {Number(form.latitude).toFixed(5)}, {Number(form.longitude).toFixed(5)}
              </span>
              <button type="button" className={btnSecondary} onClick={() => setMapOpen(true)} disabled={disabled}>
                <MapPinned className="w-3.5 h-3.5" /> Change on map
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setMapOpen(true)}
            disabled={disabled}
            className="w-full flex flex-col items-center justify-center gap-1.5 h-32 rounded-2xl border-2 border-dashed border-border bg-surface-canvas hover:border-primary hover:text-primary text-muted transition-colors cursor-pointer disabled:opacity-60"
          >
            <MapPinned className="w-6 h-6" />
            <span className="text-xs font-bold">Choose on map</span>
            <span className="text-[11px]">Search an address, use your location, or click the map</span>
          </button>
        )}
      </div>

      <MapPickerDialog
        open={mapOpen}
        idPrefix={`${idPrefix}-map`}
        title="Where exactly is the problem?"
        description="Put the pin on the spot, so officials can find it and neighbours can check the repair."
        latitude={form.latitude}
        longitude={form.longitude}
        onCancel={() => setMapOpen(false)}
        onConfirm={({ latitude, longitude, address }) => {
          onChange('latitude', latitude);
          onChange('longitude', longitude);
          setMapOpen(false);
          if (address) offerAddress(address);
        }}
      />
    </div>
  );
}
