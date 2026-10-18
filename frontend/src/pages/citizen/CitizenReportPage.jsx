import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Send,
  FileText,
  Camera,
  Check,
  Building,
  Info,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { CIVIC_CATEGORIES } from '../../constants/civicCategories';
import { submitCitizenComplaint, classifyIssueWithAi } from '../../services/complaintService';
import { ROLES } from '../../constants/roles';
import CategoryIcon from '../../components/icons3d/CategoryIcon';
import PriorityBadge from '../../components/common/PriorityBadge';
import { useToast } from '../../context/ToastContext';
import PhotoEvidenceUploader from '../../components/complaints/PhotoEvidenceUploader';

const STEPS = [
  { id: 1, label: 'Describe', icon: FileText },
  { id: 2, label: 'Location', icon: MapPin },
  { id: 3, label: 'Evidence', icon: Camera },
  { id: 4, label: 'Review', icon: CheckCircle2 },
];

/**
 * CitizenReportPage
 * Dedicated full-page citizen grievance intake workflow with guided 4-step wizard:
 * 1. Describe Issue (with AI classification assist)
 * 2. Incident Location & Ward
 * 3. Photographic Evidence
 * 4. Summary Review & Submission
 */
export default function CitizenReportPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);

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

  const [stepErrors, setStepErrors] = useState({});
  const [isAiClassifying, setIsAiClassifying] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [aiNotice, setAiNotice] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (stepErrors[name]) {
      setStepErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validateStep1 = () => {
    const errors = {};
    if (!formData.title.trim()) {
      errors.title = 'Please enter an issue title.';
    } else if (formData.title.trim().length < 5) {
      errors.title = 'Title should be at least 5 characters.';
    }
    if (!formData.description.trim()) {
      errors.description = 'Please describe the issue.';
    } else if (formData.description.trim().length < 15) {
      errors.description = 'Please provide at least 15 characters describing the issue.';
    }
    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = () => {
    const errors = {};
    if (!formData.address.trim()) {
      errors.address = 'Please provide a street address or location.';
    } else if (formData.address.trim().length < 5) {
      errors.address = 'Please provide a more descriptive street address.';
    }
    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

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

  const handleBack = () => {
    setError(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

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
          'AI Auto-Classification endpoint requires FastAPI integration. You can select the category manually.'
      );
    }
  };

  const handleApplyAiSuggestion = () => {
    if (!aiSuggestion) return;
    setFormData((prev) => ({
      ...prev,
      category: aiSuggestion.predictedCategory || prev.category,
      priority: aiSuggestion.estimatedPriority || prev.priority,
    }));
    showToast({
      type: 'info',
      title: 'AI Suggestion Applied',
      message: 'Category and priority updated from AI model recommendation.',
    });
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;

    if (!formData.title.trim() || !formData.description.trim() || !formData.address.trim()) {
      setError('Please provide all required fields in steps 1 and 2.');
      return;
    }

    setLoading(true);
    setError(null);

    const selectedCategoryObj = CIVIC_CATEGORIES.find((c) => c.id === formData.category);
    const categoryLabel = selectedCategoryObj?.label || 'Civic Infrastructure';

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
      showToast({
        type: 'success',
        title: 'Report Submitted',
        message: 'Your report has been successfully registered and routed to municipal authorities.',
      });
      setTimeout(() => {
        navigate('/citizen/dashboard');
      }, 1400);
    } else {
      const errMsg = result.error || 'Failed to submit grievance report.';
      setError(errMsg);
      showToast({ type: 'error', title: 'Submission Failed', message: errMsg });
    }
  };

  return (
    <DashboardLayout
      activeRole={ROLES.CITIZEN}
      title="Report New Civic Issue"
      subtitle="Follow the guided 4-step intake for municipal inspection and AI triage."
      breadcrumbs={[
        { label: 'Citizen Home', to: '/citizen/dashboard' },
        { label: 'New Grievance Report' },
      ]}
      primaryAction={
        <Link
          to="/citizen/dashboard"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-surface hover:bg-surface-canvas text-xs font-bold text-navy transition-colors shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Complaints</span>
        </Link>
      }
    >
      <div className="max-w-3xl mx-auto">
        <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-border shadow-2xs transition-colors">
          {/* Header */}
          <div className="flex items-center gap-3 pb-5 mb-6 border-b border-border">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-navy">
                Municipal Intake &amp; AI Routing Wizard
              </h2>
              <p className="text-xs text-muted">
                Step-by-step grievance registration with photographic evidence and automatic authority assignment.
              </p>
            </div>
          </div>

          {/* Stepper Progress Header */}
          {!success && (
            <div className="mb-6 p-3 rounded-2xl bg-surface-canvas border border-border">
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
                              : 'bg-surface border border-border text-muted'
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

          {error && (
            <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div role="status" className="py-8 text-center space-y-4 animate-fadeIn">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-navy">Grievance Registered Successfully!</h3>
              <p className="text-xs text-muted max-w-md mx-auto">
                Dispatched to municipal authorities. Returning to your citizen dashboard...
              </p>
            </div>
          ) : (
            <div>
              {/* STEP 1 */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <label htmlFor="full-report-title" className="block text-xs font-bold text-navy mb-1">
                      Issue Summary / Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="full-report-title"
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="e.g. Hazardous deep potholes on Outer Ring Road service lane"
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

                  <div>
                    <label htmlFor="full-report-desc" className="block text-xs font-bold text-navy mb-1">
                      Detailed Description <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      id="full-report-desc"
                      name="description"
                      rows={4}
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Provide specific details about dimensions of hazard, commuter risk, and persistence..."
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
                        <span>Min 15 characters recommended.</span>
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
                          <span>AI Assessment:</span>
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label htmlFor="full-report-category" className="block text-xs font-bold text-navy mb-1">
                        Civic Category <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="shrink-0 p-1.5 rounded-xl bg-surface-canvas border border-border">
                          <CategoryIcon category={formData.category} size={26} />
                        </div>
                        <select
                          id="full-report-category"
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
                      <label htmlFor="full-report-priority" className="block text-xs font-bold text-navy mb-1">
                        Urgency Level
                      </label>
                      <select
                        id="full-report-priority"
                        name="priority"
                        value={formData.priority}
                        onChange={handleChange}
                        className="w-full px-3 py-2.5 rounded-xl bg-surface-canvas border border-border text-xs font-semibold text-navy focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                      >
                        <option value="low">Low (Standard Maintenance)</option>
                        <option value="medium">Medium (Regular Commute Impeded)</option>
                        <option value="high">High (Severe Vehicle / Foot Hazard)</option>
                        <option value="critical">Critical (Immediate Accident Risk)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2 */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <label htmlFor="full-report-address" className="block text-xs font-bold text-navy mb-1">
                      Street Address / Location <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-emerald-600 absolute left-3 top-3 pointer-events-none" />
                      <input
                        id="full-report-address"
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="e.g. 5th Cross Road, Green Glen Layout, Bellandur"
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
                      <label htmlFor="full-report-landmark" className="block text-xs font-bold text-navy mb-1">
                        Prominent Landmark
                      </label>
                      <input
                        id="full-report-landmark"
                        type="text"
                        name="landmark"
                        value={formData.landmark}
                        onChange={handleChange}
                        placeholder="e.g. Opposite Childrens Park Corner"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-surface-canvas border border-border text-xs text-navy focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label htmlFor="full-report-ward" className="block text-xs font-bold text-navy mb-1">
                        Municipal Ward / Zone
                      </label>
                      <input
                        id="full-report-ward"
                        type="text"
                        name="ward"
                        value={formData.ward}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-surface-canvas border border-border text-xs text-navy focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3 */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-fadeIn">
                  <PhotoEvidenceUploader
                    id="full-report-attachment"
                    value={formData.attachmentUrl}
                    onChange={(dataUrl, file) => {
                      setFormData((prev) => ({
                        ...prev,
                        attachmentUrl: dataUrl,
                        attachmentFile: file,
                      }));
                    }}
                    label="Upload Photo Evidence"
                    helperText="Clear photos of potholes, waterlogging, or damaged fixtures expedite municipal field crew inspection."
                    maxSizeMB={10}
                  />
                </div>
              )}

              {/* STEP 4 */}
              {currentStep === 4 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="p-4 rounded-2xl bg-surface-canvas border border-border space-y-3">
                    <div className="flex items-center justify-between border-b border-border pb-2.5">
                      <span className="text-xs font-bold text-navy uppercase tracking-wider">
                        Grievance Ticket Preview
                      </span>
                      <PriorityBadge priority={formData.priority} />
                    </div>

                    <div>
                      <div className="text-sm font-black text-navy">{formData.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <CategoryIcon category={formData.category} size={20} />
                        <span className="text-xs font-bold text-primary">
                          {CIVIC_CATEGORIES.find((c) => c.id === formData.category)?.label || formData.category}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-muted leading-relaxed p-3 rounded-xl bg-surface border border-border">
                      {formData.description}
                    </p>

                    <div className="flex items-start gap-2 text-xs text-navy">
                      <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">{formData.address}</span>
                        {formData.landmark && <span className="text-muted"> &bull; {formData.landmark}</span>}
                        <div className="text-[11px] text-muted font-medium mt-0.5">
                          {formData.ward} &bull; Bengaluru
                        </div>
                      </div>
                    </div>

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
                            <span>Photo evidence attached</span>
                          </div>
                          <span className="text-[11px] text-muted">Ready for field crew verification</span>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-border text-[11px] text-muted italic">
                        No photograph attached.
                      </div>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                    <Building className="w-4 h-4 shrink-0 text-emerald-700" />
                    <span>Dispatches directly to municipal review desk with automated audit trail.</span>
                  </div>
                </div>
              )}

              {/* Wizard Bottom Actions */}
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
                    <Send className="w-3.5 h-3.5" />
                    <span>{loading ? 'Submitting to Authorities...' : 'Submit Grievance'}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
