import React, { useState } from 'react';
import { Camera, Wrench } from 'lucide-react';
import EvidencePhoto from './EvidencePhoto';
import PhotoEvidenceUploader from '../complaints/PhotoEvidenceUploader';
import { Section, ErrorBox, NoteBox, btnPrimary, btnSecondary, inputClass } from './ui';
import { errorText } from '../../services/apiClient';
import { formatDate } from '../../utils/formatters';

const MAX_PHOTOS = 5;

function PhotoGrid({ items, loadFile }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {items.map((ev) => (
        <figure key={ev.id} className="space-y-1">
          <EvidencePhoto
            load={() => loadFile(ev.id)}
            alt={ev.description || 'Evidence photo'}
            className="w-full aspect-square rounded-xl"
          />
          <figcaption className="text-[10.5px] text-muted leading-snug">
            {ev.description && <span className="block text-navy/80">{ev.description}</span>}
            <span className="tabular-nums">{formatDate(ev.uploaded_at)}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

// Pick a file, optionally describe it, then upload.
function UploadForm({ id, label, onUpload }) {
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = async () => {
    setBusy(true);
    setError('');
    const res = await onUpload(file, description);
    setBusy(false);
    if (res.ok) {
      setFile(null);
      setDescription('');
    } else {
      setError(errorText(res.error));
    }
  };

  if (!file) {
    return <PhotoEvidenceUploader id={id} label={label} onSelect={setFile} />;
  }

  return (
    <div className="space-y-2 p-3 rounded-2xl bg-surface-canvas border border-border">
      <p className="text-xs text-navy">
        Selected: <strong>{file.name}</strong>
      </p>
      <input
        type="text"
        maxLength={500}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Optional: what does the photo show?"
        className={inputClass}
        disabled={busy}
      />
      <ErrorBox>{error}</ErrorBox>
      <div className="flex gap-2">
        <button type="button" className={btnPrimary} onClick={handleUpload} disabled={busy}>
          {busy ? 'Uploading...' : 'Upload photo'}
        </button>
        <button type="button" className={btnSecondary} onClick={() => setFile(null)} disabled={busy}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/**
 * ReportPhotos
 * The citizen's photos of the problem and the official's after-repair photos.
 *
 * Props:
 *   evidence           items from GET /reports/{id}/evidence
 *   loadFile(id)       downloads one photo
 *   canAddReportPhoto  owner, report not locked
 *   canAddRepairPhoto  official, report in_progress
 *   onUploadReportPhoto(file, description), onUploadRepairPhoto(file, description)
 */
export default function ReportPhotos({
  evidence,
  loadFile,
  canAddReportPhoto,
  canAddRepairPhoto,
  onUploadReportPhoto,
  onUploadRepairPhoto,
  lockedReason,
}) {
  const reportPhotos = evidence.filter((e) => e.kind === 'report_photo');
  const repairPhotos = evidence.filter((e) => e.kind === 'repair_photo');

  return (
    <Section title="Photos" icon={Camera}>
      <div className="space-y-5">
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-navy">
            Photos of the problem <span className="text-muted font-medium">({reportPhotos.length}/{MAX_PHOTOS})</span>
          </h3>
          {reportPhotos.length > 0 ? (
            <PhotoGrid items={reportPhotos} loadFile={loadFile} />
          ) : (
            <p className="text-xs text-muted">No photos yet.</p>
          )}
          {canAddReportPhoto && reportPhotos.length < MAX_PHOTOS && (
            <UploadForm id="report-photo" label="Add a photo of the problem" onUpload={onUploadReportPhoto} />
          )}
          {lockedReason && <p className="text-[11px] text-muted">{lockedReason}</p>}
        </div>

        {(repairPhotos.length > 0 || canAddRepairPhoto) && (
          <div className="space-y-3 pt-4 border-t border-border">
            <h3 className="text-xs font-bold text-navy flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-primary" /> After-repair photos (from officials)
            </h3>
            <NoteBox tone="warning">
              A repair photo is the official's claim that the work is done. It is not proof: residents check it.
            </NoteBox>
            {repairPhotos.length > 0 && <PhotoGrid items={repairPhotos} loadFile={loadFile} />}
            {canAddRepairPhoto && (
              <UploadForm id="repair-photo" label="Add an after-repair photo" onUpload={onUploadRepairPhoto} />
            )}
          </div>
        )}
      </div>
    </Section>
  );
}
