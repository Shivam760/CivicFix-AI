import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Save,
  FileText,
  Camera,
  Check,
  Trash2,
  Sparkles,
  LocateFixed,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import CategoryIcon from '../../components/icons3d/CategoryIcon';
import PhotoEvidenceUploader from '../../components/complaints/PhotoEvidenceUploader';
import { formatFileSize } from '../../utils/photos';
import { validateLocation, distanceKm, formatDistance } from '../../utils/location';
import { readPhotoGps } from '../../utils/photoLocation';
import LocationFields from '../../components/reports/LocationFields';
import ShareChoice from '../../components/reports/ShareChoice';
import AlreadyReportedPanel from '../../components/reports/AlreadyReportedPanel';
import { NoteBox } from '../../components/reports/ui';
import { CIVIC_CATEGORIES, categoryLabel } from '../../constants/civicCategories';
import { ROLES } from '../../constants/roles';
import { createReport, uploadReportPhoto, setSharing, listAllReports } from '../../services/reportService';
import { errorText } from '../../services/apiClient';
import { useToast } from '../../context/ToastContext';

const STEPS = [
  { id: 1, label: 'Describe', icon: FileText },
  { id: 2, label: 'Location', icon: MapPin },
  { id: 3, label: 'Photos', icon: Camera },
  { id: 4, label: 'Review', icon: CheckCircle2 },
];
const MAX_PHOTOS = 5;
// A photo's GPS within this distance of the pin counts as "taken here".
const PHOTO_MATCH_KM = 0.05;

// Shows a picked photo before it is uploaded.
function LocalPreview({ file }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  // Free the preview when the photo is removed or the page closes.
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return <img src={url} alt={file.name} className="w-full h-full object-cover" />;
}

/**
 * PhotoLocationHint
 * Compares where the photo was taken (its GPS, if any) with the report's pin.
 * Shows nothing when the photo has no GPS (common for shared or edited photos).
 */
function PhotoLocationHint({ distance, onUse }) {
  if (distance == null) return null;
  if (distance <= PHOTO_MATCH_KM) {
    return (
      <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
        <Check className="w-3 h-3" /> Taken at your pin's location
      </p>
    );
  }
  return (
    <p className="text-[11px] text-amber-700 flex flex-wrap items-center gap-1.5">
      <LocateFixed className="w-3 h-3" />
      Taken about {formatDistance(distance)} from your pin.
      <button type="button" onClick={onUse} className="font-bold underline cursor-pointer">
        Move the pin here
      </button>
    </p>
  );
}

/**
 * CitizenReportPage
 * 4-step wizard: describe, location, photos, review.
 * "Save report" calls POST /reports, then uploads each photo with
 * POST /reports/{id}/evidence. Saving does NOT send anything to an authority:
 * on the report page the citizen can ask for an AI suggestion, approve a
 * complaint draft, and only then try to send it.
 */
