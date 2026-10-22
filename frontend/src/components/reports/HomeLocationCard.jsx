import React, { useState } from 'react';
import { Home } from 'lucide-react';
import LocationPicker from './LocationPicker';
import { Section, ErrorBox, btnPrimary, btnSecondary, btnDanger } from './ui';
import { useToast } from '../../context/ToastContext';
import { errorText } from '../../services/apiClient';
import { getCurrentUser, saveHomeLocation, clearHomeLocation } from '../../services/authService';

/**
 * HomeLocationCard
 * PUT/DELETE /auth/me/home-location. The home location is private: it is only
 * used to find repairs to check and issues within 2 km. Used on the Verify
 * repairs and Nearby issues pages. Once saved, the map is folded away until
 * the user clicks "Change".
 *
 * Props: onSaved() (called after saving or removing)
 */
export default function HomeLocationCard({ onSaved }) {
  const { showToast } = useToast();
  const [user, setUser] = useState(getCurrentUser());
  const hasHome = user?.home_latitude != null && user?.home_longitude != null;
  const [editing, setEditing] = useState(!hasHome);
  const [form, setForm] = useState({
    latitude: user?.home_latitude ?? '',
    longitude: user?.home_longitude ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const finish = (res, message) => {
    setBusy(false);
    if (res.ok) {
      setUser(res.data);
      showToast({ type: 'success', title: message, message: '' });
      onSaved();
    } else {
      setError(errorText(res.error));
    }
    return res.ok;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    if (form.latitude === '' || form.longitude === '') {
      setError('Place the pin on your home on the map, or use your location.');
      return;
    }
    setBusy(true);
    const res = await saveHomeLocation({ latitude: Number(form.latitude), longitude: Number(form.longitude) });
    if (finish(res, 'Home location saved')) setEditing(false);
  };

  const handleRemove = async () => {
    setBusy(true);
    setError('');
    const res = await clearHomeLocation();
    if (res.ok) setForm({ latitude: '', longitude: '' });
    if (finish(res, 'Home location removed')) setEditing(true);
  };

  const privacyNote = 'It is private: other users never see it. It is only used to find repairs to check and issues within 2 km.';

  if (!editing) {
    return (
      <Section title="Your home location" icon={Home}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted leading-relaxed">
            Saved: <span className="tabular-nums text-navy font-semibold">{user.home_latitude}, {user.home_longitude}</span>.{' '}
            {privacyNote}
          </p>
          <button type="button" className={btnSecondary} onClick={() => setEditing(true)}>
            Change
          </button>
        </div>
      </Section>
    );
  }

  return (
    <Section title="Your home location" icon={Home}>
      <form onSubmit={handleSave} className="space-y-3">
        <p className="text-xs text-muted leading-relaxed">
          {hasHome ? 'Move the pin to change it. ' : 'Not saved yet. Place the pin on your home. '}
          {privacyNote}
        </p>
        <LocationPicker
          idPrefix="home"
          latitude={form.latitude}
          longitude={form.longitude}
          disabled={busy}
          onChange={(latitude, longitude) => setForm({ latitude, longitude })}
        />
        <ErrorBox>{error}</ErrorBox>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className={btnPrimary} disabled={busy}>
            {busy ? 'Saving...' : 'Save home location'}
          </button>
          {hasHome && (
            <>
              <button type="button" className={btnSecondary} onClick={() => setEditing(false)} disabled={busy}>
                Cancel
              </button>
              <button type="button" className={btnDanger} onClick={handleRemove} disabled={busy}>
                Remove
              </button>
            </>
          )}
        </div>
      </form>
    </Section>
  );
}
