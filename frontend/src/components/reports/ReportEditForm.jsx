import React, { useState } from 'react';
import { ErrorBox, NoteBox, btnPrimary, btnSecondary, inputClass, labelClass } from './ui';
import LocationFields from './LocationFields';
import { CIVIC_CATEGORIES } from '../../constants/civicCategories';
import { validateLocation } from '../../utils/location';

// Only send the fields that changed, so we don't clear an approval needlessly.
function changedFields(report, form) {
  const next = {
    title: form.title.trim(),
    description: form.description.trim(),
    category: form.category || null,
    location_text: form.location_text.trim() || null,
    latitude: form.latitude === '' ? null : Number(form.latitude),
    longitude: form.longitude === '' ? null : Number(form.longitude),
  };
  const changes = {};
  for (const [key, value] of Object.entries(next)) {
    if (value !== (report[key] ?? null)) changes[key] = value;
  }
  return changes;
}

/**
 * ReportEditForm (owner)
 * PATCH /reports/{id}. Changing anything except the category clears an
 * existing approval (api-contract.md section 4).
 *
 * Props: report, busy, error, onSave(changes) -> Promise<boolean>, onCancel()
 */
export default function ReportEditForm({ report, busy, error, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: report.title,
    description: report.description,
    category: report.category || '',
    location_text: report.location_text || '',
    latitude: report.latitude ?? '',
    longitude: report.longitude ?? '',
  });
  const [localError, setLocalError] = useState('');

  const set = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!form.title.trim() || !form.description.trim()) {
      setLocalError('Title and description are required.');
      return;
    }
    const locationError = validateLocation(form);
    if (locationError) {
      setLocalError(locationError);
      return;
    }
    const changes = changedFields(report, form);
    if (Object.keys(changes).length === 0) {
      onCancel();
      return;
    }
    await onSave(changes);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {report.approved_draft_id && (
        <NoteBox tone="warning">
          Changing the title, description or location clears your approval of the complaint draft.
        </NoteBox>
      )}
      <div>
        <label htmlFor="edit-title" className={labelClass}>Title</label>
        <input id="edit-title" maxLength={200} value={form.title} onChange={(e) => set('title', e.target.value)} className={inputClass} disabled={busy} />
      </div>
      <div>
        <label htmlFor="edit-description" className={labelClass}>Description</label>
        <textarea id="edit-description" rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} className={`${inputClass} resize-y`} disabled={busy} />
      </div>
      <div>
        <label htmlFor="edit-category" className={labelClass}>Category</label>
        <select id="edit-category" value={form.category} onChange={(e) => set('category', e.target.value)} className={inputClass} disabled={busy}>
          <option value="">Not set</option>
          {CIVIC_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>
      <LocationFields form={form} onChange={set} disabled={busy} idPrefix="edit" />
      <ErrorBox>{localError || error}</ErrorBox>
      <div className="flex gap-2">
        <button type="submit" className={btnPrimary} disabled={busy}>
          {busy ? 'Saving...' : 'Save changes'}
        </button>
        <button type="button" className={btnSecondary} onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}