export default function CitizenReportPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    location_text: '',
    latitude: '',
    longitude: '',
  });
  const [photos, setPhotos] = useState([]); // [{ key, file, description, gps }]
  const photoKey = useRef(0);
  const [ownReports, setOwnReports] = useState([]); // for the "already reported?" check

  useEffect(() => {
    listAllReports().then((res) => {
      if (res.ok) setOwnReports(res.data);
    });
  }, []);

  // A new photo; its GPS (if the camera saved one) is read from the original
  // file, because shrinking a large photo drops that data.
  const addPhoto = (file, original) => {
    const key = ++photoKey.current;
    setPhotos((prev) => [...prev, { key, file, description: '', gps: undefined }]);
    setStepErrors({});
    readPhotoGps(original || file).then((gps) =>
      setPhotos((prev) => prev.map((p) => (p.key === key ? { ...p, gps } : p)))
    );
  };

  const pinSet = formData.latitude !== '' && formData.longitude !== '';
  const photoDistance = (gps) =>
    gps && pinSet ? distanceKm(gps.latitude, gps.longitude, Number(formData.latitude), Number(formData.longitude)) : null;
  // Shared with nearby residents by default, anonymously; the citizen can change both.
  const [sharing, setSharingChoice] = useState({ shared: true, showName: false });
  const [stepErrors, setStepErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState(null);

  const setField = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setStepErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };
  const handleChange = (e) => setField(e.target.name, e.target.value);

  const validateStep1 = () => {
    const errors = {};
    if (!formData.title.trim()) errors.title = 'Please enter a title.';
    else if (formData.title.trim().length > 200) errors.title = 'The title can be at most 200 characters.';
    if (!formData.description.trim()) errors.description = 'Please describe the problem.';
    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Location and at least one photo are required: officials need to find the
  // problem, and neighbours need coordinates and a photo to check a repair.
  const validateStep2 = () => {
    const message = validateLocation(formData);
    setStepErrors(message ? { latitude: message } : {});
    return !message;
  };

  const validateStep3 = () => {
    const message = photos.length === 0 ? 'Add at least one photo of the problem.' : '';
    setStepErrors(message ? { photos: message } : {});
    return !message;
  };

  const handleNext = () => {
    setError(null);
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    if (currentStep === 3 && !validateStep3()) return;
    setCurrentStep((s) => Math.min(s + 1, 4));
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = async () => {
    if (loading) return;
    if (!validateStep1()) {
      setCurrentStep(1);
      return;
    }
    if (!validateStep2()) {
      setCurrentStep(2);
      return;
    }
    if (!validateStep3()) {
      setCurrentStep(3);
      return;
    }
    setLoading(true);
    setError(null);
    setProgress('Saving report...');

    const fields = {
      title: formData.title.trim(),
      description: formData.description.trim(),
    };
    if (formData.category) fields.category = formData.category;
    fields.location_text = formData.location_text.trim();
    fields.latitude = Number(formData.latitude);
    fields.longitude = Number(formData.longitude);

    const res = await createReport(fields);
    if (!res.ok) {
      setLoading(false);
      setProgress('');
      setError(errorText(res.error));
      return;
    }
    const report = res.data;

    // Upload photos one by one. The report already exists, so a failed photo
    // can be added again later from the report page.
    const failed = [];
    for (let i = 0; i < photos.length; i += 1) {
      setProgress(`Uploading photo ${i + 1} of ${photos.length}...`);
      const up = await uploadReportPhoto(report.id, photos[i].file, photos[i].description);
      if (!up.ok) failed.push(`${photos[i].file.name}: ${errorText(up.error)}`);
    }

    // Sharing (and the name choice) is a separate request after saving.
    if (sharing.shared || sharing.showName) {
      setProgress('Saving your sharing choice...');
      const sh = await setSharing(report.id, sharing.shared, sharing.showName);
      if (!sh.ok) failed.push(`Sharing: ${errorText(sh.error)}`);
    }

    setLoading(false);
    setProgress('');
    if (failed.length > 0) {
      showToast({
        type: 'error',
        title: 'Report saved, but something failed',
        message: `${failed.join(' | ')} You can fix it on the report page.`,
      });
    } else {
      showToast({ type: 'success', title: 'Report saved', message: 'Next: get an AI suggestion or write the complaint.' });
    }
    navigate(`/citizen/reports/${report.id}`);
  };

  const fieldError = (name) =>
    stepErrors[name] && (
      <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
        <AlertCircle className="w-3 h-3" />
        <span>{stepErrors[name]}</span>
      </p>
    );

  const inputBase =
    'w-full px-3.5 py-2.5 rounded-xl bg-surface-canvas border text-xs sm:text-sm text-navy focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary';

  return (
    <DashboardLayout
      activeRole={ROLES.CITIZEN}
      title="Report a civic issue"
      subtitle="Describe the problem. You review everything before anything is sent to an authority."
      breadcrumbs={[{ label: 'My reports', to: '/citizen/dashboard' }, { label: 'New report' }]}
      primaryAction={
        <Link
          to="/citizen/dashboard"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-surface hover:bg-surface-canvas text-xs font-bold text-navy transition-colors shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to my reports</span>
        </Link>
      }
    >
      <div className="max-w-3xl mx-auto">
        <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-border shadow-2xs transition-colors">
          {/* Stepper */}
          <div className="mb-6 p-3 rounded-2xl bg-surface-canvas border border-border">
            <div className="flex items-center justify-between">
              {STEPS.map((step, idx) => {
                const done = currentStep > step.id;
                const active = currentStep === step.id;
                const Icon = step.icon;
                return (
                  <React.Fragment key={step.id}>
                    <button
                      type="button"
                      disabled={loading || step.id > currentStep}
                      onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                      className={`flex items-center gap-2 transition-colors text-left cursor-pointer disabled:cursor-default ${
                        step.id <= currentStep ? 'opacity-100' : 'opacity-40'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                          done ? 'bg-emerald-600 text-white' : active ? 'bg-primary text-white shadow-xs' : 'bg-surface border border-border text-muted'
                        }`}
                      >
                        {done ? <Check className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                      </div>
                      <div className="hidden sm:block">
                        <span className="text-[10px] uppercase font-bold text-muted block leading-none">Step {step.id}</span>
                        <span className={`text-xs font-bold leading-tight ${active ? 'text-navy' : 'text-muted'}`}>{step.label}</span>
                      </div>
                    </button>
                    {idx < STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-2 rounded-full transition-colors ${currentStep > step.id ? 'bg-emerald-500' : 'bg-border'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {error && (
            <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: describe */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <label htmlFor="report-title" className="block text-xs font-bold text-navy mb-1">
                  Title <span className="text-rose-500">*</span>
                </label>
                <input
                  id="report-title"
                  name="title"
                  maxLength={200}
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g. Pothole near the market"
                  className={`${inputBase} ${stepErrors.title ? 'border-rose-400' : 'border-border'}`}
                />
                {fieldError('title')}
              </div>
              <div>
                <label htmlFor="report-desc" className="block text-xs font-bold text-navy mb-1">
                  Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="report-desc"
                  name="description"
                  rows={5}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="What is the problem, how big is it, and since when?"
                  className={`${inputBase} resize-none ${stepErrors.description ? 'border-rose-400' : 'border-border'}`}
                />
                {fieldError('description')}
              </div>
              <div>
                <label htmlFor="report-category" className="block text-xs font-bold text-navy mb-1">
                  Category (optional)
                </label>
                <div className="flex items-center gap-2">
                  <div className="shrink-0 p-1.5 rounded-xl bg-surface-canvas border border-border">
                    <CategoryIcon category={formData.category || 'other'} size={26} />
                  </div>
                  <select
                    id="report-category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="flex-1 px-3 py-2.5 rounded-xl bg-surface-canvas border border-border text-xs font-semibold text-navy focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  >
                    <option value="">Not sure (the AI can suggest one later)</option>
                    {CIVIC_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}: {c.description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: location */}
          {currentStep === 2 && (
            <div className="space-y-2 animate-fadeIn">
              <LocationFields form={formData} onChange={setField} disabled={loading} idPrefix="report" />
              {fieldError('latitude')}
              <AlreadyReportedPanel latitude={formData.latitude} longitude={formData.longitude} ownReports={ownReports} />
            </div>
          )}

          {/* STEP 3: photos */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fadeIn">
              {photos.length > 0 && (
                <ul className="space-y-2">
                  {photos.map((p, i) => (
                    <li key={p.key} className="flex items-center gap-3 p-2.5 rounded-2xl bg-surface-canvas border border-border">
                      <div className="w-14 h-14 rounded-xl overflow-hidden border border-border shrink-0 bg-surface">
                        <LocalPreview file={p.file} />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-xs font-semibold text-navy truncate">
                          {p.file.name} <span className="text-muted font-normal">({formatFileSize(p.file.size)})</span>
                        </p>
                        <input
                          maxLength={500}
                          value={p.description}
                          onChange={(e) =>
                            setPhotos((prev) => prev.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))
                          }
                          placeholder="Optional: what does the photo show?"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-border text-xs text-navy focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <PhotoLocationHint
                          distance={photoDistance(p.gps)}
                          onUse={() => {
                            setField('latitude', String(p.gps.latitude));
                            setField('longitude', String(p.gps.longitude));
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                        className="p-2 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                        aria-label={`Remove ${p.file.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {photos.length < MAX_PHOTOS ? (
                <PhotoEvidenceUploader
                  id="report-photo-picker"
                  label={`Add photos (${photos.length}/${MAX_PHOTOS}, at least 1 required)`}
                  onSelect={addPhoto}
                />
              ) : (
                <p className="text-xs text-muted">You have added the maximum of {MAX_PHOTOS} photos.</p>
              )}
              {fieldError('photos')}
            </div>
          )}

          {/* STEP 4: review */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-surface-canvas border border-border space-y-3">
                <div className="text-sm font-black text-navy">{formData.title}</div>
                <div className="flex items-center gap-2">
                  <CategoryIcon category={formData.category || 'other'} size={20} />
                  <span className="text-xs font-bold text-primary">{categoryLabel(formData.category || null)}</span>
                </div>
                <p className="text-xs text-muted leading-relaxed p-3 rounded-xl bg-surface border border-border whitespace-pre-wrap">
                  {formData.description}
                </p>
                <div className="flex items-start gap-2 text-xs text-navy">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">{formData.location_text}</span>
                    <div className="text-[11px] text-muted mt-0.5 tabular-nums">
                      {formData.latitude}, {formData.longitude}
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t border-border text-[11px] text-muted">
                  {photos.length} photo(s) will be uploaded.
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-surface-canvas border border-border">
                <ShareChoice
                  idPrefix="wizard"
                  shared={sharing.shared}
                  showName={sharing.showName}
                  disabled={loading}
                  onChange={(shared, showName) => setSharingChoice({ shared, showName })}
                />
              </div>
              <NoteBox tone="ai">
                <span className="inline-flex items-center gap-1 font-bold">
                  <Sparkles className="w-3 h-3" /> What happens next
                </span>
                <br />
                Saving creates your report. Nothing is sent to any authority yet. On the report page you can ask the
                AI for a complaint draft, edit it, and approve the exact text before trying to send it.
              </NoteBox>
              {progress && <p className="text-xs text-primary font-semibold" role="status">{progress}</p>}
            </div>
          )}

          {/* Actions */}
          <div className="pt-5 mt-5 border-t border-border flex items-center justify-between gap-3">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-surface-canvas text-xs font-bold text-navy transition-colors cursor-pointer disabled:opacity-50"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <Link
                to="/citizen/dashboard"
                className="px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-surface-canvas text-xs font-bold text-navy transition-colors"
              >
                Cancel
              </Link>
            )}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-emerald-600 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{loading ? 'Saving...' : 'Save report'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
