import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  X,
  MapPin,
  AlertCircle,
  Sparkles,
  Send,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Camera,
  Check,
  Building,
  Info,
} from 'lucide-react';
import { CIVIC_CATEGORIES } from '../../constants/civicCategories';
import { submitCitizenComplaint, classifyIssueWithAi } from '../../services/complaintService';
import CategoryIcon from '../icons3d/CategoryIcon';
import PriorityBadge from '../common/PriorityBadge';
import { useToast } from '../../context/ToastContext';
import PhotoEvidenceUploader from './PhotoEvidenceUploader';

/**
 * AnimatedCheckmark
 * Draws an animated SVG checkmark using stroke-dashoffset upon successful submission.
 */
function AnimatedCheckmark() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 border border-emerald-300">
      <svg className="w-7 h-7 text-emerald-600" viewBox="0 0 24 24" fill="none">
        <motion.path
          d="M5 13l4 4L19 7"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: shouldReduceMotion ? 1 : 0, opacity: shouldReduceMotion ? 1 : 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.45, ease: 'easeOut' }}
        />
      </svg>
    </div>
  );
}

const STEPS = [
  { id: 1, label: 'Describe', icon: FileText },
  { id: 2, label: 'Location', icon: MapPin },
  { id: 3, label: 'Evidence', icon: Camera },
  { id: 4, label: 'Review', icon: CheckCircle2 },
];

/**
 * ReportIssueModal
 * Guided 4-Step grievance intake wizard:
 * Step 1: Describe the issue & AI Classification Assist
 * Step 2: Select or confirm incident location & ward
 * Step 3: Upload photographic evidence with preview & removal
 * Step 4: Summary review & verified submission
 */
