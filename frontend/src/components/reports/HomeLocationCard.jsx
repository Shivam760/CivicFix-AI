import React, { useCallback, useState } from 'react';
import { Home, MapPinned } from 'lucide-react';
import MapPickerDialog from './MapPickerDialog';
import MapPreview from './MapPreview';
import { Section, ErrorBox, btnSecondary, btnDanger } from './ui';
import { useToast } from '../../context/ToastContext';
import { errorText } from '../../services/apiClient';
import { getCurrentUser, saveHomeLocation, clearHomeLocation } from '../../services/authService';

/**
 * HomeLocationCard
 * PUT/DELETE /auth/me/home-location. The home location is private: it is only
 * used to find repairs to check and issues within 2 km. Used on the Verify
 * repairs, Nearby issues and profile pages. The map opens in a pop-up and the
 * location is saved from there.
 *
 * Props: onSaved() (optional, called after saving or removing)
 */
export default function HomeLocationCard({ onSaved }) {
  const { showToast } = useToast();
  const [user, setUser] = useState(getCurrentUser());
  const hasHome = user?.home_latitude != null && user?.home_longitude != null;
  const [mapOpen, setMapOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); // shown in the pop-up
  const [removeError, setRemoveError] = useState('');

  const done = (res, message) => {
    setUser(res.data);
    showToast({ type: 'success', title: message, message: '' });
    if (onSaved) onSaved();
  };

  const save = async ({ latitude, longitude }) => {
    setBusy(true);
    setError('');
    const res = await saveHomeLocation({ latitude: Number(latitude), longitude: Number(longitude) });
    setBusy(false);
    if (!res.ok) {
      setError(errorText(res.error));
      return;
    }
    setMapOpen(false);
    done(res, 'Home location saved');
  };

  const remove = async () => {
    setBusy(true);
    setRemoveError('');
    const res = await clearHomeLocation();
    setBusy(false);
    if (res.ok) done(res, 'Home location removed');
    else setRemoveError(errorText(res.error));
  };

  const openMap = () => {
    setError('');
    setMapOpen(true);
  };
  const closeMap = useCallback(() => setMapOpen(false), []);

  const privacyNote = 'It is private: other users never see it. It is only used to find repairs to check and issues within 2 km.';

  return (
    <Section title="Your home location" icon={Home}>
      {hasHome ? (
        <div className="space-y-3">
          <MapPreview home latitude={user.home_latitude} longitude={user.home_longitude} onClick={openMap} label="Change your home location" />
          <p className="text-xs text-muted leading-relaxed">
            Saved: <span className="tabular-nums text-navy font-semibold">{user.home_latitude}, {user.home_longitude}</span>.{' '}
            {privacyNote}
          </p>
          <ErrorBox>{removeError}</ErrorBox>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnSecondary} onClick={openMap} disabled={busy}>
              <MapPinned className="w-3.5 h-3.5" /> Change
            </button>
            <button type="button" className={btnDanger} onClick={remove} disabled={busy}>
              {busy ? 'Removing...' : 'Remove'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted leading-relaxed">Not saved yet. {privacyNote}</p>
          <button
            type="button"
            onClick={openMap}
            className="w-full flex flex-col items-center justify-center gap-1.5 h-28 rounded-2xl border-2 border-dashed border-border bg-surface-canvas hover:border-primary hover:text-primary text-muted transition-colors cursor-pointer"
          >
            <MapPinned className="w-6 h-6" />
            <span className="text-xs font-bold">Choose your home on the map</span>
          </button>
        </div>
      )}

      <MapPickerDialog
        open={mapOpen}
        idPrefix="home-map"
        title="Where is your home?"
        description={privacyNote}
        confirmLabel="Save home location"
        latitude={user?.home_latitude ?? ''}
        longitude={user?.home_longitude ?? ''}
        busy={busy}
        error={error}
        onCancel={closeMap}
        onConfirm={save}
      />
    </Section>
  );
}