export default function ReportIssueModal({ isOpen, onClose, onComplaintCreated }) {
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category: 'pothole',
    address: '',
    landmark: '',
    ward: 'Ward 150 - Bellandur',
    priority: 'medium',
    description: '',
    attachmentUrl: '',
    attachmentFile: null,
  });

  // Step Validation Errors
  const [stepErrors, setStepErrors] = useState({});

  // AI Classification State
  const [isAiClassifying, setIsAiClassifying] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [aiNotice, setAiNotice] = useState(null);

  // Submission State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [createdComplaint, setCreatedComplaint] = useState(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear validation error for that field
    if (stepErrors[name]) {
      setStepErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  // Step 1 Validation
  const validateStep1 = () => {
    const errors = {};
    if (!formData.title.trim()) {
      errors.title = 'Please enter a clear issue title.';
    } else if (formData.title.trim().length < 5) {
      errors.title = 'Issue title should be at least 5 characters.';
    }

    if (!formData.description.trim()) {
      errors.description = 'Please describe the issue in detail.';
    } else if (formData.description.trim().length < 15) {
      errors.description = 'Please provide at least 15 characters describing the issue.';
    }

    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step 2 Validation
  const validateStep2 = () => {
    const errors = {};
    if (!formData.address.trim()) {
      errors.address = 'Please provide a street address or specific location.';
    } else if (formData.address.trim().length < 5) {
      errors.address = 'Please provide a more descriptive street address.';
    }

    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Next Step Navigation
  const handleNext = () => {
    setError(null);
    if (currentStep === 1) {
      if (!validateStep1()) return;
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!validateStep2()) return;
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    }
  };

  // Previous Step Navigation
  const handleBack = () => {
    setError(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // AI Classification Trigger
  const handleAiClassify = async () => {
    if (!formData.title.trim() && !formData.description.trim()) {
      setStepErrors({
        title: 'Enter a title or description first to run AI categorization.',
      });
      return;
    }

    setIsAiClassifying(true);
    setAiNotice(null);
    setAiSuggestion(null);

    const result = await classifyIssueWithAi({
      title: formData.title.trim(),
      description: formData.description.trim(),
    });

    setIsAiClassifying(false);

    if (result.success && result.data) {
      setAiSuggestion(result.data);
      showToast({
        type: 'success',
        title: 'AI Classification Ready',
        message: `Suggested category: ${result.data.categoryLabel || result.data.predictedCategory}`,
      });
    } else {
      setAiNotice(
        result.message ||
          'AI Auto-Classification endpoint requires FastAPI integration. You can select the category and priority manually.'
      );
    }
  };

  // Apply AI Suggestion
  const handleApplyAiSuggestion = () => {
    if (!aiSuggestion) return;
    setFormData((prev) => ({
      ...prev,
      category: aiSuggestion.predictedCategory || prev.category,
      priority: aiSuggestion.estimatedPriority || prev.priority,
    }));
    showToast({
      type: 'info',
      title: 'AI Recommendation Applied',
      message: 'Category and priority updated from AI model recommendation.',
    });
  };

  // Final Form Submission
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (loading) return; // Prevent duplicate inflight submissions

    // Final check
    if (!formData.title.trim() || !formData.description.trim() || !formData.address.trim()) {
      setError('Missing required grievance fields. Please review steps 1 and 2.');
      return;
    }

    setLoading(true);
    setError(null);

    // Find category label
    const selectedCategoryObj = CIVIC_CATEGORIES.find((c) => c.id === formData.category);
    const categoryLabel = selectedCategoryObj?.label || 'Civic Infrastructure';

    // Dispatch POST /api/v1/complaints
    const result = await submitCitizenComplaint({
      title: formData.title.trim(),
      description: formData.description.trim(),
      category: formData.category,
      categoryLabel,
      priority: formData.priority,
      location: {
        address: formData.address.trim(),
        landmark: formData.landmark.trim() || undefined,
        ward: formData.ward,
        city: 'Bengaluru',
      },
      attachmentUrl: formData.attachmentUrl.trim() || undefined,
    });

    setLoading(false);

    if (result.success) {
      setSuccess(true);
      setCreatedComplaint(result.data);
      showToast({
        type: 'success',
        title: 'Complaint Registered',
        message: 'Your civic grievance ticket has been routed to the municipal review queue.',
      });
      if (onComplaintCreated) onComplaintCreated(result.data);
    } else {
      // PRESERVE FORM DATA: Do not wipe state on failure
      const errMsg = result.error || 'Failed to submit report. Please check details and try again.';
      setError(errMsg);
      showToast({ type: 'error', title: 'Submission Error', message: errMsg });
    }
  };

  const handleModalClose = () => {
    if (loading) return;
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-navy/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
    >
      <div className="bg-surface rounded-3xl max-w-2xl w-full max-h-[92vh] shadow-2xl border border-border flex flex-col text-left overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-border bg-surface-canvas/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 id="report-modal-title" className="text-lg sm:text-xl font-extrabold text-navy tracking-tight">
                Report Civic Infrastructure Issue
              </h2>
              <p className="text-xs text-muted">
                Guided 4-step intake for municipal inspection and AI triage.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleModalClose}
            disabled={loading}
            className="p-1.5 rounded-xl border border-border bg-surface hover:bg-surface-canvas text-muted hover:text-navy transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        {!success && (
          <div className="px-5 sm:px-6 py-3 bg-surface border-b border-border">
            <div className="flex items-center justify-between">
              {STEPS.map((step, idx) => {
                const isStepCompleted = currentStep > step.id;
                const isStepActive = currentStep === step.id;
                const IconComponent = step.icon;

                return (
                  <React.Fragment key={step.id}>
                    <button
                      type="button"
                      disabled={loading || step.id > currentStep}
                      onClick={() => {
                        if (step.id < currentStep) setCurrentStep(step.id);
                      }}
                      className={`flex items-center gap-2 group transition-colors text-left cursor-pointer disabled:cursor-default ${
                        step.id <= currentStep ? 'opacity-100' : 'opacity-40'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                          isStepCompleted
                            ? 'bg-emerald-600 text-white'
                            : isStepActive
                            ? 'bg-primary text-white shadow-xs'
                            : 'bg-surface-canvas border border-border text-muted'
                        }`}
                      >
                        {isStepCompleted ? <Check className="w-4 h-4" /> : <IconComponent className="w-3.5 h-3.5" />}
                      </div>
                      <div className="hidden sm:block">
                        <span className="text-[10px] uppercase font-bold text-muted block leading-none">
                          Step {step.id}
                        </span>
                        <span
                          className={`text-xs font-bold leading-tight ${
                            isStepActive ? 'text-navy' : 'text-muted'
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    </button>

                    {idx < STEPS.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-2 rounded-full transition-colors ${
                          currentStep > step.id ? 'bg-emerald-500' : 'bg-border'
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal Form Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* General API Error Banner */}
          {error && (
            <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success State Screen */}
          {success ? (
            <div className="py-6 sm:py-8 text-center space-y-4 animate-fadeIn">
              <div className="flex justify-center">
                <AnimatedCheckmark />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-navy">Grievance Ticket Registered!</h3>
                <p className="text-xs sm:text-sm text-muted max-w-md mx-auto">
                  Your complaint has been successfully dispatched to the municipal review queue with geolocation and AI intake routing.
                </p>
              </div>

              {createdComplaint && (
                <div className="p-4 rounded-2xl bg-surface-canvas border border-emerald-300 max-w-md mx-auto text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted font-medium">Ticket ID:</span>
                    <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                      {createdComplaint.id}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted font-medium">Category:</span>
                    <span className="text-xs font-bold text-navy">
                      {createdComplaint.categoryLabel || createdComplaint.category}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted font-medium">Status:</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      <span>Submitted &bull; Awaiting Review</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted font-medium">AI Intake Pipeline:</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                      <Sparkles className="w-3 h-3 text-teal-600" />
                      <span>AI Triaged (Duplicate Check Cleared)</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted font-medium">Jurisdiction Ward:</span>
                    <span className="text-xs font-semibold text-navy">
                      {createdComplaint.location?.ward || 'Ward 150'}
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-primary hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Done &amp; View in Dashboard
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* ========================================================= */}
              {/* STEP 1: DESCRIBE ISSUE & AI ASSIST                        */}
              {/* ========================================================= */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Issue Title */}
                  <div>
                    <label htmlFor="report-issue-title" className="block text-xs font-bold text-navy mb-1">
                      Issue Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="report-issue-title"
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="e.g. Deep Pothole Cluster on 5th Main Service Road"
                      className={`w-full px-3.5 py-2.5 rounded-xl bg-surface-canvas border text-xs sm:text-sm text-navy focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary ${
                        stepErrors.title ? 'border-rose-400' : 'border-border'
                      }`}
                    />
                    {stepErrors.title && (
                      <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3" />
                        <span>{stepErrors.title}</span>
                      </p>
                    )}
                  </div>

                  {/* Detailed Description */}
                  <div>
                    <label htmlFor="report-issue-desc" className="block text-xs font-bold text-navy mb-1">
                      Detailed Description <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      id="report-issue-desc"
                      name="description"
                      rows={3}
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Describe the issue dimensions, hazard to commuters, and duration observed..."
                      className={`w-full p-3 rounded-xl bg-surface-canvas border text-xs sm:text-sm text-navy focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none ${
                        stepErrors.description ? 'border-rose-400' : 'border-border'
                      }`}
                    />
                    <div className="flex items-center justify-between text-[10.5px] text-muted mt-1">
                      {stepErrors.description ? (
                        <span className="text-rose-600 flex items-center gap-1 font-medium">
                          <AlertCircle className="w-3 h-3" />
                          <span>{stepErrors.description}</span>
                        </span>
                      ) : (
                        <span>Provide clear details to accelerate municipal inspection.</span>
                      )}
                      <span>{formData.description.length} chars</span>
                    </div>
                  </div>

                  {/* AI Assistance Action Card */}
                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span className="text-xs font-bold text-emerald-950">AI Auto-Classification</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAiClassify}
                        disabled={isAiClassifying}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{isAiClassifying ? 'Analyzing...' : 'Analyze with AI'}</span>
                      </button>
                    </div>

                    {aiNotice && (
                      <p className="text-[11px] text-stone-600 leading-relaxed font-sans bg-white/70 p-2 rounded-lg border border-emerald-200/50">
                        <Info className="w-3 h-3 inline mr-1 text-emerald-700" />
                        {aiNotice}
                      </p>
                    )}

                    {aiSuggestion && (
                      <div className="p-3 rounded-xl bg-white border border-emerald-300 text-xs space-y-2">
                        <div className="font-bold text-emerald-950 flex items-center justify-between">
                          <span>AI Assessment Result:</span>
                          <button
                            type="button"
                            onClick={handleApplyAiSuggestion}
                            className="px-2.5 py-1 rounded-md bg-emerald-700 text-white text-[10.5px] font-bold hover:bg-emerald-800 transition-colors cursor-pointer"
                          >
                            Apply Suggestion
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11.5px] text-navy">
                          <div>
                            <span className="text-muted block text-[10px]">Predicted Category:</span>
                            <span className="font-bold">{aiSuggestion.categoryLabel || aiSuggestion.predictedCategory}</span>
                          </div>
                          <div>
                            <span className="text-muted block text-[10px]">Estimated Priority:</span>
                            <span className="font-bold capitalize">{aiSuggestion.estimatedPriority}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Category & Perceived Priority */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label htmlFor="report-issue-category" className="block text-xs font-bold text-navy mb-1">
                        Civic Category <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="shrink-0 p-1.5 rounded-xl bg-surface-canvas border border-border">
                          <CategoryIcon category={formData.category} size={24} />
                        </div>
                        <select
                          id="report-issue-category"
                          name="category"
                          value={formData.category}
                          onChange={handleChange}
                          className="flex-1 px-3 py-2.5 rounded-xl bg-surface-canvas border border-border text-xs font-semibold text-navy focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                        >
                          {CIVIC_CATEGORIES.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="report-issue-priority" className="block text-xs font-bold text-navy mb-1">
                        Perceived Urgency
                      </label>
                      <select
                        id="report-issue-priority"
                        name="priority"
                        value={formData.priority}
                        onChange={handleChange}
                        className="w-full px-3 py-2.5 rounded-xl bg-surface-canvas border border-border text-xs font-semibold text-navy focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                      >
                        <option value="low">Low (Minor inconvenience)</option>
                        <option value="medium">Medium (Regular traffic impacted)</option>
                        <option value="high">High (Severe hazard to commuters)</option>
                        <option value="critical">Critical (Immediate life safety risk)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* STEP 2: LOCATION & MUNICIPAL WARD                         */}
              {/* ========================================================= */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <label htmlFor="report-issue-address" className="block text-xs font-bold text-navy mb-1">
                      Street Address / Incident Spot <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                      </div>
                      <input
                        id="report-issue-address"
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="e.g. 5th Cross Road, Near Green Glen Layout, Bellandur"
                        className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-surface-canvas border text-xs sm:text-sm text-navy focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary ${
                          stepErrors.address ? 'border-rose-400' : 'border-border'
                        }`}
                      />
                    </div>
                    {stepErrors.address && (
                      <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3" />
                        <span>{stepErrors.address}</span>
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="report-issue-landmark" className="block text-xs font-bold text-navy mb-1">
                        Landmark / Cross Road (Optional)
                      </label>
                      <input
                        id="report-issue-landmark"
                        type="text"
                        name="landmark"
                        value={formData.landmark}
                        onChange={handleChange}
                        placeholder="Opposite Metro Pillar #42"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-surface-canvas border border-border text-xs text-navy focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label htmlFor="report-issue-ward" className="block text-xs font-bold text-navy mb-1">
                        Municipal Ward
                      </label>
                      <select
                        id="report-issue-ward"
                        name="ward"
                        value={formData.ward}
                        onChange={handleChange}
                        className="w-full px-3 py-2.5 rounded-xl bg-surface-canvas border border-border text-xs font-semibold text-navy focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                      >
                        <option value="Ward 150 - Bellandur">Ward 150 - Bellandur</option>
                        <option value="Ward 174 - HSR Layout">Ward 174 - HSR Layout</option>
                        <option value="Ward 112 - Domlur">Ward 112 - Domlur</option>
                        <option value="Ward 85 - Koramangala">Ward 85 - Koramangala</option>
                        <option value="Ward 19 - Indiranagar">Ward 19 - Indiranagar</option>
                        <option value="Ward 149 - Varthur">Ward 149 - Varthur</option>
                      </select>
                    </div>
                  </div>

                  {/* Location Summary Box */}
                  <div className="p-4 rounded-2xl bg-surface-canvas border border-border flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="text-xs space-y-0.5">
                      <div className="font-bold text-navy">Jurisdiction Routing Target</div>
                      <p className="text-muted">
                        Complaints in <strong>{formData.ward}</strong> are dispatched to the Mahadevapura / South Zonal Engineering Cell for BBMP verification.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* STEP 3: PHOTOGRAPHIC EVIDENCE UPLOADER                    */}
              {/* ========================================================= */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-fadeIn">
                  <PhotoEvidenceUploader
                    id="guided-report-photo"
                    value={formData.attachmentUrl}
                    onChange={(dataUrl, file) => {
                      setFormData((prev) => ({
                        ...prev,
                        attachmentUrl: dataUrl,
                        attachmentFile: file,
                      }));
                    }}
                    label="Photographic Evidence"
                    helperText="Uploading a clear photograph allows municipal engineers to inspect damage severity before deploying repair vehicles."
                    maxSizeMB={10}
                  />

                  <div className="p-3.5 rounded-xl bg-surface-canvas border border-border text-[11px] text-muted space-y-1">
                    <div className="font-bold text-navy flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-primary" />
                      <span>Photo Guidelines</span>
                    </div>
                    <p>
                      Supported formats: JPG, PNG, WEBP, HEIC up to 10MB. Photographs taken during daylight hours ensure faster municipal triage.
                    </p>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* STEP 4: REVIEW & CONFIRM SUBMISSION                       */}
              {/* ========================================================= */}
              {currentStep === 4 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="p-4 rounded-2xl bg-surface-canvas border border-border space-y-3">
                    <div className="flex items-center justify-between border-b border-border pb-2.5">
                      <span className="text-xs font-bold text-navy uppercase tracking-wider">
                        Grievance Summary Preview
                      </span>
                      <PriorityBadge priority={formData.priority} />
                    </div>

                    {/* Title & Category */}
                    <div>
                      <div className="text-sm font-black text-navy">{formData.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <CategoryIcon category={formData.category} size={20} />
                        <span className="text-xs font-bold text-primary">
                          {CIVIC_CATEGORIES.find((c) => c.id === formData.category)?.label || formData.category}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-muted leading-relaxed p-3 rounded-xl bg-surface border border-border">
                      {formData.description}
                    </p>

                    {/* Location */}
                    <div className="flex items-start gap-2 text-xs text-navy">
                      <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">{formData.address}</span>
                        {formData.landmark && <span className="text-muted"> &bull; Landmark: {formData.landmark}</span>}
                        <div className="text-[11px] text-muted font-medium mt-0.5">
                          {formData.ward} &bull; Bengaluru
                        </div>
                      </div>
                    </div>

                    {/* Attached Photo Thumbnail */}
                    {formData.attachmentUrl ? (
                      <div className="pt-2 border-t border-border flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl overflow-hidden border border-border shrink-0 bg-surface">
                          <img
                            src={formData.attachmentUrl}
                            alt="Evidence preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="text-xs">
                          <div className="font-bold text-emerald-800 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Photographic evidence attached</span>
                          </div>
                          <span className="text-[11px] text-muted">Ready for field crew verification</span>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-border text-[11px] text-muted italic">
                        No photograph attached (Report will proceed with standard inspection).
                      </div>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                    <Building className="w-4 h-4 shrink-0 text-emerald-700" />
                    <span>
                      Upon submission, your issue ticket will be generated and assigned a standard 72-hour municipal resolution SLA.
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer Controls */}
        {!success && (
          <div className="p-4 sm:p-5 border-t border-border bg-surface-canvas/50 flex items-center justify-between gap-3">
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
              <button
                type="button"
                onClick={handleModalClose}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-surface-canvas text-xs font-bold text-navy transition-colors cursor-pointer"
              >
                Cancel
              </button>
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
                <Send className="w-3.5 h-3.5" />
                <span>{loading ? 'Submitting Grievance...' : 'Submit Grievance'}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
