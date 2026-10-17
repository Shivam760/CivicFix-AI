import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Building,
  ShieldCheck,
  Send,
  Lock,
  Globe,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  Bot,
  Cpu,
  User,
  Maximize2,
  CheckCircle2,
  Copy,
  Edit3,
  ArrowRight,
  Check,
  HelpCircle,
  Wrench,
  Camera,
  FileText,
  History,
  Settings,
  PlusCircle,
} from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import PriorityBadge from '../common/PriorityBadge';
import ComplaintTimeline from './ComplaintTimeline';
import ConfirmationDialog from '../common/ConfirmationDialog';
import { formatDate } from '../../utils/formatters';
import {
  updateComplaintStatus,
  addComplaintNote,
  forwardComplaintToAuthority,
  applyAiRecommendation,
  resolveDuplicateCandidate,
  submitCitizenAdditionalInfo,
  requestAdditionalInfo,
  recordComplaintResolution,
  adminOverrideComplaint,
} from '../../services/complaintService';
import { getCurrentUser } from '../../services/authService';
import { MOCK_ADMIN_AUTHORITIES } from '../../mocks/adminDashboardMock';
import { COMPLAINT_STATUS } from '../../constants/complaintStatuses';
import { CIVIC_CATEGORIES } from '../../constants/civicCategories';
import { ROLES } from '../../constants/roles';
import { useToast } from '../../context/ToastContext';

/**
 * ComplaintDetailModal
 * Unified case-management and citizen tracking modal for CivicFix AI.
 * 
 * Supports 3 role-specific workflows:
 * - Citizen: View information, track status, view official public updates, supply additional info/clarification.
 * - Committee Officer: Review, accept/correct AI triage, dispatch departments, request additional citizen info, record resolution details.
 * - Administrator: Administrative override controls, system audit trail, metadata inspection, supervision.
 * 
 * Information Layout Sections:
 * 1. Header (Title, ID, Status, Priority, Submission Date)
 * 2. Overview & Evidence (Description, Location, Department, Evidence Photo, Resolution Sign-off)
 * 3. AI Analysis (Predictions, Confidence, Recommended Action, Duplicate Candidates, Human Verification)
 * 4. Status History & Timeline (Authentic canonical milestones, honest timestamps, no fabrication)
 * 5. Updates & Communication (Public citizen updates, Internal officer notes, Citizen Follow-up)
 * 6. Role Actions (Committee & Admin workflow controls with double-confirmation dialogs)
 */
export default function ComplaintDetailModal({
  complaint,
  isOpen,
  onClose,
  isCommitteeView = false,
  isAdminView = false,
  initialTab = 'overview',
  onComplaintUpdated,
}) {
  const { showToast } = useToast();
  const currentUser = getCurrentUser();

  // Role detection: Caller props take precedence, falling back to currentUser profile
  const isCitizenView = isCommitteeView === false && !isAdminView;
  const isAdmin = isAdminView || (!isCitizenView && currentUser?.role === ROLES.ADMIN);
  const isCommittee = !isCitizenView && (isCommitteeView || currentUser?.role === ROLES.COMMITTEE || isAdmin);
  const isCitizen = !isCommittee && !isAdmin;

  // Active Tab: 'overview' | 'ai_analysis' | 'timeline' | 'updates' | 'actions' | 'admin'
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState(null);

  // Synchronize active tab when initialTab changes
  if (initialTab !== prevInitialTab) {
    setPrevInitialTab(initialTab);
    setActiveTab(initialTab || 'overview');
  }

  // Escape key and backdrop click listener for modal accessibility
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (lightboxOpen) {
          setLightboxOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, lightboxOpen, onClose]);

  // Notes and updates
  const [newNoteText, setNewNoteText] = useState('');
  const [isNoteInternal, setIsNoteInternal] = useState(false);
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Citizen Additional Information form state
  const [citizenRemarks, setCitizenRemarks] = useState('');
  const [citizenAttachmentUrl, setCitizenAttachmentUrl] = useState('');
  const [isSubmittingCitizenInfo, setIsSubmittingCitizenInfo] = useState(false);

  // Committee: Request Additional Information from Citizen
  const [infoRequestQuery, setInfoRequestQuery] = useState('');
  const [confirmRequestInfoModal, setConfirmRequestInfoModal] = useState(false);
  const [isSubmittingInfoRequest, setIsSubmittingInfoRequest] = useState(false);

  // Committee: Resolution recording form state
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [resolvedByName, setResolvedByName] = useState(currentUser?.name || 'Municipal Engineer');
  const [resolutionEvidenceUrl, setResolutionEvidenceUrl] = useState('');
  const [resolutionSignOff, setResolutionSignOff] = useState('Remediation verified on-site by zonal inspection');
  const [confirmResolutionModal, setConfirmResolutionModal] = useState(false);
  const [isSubmittingResolution, setIsSubmittingResolution] = useState(false);

  // Status transition state
  const [targetStatus, setTargetStatus] = useState(complaint?.status || 'under_review');
  const [statusReason, setStatusReason] = useState('');
  const [confirmStatusModal, setConfirmStatusModal] = useState(false);
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);

  // Department Assignment / Forwarding state
  const [selectedAuthorityId, setSelectedAuthorityId] = useState('');
  const [assignedOfficerInput, setAssignedOfficerInput] = useState('');
  const [confirmForwardModal, setConfirmForwardModal] = useState(false);
  const [isSubmittingForward, setIsSubmittingForward] = useState(false);

  // AI Recommendation adoption & correction
  const [isApplyingAi, setIsApplyingAi] = useState(false);
  const [confirmAiModal, setConfirmAiModal] = useState(false);
  const [isModifyingAi, setIsModifyingAi] = useState(false);
  const [customCategory, setCustomCategory] = useState(complaint?.category || 'pothole');
  const [customPriority, setCustomPriority] = useState(complaint?.priority || 'medium');
  const [customDepartment, setCustomDepartment] = useState(
    complaint?.assignedDepartment || complaint?.department || ''
  );
  const [correctionReasonText, setCorrectionReasonText] = useState('');

  // Duplicate resolution state
  const [duplicateActionCandidate, setDuplicateActionCandidate] = useState(null);
  const [duplicateActionType, setDuplicateActionType] = useState(null);
  const [duplicateReason, setDuplicateReason] = useState('');
  const [confirmDuplicateModal, setConfirmDuplicateModal] = useState(false);
  const [isResolvingDuplicate, setIsResolvingDuplicate] = useState(false);

  // Quick accept state
  const [isAccepting, setIsAccepting] = useState(false);

  // Admin Override state
  const [adminOverrideStatus, setAdminOverrideStatus] = useState('');
  const [adminOverridePriority, setAdminOverridePriority] = useState('');
  const [adminOverrideDept, setAdminOverrideDept] = useState('');
  const [adminOverrideReason, setAdminOverrideReason] = useState('');
  const [confirmAdminOverrideModal, setConfirmAdminOverrideModal] = useState(false);
  const [isSubmittingAdminOverride, setIsSubmittingAdminOverride] = useState(false);

  // Feedback message
  const [actionMessage, setActionMessage] = useState(null);

  // Synchronize state when complaint changes without cascading effect renders
  const [prevComplaintId, setPrevComplaintId] = useState(complaint?.id);
  if (complaint && complaint.id !== prevComplaintId) {
    setPrevComplaintId(complaint.id);
    const currentAi = complaint.aiAnalysis;
    setCustomCategory(currentAi?.predictedCategory || complaint.category || 'pothole');
    setCustomPriority(currentAi?.estimatedPriority || complaint.priority || 'medium');
    setCustomDepartment(
      currentAi?.suggestedDepartment || complaint.assignedDepartment || complaint.department || ''
    );
    setCorrectionReasonText('');
    setIsModifyingAi(false);
    setTargetStatus(complaint.status || 'under_review');
    setStatusReason('');
  }

  if (!isOpen || !complaint) return null;

  const permissions = currentUser?.permissions || [
    'review_complaints',
    'update_status',
    'forward_department',
    'add_internal_notes',
    'verify_resolution',
  ];

  const canUpdateStatus = permissions.includes('update_status') || isCommittee;
  const canForward = permissions.includes('forward_department') || isCommittee;
  const canAddInternalNotes = (permissions.includes('add_internal_notes') || isCommittee) && !isCitizen;
  const canVerifyResolution = (permissions.includes('verify_resolution') || isCommittee) && !isCitizen;

  const ai = complaint.aiAnalysis;
  const isAiConfirmed =
    ai?.isConfirmed ||
    complaint.status === 'assigned' ||
    complaint.status === 'in_progress' ||
    complaint.status === 'resolved';

  const confidencePercent =
    typeof ai?.confidenceScore === 'number'
      ? Math.round(ai.confidenceScore <= 1 ? ai.confidenceScore * 100 : ai.confidenceScore)
      : null;

  // Open Lightbox
  const handleOpenLightbox = (imageUrl) => {
    setLightboxImageUrl(imageUrl || complaint.attachmentUrl);
    setLightboxOpen(true);
  };

  // Handle Quick Accept Complaint
  const handleQuickAccept = async () => {
    setIsAccepting(true);
    setActionMessage(null);
    const result = await updateComplaintStatus(
      complaint.id,
      COMPLAINT_STATUS.UNDER_REVIEW,
      'Complaint accepted for formal municipal inspection and zonal triage.'
    );
    setIsAccepting(false);
    if (result.success) {
      showToast({
        type: 'success',
        title: 'Complaint Accepted',
        message: `Case ${complaint.id} is now under formal review.`,
      });
      setActionMessage({ type: 'success', text: 'Complaint accepted for review.' });
      if (onComplaintUpdated) onComplaintUpdated();
    } else {
      showToast({
        type: 'error',
        title: 'Action Failed',
        message: result.error || 'Failed to accept complaint.',
      });
      setActionMessage({ type: 'error', text: result.error || 'Failed to accept complaint.' });
    }
  };

  // Handle Note / Progress Update Submission
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim() || isSubmittingNote) return;

    setIsSubmittingNote(true);
    setActionMessage(null);

    const result = await addComplaintNote(complaint.id, {
      text: newNoteText.trim(),
      isInternal: isCitizen ? false : isNoteInternal,
      author: isCitizen
        ? currentUser?.name || 'Citizen'
        : currentUser?.name || 'Committee Officer',
    });

    setIsSubmittingNote(false);
    if (result.success) {
      setNewNoteText('');
      showToast({
        type: 'success',
        title: 'Update Logged',
        message: !isCitizen && isNoteInternal
          ? 'Internal committee note added securely.'
          : 'Public update published successfully.',
      });
      setActionMessage({
        type: 'success',
        text: !isCitizen && isNoteInternal ? 'Internal note added.' : 'Public update published successfully.',
      });
      if (onComplaintUpdated) onComplaintUpdated();
    } else {
      setActionMessage({ type: 'error', text: result.error || 'Failed to post update.' });
    }
  };

  // Handle Citizen Additional Information Submission
  const handleSubmitCitizenInfo = async (e) => {
    e.preventDefault();
    if (!citizenRemarks.trim() || isSubmittingCitizenInfo) return;

    setIsSubmittingCitizenInfo(true);
    setActionMessage(null);

    const result = await submitCitizenAdditionalInfo(complaint.id, {
      remarks: citizenRemarks.trim(),
      attachmentUrl: citizenAttachmentUrl.trim() || null,
    });

    setIsSubmittingCitizenInfo(false);
    if (result.success) {
      setCitizenRemarks('');
      setCitizenAttachmentUrl('');
      showToast({
        type: 'success',
        title: 'Clarification Submitted',
        message: 'Your additional details have been recorded for municipal review.',
      });
      setActionMessage({
        type: 'success',
        text: 'Additional information submitted successfully to municipal records.',
      });
      if (onComplaintUpdated) onComplaintUpdated();
    } else {
      const errMsg = result.error || 'Failed to submit additional information.';
      showToast({ type: 'error', title: 'Submission Failed', message: errMsg });
      setActionMessage({ type: 'error', text: errMsg });
    }
  };

  // Handle Committee Request Additional Info Execution
  const handleConfirmRequestInfo = async () => {
    if (!infoRequestQuery.trim() || isSubmittingInfoRequest) return;
    setIsSubmittingInfoRequest(true);

    const result = await requestAdditionalInfo(complaint.id, {
      queryText: infoRequestQuery.trim(),
    });

    setIsSubmittingInfoRequest(false);
    setConfirmRequestInfoModal(false);

    if (result.success) {
      setInfoRequestQuery('');
      showToast({
        type: 'success',
        title: 'Information Requested',
        message: `Citizen notified for complaint ${complaint.id}.`,
      });
      setActionMessage({
        type: 'success',
        text: 'Information request published. Citizen notified to supply clarification.',
      });
      if (onComplaintUpdated) onComplaintUpdated();
    } else {
      const errMsg = result.error || 'Failed to request additional information.';
      showToast({ type: 'error', title: 'Request Failed', message: errMsg });
      setActionMessage({ type: 'error', text: errMsg });
    }
  };

  // Handle Status Update Execution
  const handleConfirmStatusChange = async () => {
    if (isSubmittingStatus) return;
    setIsSubmittingStatus(true);
    const result = await updateComplaintStatus(complaint.id, targetStatus, statusReason);
    setIsSubmittingStatus(false);
    setConfirmStatusModal(false);

    if (result.success) {
      showToast({
        type: 'success',
        title: 'Status Updated',
        message: `Complaint ${complaint.id} status changed to ${targetStatus}.`,
      });
      setActionMessage({ type: 'success', text: `Status updated to ${targetStatus}.` });
      if (onComplaintUpdated) onComplaintUpdated();
    } else {
      const errMsg = result.error || 'Failed to update status.';
      showToast({ type: 'error', title: 'Update Failed', message: errMsg });
      setActionMessage({ type: 'error', text: errMsg });
    }
  };

  // Handle Authority Forwarding Execution
  const handleConfirmForward = async () => {
    const auth = MOCK_ADMIN_AUTHORITIES.find((a) => a.id === selectedAuthorityId);
    if (!auth || isSubmittingForward) return;

    setIsSubmittingForward(true);
    const result = await forwardComplaintToAuthority(complaint.id, {
      authorityId: auth.id,
      departmentName: `${auth.name} - ${auth.department}`,
      officerName: assignedOfficerInput.trim() || auth.headOfficer,
    });

    setIsSubmittingForward(false);
    setConfirmForwardModal(false);

    if (result.success) {
      showToast({
        type: 'success',
        title: 'Case Dispatched',
        message: `Case assigned to ${auth.department}.`,
      });
      setActionMessage({ type: 'success', text: `Case assigned to ${auth.department}.` });
      if (onComplaintUpdated) onComplaintUpdated();
    } else {
      const errMsg = result.error || 'Failed to forward case.';
      showToast({ type: 'error', title: 'Dispatch Failed', message: errMsg });
      setActionMessage({ type: 'error', text: errMsg });
    }
  };

  // Handle Recording Resolution Details Execution
  const handleConfirmResolution = async () => {
    if (!resolutionSummary.trim() || isSubmittingResolution) return;
    setIsSubmittingResolution(true);

    const result = await recordComplaintResolution(complaint.id, {
      resolutionSummary: resolutionSummary.trim(),
      resolvedBy: resolvedByName.trim(),
      evidenceUrl: resolutionEvidenceUrl.trim() || null,
      resolutionSignOff: resolutionSignOff.trim(),
    });

    setIsSubmittingResolution(false);
    setConfirmResolutionModal(false);

    if (result.success) {
      setResolutionSummary('');
      setResolutionEvidenceUrl('');
      showToast({
        type: 'success',
        title: 'Complaint Resolved',
        message: `Case ${complaint.id} marked as resolved with verification evidence.`,
      });
      setActionMessage({
        type: 'success',
        text: `Complaint ${complaint.id} marked as RESOLVED with sign-off recorded.`,
      });
      if (onComplaintUpdated) onComplaintUpdated();
    } else {
      const errMsg = result.error || 'Failed to record resolution.';
      showToast({ type: 'error', title: 'Resolution Failed', message: errMsg });
      setActionMessage({ type: 'error', text: errMsg });
    }
  };

  // Handle AI Recommendation Adoption & Human Correction
  const handleApplyAiRecommendation = async () => {
    if (!ai || isApplyingAi) return;

    const isModified =
      customCategory !== ai.predictedCategory ||
      customPriority !== ai.estimatedPriority ||
      customDepartment !== ai.suggestedDepartment;

    setIsApplyingAi(true);

    const selectedCategoryObj = CIVIC_CATEGORIES.find((c) => c.id === customCategory);
    const categoryLabel = selectedCategoryObj?.label || customCategory;

    const recommendationPayload = {
      predictedCategory: customCategory,
      categoryLabel,
      estimatedPriority: customPriority,
      suggestedDepartment: customDepartment,
    };

    const correctionMeta = {
      isCorrection: isModified,
      originalPrediction: {
        predictedCategory: ai.predictedCategory,
        categoryLabel: ai.categoryLabel,
        estimatedPriority: ai.estimatedPriority,
        suggestedDepartment: ai.suggestedDepartment,
      },
      correctionReason: correctionReasonText.trim(),
    };

    const result = await applyAiRecommendation(complaint.id, recommendationPayload, correctionMeta);
    setIsApplyingAi(false);
    setConfirmAiModal(false);

    if (result.success) {
      showToast({
        type: 'success',
        title: isModified ? 'Human Correction Saved & Applied' : 'AI Recommendation Confirmed',
        message: isModified
          ? `Officer corrections recorded for case ${complaint.id} and feedback logged.`
          : `Case updated according to AI assessment.`,
      });
      setActionMessage({
        type: 'success',
        text: isModified
          ? 'Human corrections applied and recorded for model evaluation.'
          : 'AI-predicted category and department successfully applied and confirmed.',
      });
      if (onComplaintUpdated) onComplaintUpdated();
    } else {
      showToast({
        type: 'error',
        title: 'Failed to Apply',
        message: result.error || 'Could not apply AI recommendation.',
      });
    }
  };

  // Handle Duplicate Candidate Review Trigger
  const handleTriggerDuplicateAction = (candidate, actionType) => {
    setDuplicateActionCandidate(candidate);
    setDuplicateActionType(actionType);
    setDuplicateReason(
      actionType === 'confirm_duplicate'
        ? 'Duplicate verified on municipal map. Identical defect reported at same coordinates.'
        : 'Inspection confirms this is an independent defect on opposite lane/junction.'
    );
    setConfirmDuplicateModal(true);
  };

  // Execute Duplicate Confirmation or Dismissal
  const handleConfirmDuplicateAction = async () => {
    if (!duplicateActionCandidate || !duplicateActionType || isResolvingDuplicate) return;
    setIsResolvingDuplicate(true);

    const result = await resolveDuplicateCandidate(complaint.id, {
      candidateId: duplicateActionCandidate.id,
      action: duplicateActionType,
      reason: duplicateReason.trim(),
    });

    setIsResolvingDuplicate(false);
    setConfirmDuplicateModal(false);

    if (result.success) {
      showToast({
        type: 'success',
        title: duplicateActionType === 'confirm_duplicate' ? 'Duplicate Confirmed' : 'Match Dismissed',
        message: result.message,
      });
      if (onComplaintUpdated) onComplaintUpdated();
    } else {
      showToast({
        type: 'error',
        title: 'Action Failed',
        message: result.error || 'Could not process duplicate determination.',
      });
    }
  };

  // Handle Administrator Override
  const handleConfirmAdminOverride = async () => {
    if (!adminOverrideReason.trim() || isSubmittingAdminOverride) return;
    setIsSubmittingAdminOverride(true);

    const result = await adminOverrideComplaint(complaint.id, {
      status: adminOverrideStatus || undefined,
      priority: adminOverridePriority || undefined,
      department: adminOverrideDept || undefined,
      reason: adminOverrideReason.trim(),
    });

    setIsSubmittingAdminOverride(false);
    setConfirmAdminOverrideModal(false);

    if (result.success) {
      setAdminOverrideReason('');
      setAdminOverrideStatus('');
      setAdminOverridePriority('');
      setAdminOverrideDept('');
      showToast({
        type: 'success',
        title: 'Admin Override Applied',
        message: `Administrative override logged for case ${complaint.id}.`,
      });
      setActionMessage({
        type: 'success',
        text: `Administrative override applied to ${complaint.id} and logged in municipal audit trail.`,
      });
      if (onComplaintUpdated) onComplaintUpdated();
    } else {
      const errMsg = result.error || 'Failed to execute administrative override.';
      showToast({ type: 'error', title: 'Override Failed', message: errMsg });
      setActionMessage({ type: 'error', text: errMsg });
    }
  };

  // Backdrop click handler
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-complaint-title"
        onClick={handleBackdropClick}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
      >
        <div className="bg-[#FFFDF9] rounded-3xl max-w-4xl w-full max-h-[92vh] shadow-2xl border border-[#E5DAC4] flex flex-col text-left overflow-hidden">
          {/* SECTION 1: HEADER & IDENTITY */}
          <div className="p-5 sm:p-6 border-b border-[#EBE3D0] bg-[#FAF5EC] flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-md border border-emerald-300">
                  {complaint.id}
                </span>
                <StatusBadge status={complaint.status} />
                <PriorityBadge priority={complaint.priority} />
                {complaint.category && (
                  <span className="text-xs font-semibold text-stone-700 bg-stone-200/60 px-2 py-0.5 rounded-md border border-stone-300">
                    {complaint.categoryLabel || complaint.category}
                  </span>
                )}
                <span className="text-xs text-stone-500 font-medium ml-1">
                  Reported {formatDate(complaint.createdAt)}
                </span>
              </div>
              <h2
                id="modal-complaint-title"
                className="text-lg sm:text-xl font-extrabold text-stone-900 tracking-tight"
              >
                {complaint.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border border-[#D8CEBA] bg-white hover:bg-[#FAF6ED] text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
              aria-label="Close complaint details"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* TAB NAVIGATION */}
          <div className="flex items-center gap-1 sm:gap-2 px-4 sm:px-6 pt-3 border-b border-[#EBE3D0] bg-[#FFFDF9] text-xs font-bold text-stone-600 overflow-x-auto">
            <button
              type="button"
              data-tab="overview"
              onClick={() => setActiveTab('overview')}
              className={`pb-2.5 px-3 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'overview'
                  ? 'border-emerald-700 text-emerald-800 font-extrabold'
                  : 'border-transparent hover:text-stone-900'
              }`}
            >
              Overview &amp; Evidence
            </button>
            <button
              type="button"
              data-tab="ai_analysis"
              onClick={() => setActiveTab('ai_analysis')}
              className={`pb-2.5 px-3 border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ai_analysis'
                  ? 'border-emerald-700 text-emerald-800 font-extrabold'
                  : 'border-transparent hover:text-stone-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>AI Analysis</span>
              {ai && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              )}
            </button>
            <button
              type="button"
              data-tab="timeline"
              onClick={() => setActiveTab('timeline')}
              className={`pb-2.5 px-3 border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'timeline'
                  ? 'border-emerald-700 text-emerald-800 font-extrabold'
                  : 'border-transparent hover:text-stone-900'
              }`}
            >
              <History className="w-3.5 h-3.5 text-stone-500" />
              <span>Progress Timeline</span>
            </button>
            <button
              type="button"
              data-tab="updates"
              onClick={() => setActiveTab('updates')}
              className={`pb-2.5 px-3 border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'updates'
                  ? 'border-emerald-700 text-emerald-800 font-extrabold'
                  : 'border-transparent hover:text-stone-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-teal-600" />
              <span>Updates &amp; Notes</span>
              {complaint.additionalInfoRequested && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>
            {isCommittee && (
              <button
                type="button"
                data-tab="actions"
                onClick={() => setActiveTab('actions')}
                className={`pb-2.5 px-3 border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'actions'
                    ? 'border-emerald-700 text-emerald-800 font-extrabold'
                    : 'border-transparent hover:text-stone-900'
                }`}
              >
                <Wrench className="w-3.5 h-3.5 text-stone-600" />
                <span>Officer Actions</span>
                {complaint.status === 'submitted' && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </button>
            )}
            {isAdmin && (
              <button
                type="button"
                data-tab="admin"
                onClick={() => setActiveTab('admin')}
                className={`pb-2.5 px-3 border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'admin'
                    ? 'border-purple-700 text-purple-900 font-extrabold'
                    : 'border-transparent hover:text-stone-900'
                }`}
              >
                <Settings className="w-3.5 h-3.5 text-purple-600" />
                <span>Admin Controls</span>
              </button>
            )}
          </div>

          {/* ACTION FEEDBACK NOTIFICATION */}
          {actionMessage && (
            <div
              className={`px-6 py-2.5 text-xs font-semibold flex items-center gap-2 ${
                actionMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-b border-rose-200'
              }`}
            >
              {actionMessage.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{actionMessage.text}</span>
            </div>
          )}

          {/* SCROLLABLE MODAL CONTENT BODY */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
            {/* TAB 1: OVERVIEW & EVIDENCE */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Additional Info Requested Notice Banner */}
                {complaint.additionalInfoRequested && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5">
                      <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        <strong>Action Needed:</strong> The municipal desk requested supplementary information:{' '}
                        <em>{complaint.additionalInfoNote || 'Please supply additional details or photos.'}</em>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('updates')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold transition-colors cursor-pointer self-start sm:self-auto shrink-0"
                    >
                      <span>Supply Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Duplicate Alert Banner if active duplicates flagged */}
                {ai?.duplicateCandidates?.some((c) => !c.isDismissed) && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        <strong>Potential Duplicate Detected:</strong>{' '}
                        {ai.duplicateCandidates.filter((c) => !c.isDismissed).length} duplicate candidate flagged by spatial and semantic AI triage.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('ai_analysis')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold transition-colors cursor-pointer self-start sm:self-auto shrink-0"
                    >
                      <span>Review in AI Tab</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* 1. Complaint Key Information Card */}
                <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#EBE3D0]">
                  <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">
                    Complaint Summary
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[11px] text-stone-400 block font-semibold">Category</span>
                      <span className="font-bold text-stone-800">
                        {complaint.categoryLabel || complaint.category}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-stone-400 block font-semibold">Priority</span>
                      <div className="mt-0.5">
                        <PriorityBadge priority={complaint.priority} />
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] text-stone-400 block font-semibold">Reporter</span>
                      <span className="font-bold text-stone-800 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-stone-400" />
                        {complaint.reporterName || 'Registered Citizen'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-stone-400 block font-semibold">SLA Deadline</span>
                      <span className="font-mono font-bold text-stone-800">
                        {complaint.slaDeadline ? formatDate(complaint.slaDeadline) : 'Standard 72h'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Grievance Description */}
                <div>
                  <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                    Citizen Grievance Description
                  </h4>
                  <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#E2D8C3] text-stone-800 leading-relaxed text-xs sm:text-sm">
                    {complaint.description}
                  </div>
                </div>

                {/* 3. Location & Department Assignment Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Location Details */}
                  <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#EBE3D0] space-y-2">
                    <div className="flex items-center justify-between text-stone-800 font-bold text-xs">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                        <span>Incident Location</span>
                      </div>
                      {complaint.location?.latitude && (
                        <span className="text-[10px] font-mono text-stone-400">
                          {complaint.location.latitude.toFixed(4)}, {complaint.location.longitude.toFixed(4)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-700 font-medium">
                      {complaint.location?.address || 'Bengaluru City'}
                    </p>
                    {complaint.location?.landmark && (
                      <p className="text-[11px] text-stone-500">
                        <strong>Landmark:</strong> {complaint.location.landmark}
                      </p>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      {complaint.location?.ward && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
                          {complaint.location.ward}
                        </span>
                      )}
                      {complaint.location?.zone && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {complaint.location.zone}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Department Assignment Details */}
                  <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#EBE3D0] space-y-2">
                    <div className="flex items-center gap-1.5 text-stone-800 font-bold text-xs">
                      <Building className="w-4 h-4 text-teal-600" />
                      <span>Department Assignment</span>
                    </div>
                    <p className="text-xs font-bold text-stone-800">
                      {complaint.assignedDepartment || complaint.department || 'Pending Municipal Review'}
                    </p>
                    <p className="text-[11.5px] text-stone-600">
                      <strong>Assigned Desk:</strong>{' '}
                      {complaint.assignedOfficer || complaint.assignedTo || 'Unassigned (Awaiting Review)'}
                    </p>
                    <div className="pt-1">
                      <span className="text-[10px] font-mono text-stone-500">
                        Jurisdiction: East Zone Engineering Cell
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Citizen-Uploaded Photographic Evidence */}
                <div>
                  <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                    Citizen-Uploaded Photographic Evidence
                  </h4>
                  {complaint.hasAttachment && complaint.attachmentUrl ? (
                    <div className="relative rounded-2xl overflow-hidden border border-[#EBE3D0] max-h-72 bg-black/5 group">
                      <img
                        src={complaint.attachmentUrl}
                        alt={`Evidence for ${complaint.id}`}
                        className="w-full h-full object-cover max-h-72"
                      />
                      <button
                        type="button"
                        onClick={() => handleOpenLightbox(complaint.attachmentUrl)}
                        className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-stone-900/80 hover:bg-stone-900 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-xs transition-colors cursor-pointer"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Enlarge Photo</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-6 rounded-2xl bg-[#FAF6EE] border border-dashed border-[#D8CEBA] text-center text-xs text-stone-500">
                      No photographic evidence attached with this complaint submission.
                    </div>
                  )}
                </div>

                {/* 5. Resolution Notes & Evidence Card (Visible when resolved) */}
                {(complaint.status === 'resolved' || complaint.resolution) && (
                  <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-300 space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                      <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                        Official Resolution Notes &amp; Remediation Evidence
                      </h4>
                    </div>

                    <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                      {complaint.resolution?.summary ||
                        'Issue inspected and verified resolved on-site by municipal engineering authority.'}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-emerald-200 text-[11px]">
                      <div>
                        <span className="text-emerald-700 font-semibold block">Resolved By</span>
                        <span className="font-bold text-emerald-950">
                          {complaint.resolution?.resolvedBy || complaint.assignedOfficer || 'Zonal Authority'}
                        </span>
                      </div>
                      <div>
                        <span className="text-emerald-700 font-semibold block">Resolution Date</span>
                        <span className="font-bold text-emerald-950">
                          {complaint.resolution?.resolvedAt
                            ? formatDate(complaint.resolution.resolvedAt)
                            : complaint.updatedAt
                            ? formatDate(complaint.updatedAt)
                            : 'Completed'}
                        </span>
                      </div>
                      <div>
                        <span className="text-emerald-700 font-semibold block">Sign-off Verification</span>
                        <span className="font-bold text-emerald-950">
                          {complaint.resolution?.resolutionSignOff || 'Verified on-site'}
                        </span>
                      </div>
                    </div>

                    {complaint.resolution?.evidenceUrl && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => handleOpenLightbox(complaint.resolution.evidenceUrl)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>View Resolution Proof Photo</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: AI ANALYSIS */}
            {activeTab === 'ai_analysis' && (
              <div className="space-y-6">
                {ai ? (
                  <div className="space-y-4">
                    {/* Header Banner */}
                    <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0">
                          <Bot className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-emerald-950 block">
                            CivicFix AI Automated Inference Summary
                          </span>
                          <span className="text-[11px] text-emerald-800">
                            Engine: {ai.modelVersion || 'Vision-v2.4'} &bull; Analyzed{' '}
                            {ai.analyzedAt ? formatDate(ai.analyzedAt) : 'at intake'}
                          </span>
                        </div>
                      </div>

                      {/* Confirmation Badge */}
                      {isAiConfirmed ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 shrink-0">
                          <ShieldCheck className="w-4 h-4 text-emerald-700" />
                          <span>Confirmed Administrative Decision</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                          <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                          <span>AI-Generated Suggestion (Unverified)</span>
                        </span>
                      )}
                    </div>

                    {/* AI Assessment Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Predicted Category */}
                      <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#EBE3D0] space-y-1">
                        <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                          AI Predicted Category
                        </span>
                        <div className="text-sm font-extrabold text-stone-900">
                          {ai.categoryLabel || ai.predictedCategory}
                        </div>
                        <p className="text-[11px] text-stone-500">
                          Model classification based on complaint text and image analysis.
                        </p>
                      </div>

                      {/* Estimated Severity & SLA */}
                      <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#EBE3D0] space-y-1">
                        <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                          Estimated Severity &amp; Priority
                        </span>
                        <div className="flex items-center gap-2 pt-0.5">
                          <PriorityBadge priority={ai.estimatedPriority} />
                          <span className="text-xs text-stone-600 font-semibold">
                            {ai.estimatedPriority === 'critical' ? 'Urgent < 6h turnaround' : '24h SLA target'}
                          </span>
                        </div>
                        {confidencePercent !== null && (
                          <div className="pt-2 flex items-center gap-2">
                            <span className="text-[11px] text-stone-500 font-medium">Confidence:</span>
                            <span className="text-xs font-mono font-bold text-emerald-800">
                              {confidencePercent}%
                            </span>
                            <div className="flex-1 max-w-[120px] bg-stone-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-600 h-full rounded-full"
                                style={{ width: `${confidencePercent}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Suggested Department */}
                      <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#EBE3D0] space-y-1">
                        <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                          Suggested Department
                        </span>
                        <div className="text-xs font-bold text-stone-900">
                          {ai.suggestedDepartment}
                        </div>
                        <p className="text-[11px] text-stone-500">
                          Jurisdiction determined by zonal mapping and infrastructure type.
                        </p>
                      </div>

                      {/* Recommended Action */}
                      <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#EBE3D0] space-y-1">
                        <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                          Recommended Next Action
                        </span>
                        <p className="text-xs font-medium text-stone-800 leading-relaxed">
                          {ai.recommendedAction}
                        </p>
                      </div>
                    </div>

                    {/* Human Review & Correction Mode for Committee */}
                    {isCommittee && !isAiConfirmed && (
                      <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#E2D8C3] space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h5 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                              <Edit3 className="w-3.5 h-3.5 text-stone-600" />
                              <span>Human Review &amp; Recommendation Verification</span>
                            </h5>
                            <p className="text-[11.5px] text-stone-600 mt-0.5">
                              Verify or adjust the model's suggested categorization and routing before confirming the work order.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => setIsModifyingAi(!isModifyingAi)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 text-xs font-bold transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-emerald-700" />
                            <span>{isModifyingAi ? 'Collapse Adjustments' : 'Modify Recommendation'}</span>
                          </button>
                        </div>

                        {/* Editable Form Controls */}
                        {isModifyingAi && (
                          <div className="pt-3 border-t border-[#E2D8C3] space-y-3 animate-fadeIn">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {/* Category Correction */}
                              <div>
                                <label
                                  htmlFor="modal-correct-category"
                                  className="block text-[11px] font-bold text-stone-700 mb-1"
                                >
                                  Corrected Category
                                </label>
                                <select
                                  id="modal-correct-category"
                                  value={customCategory}
                                  onChange={(e) => setCustomCategory(e.target.value)}
                                  className="w-full p-2 rounded-xl bg-white border border-[#D8CEBA] text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                                >
                                  {CIVIC_CATEGORIES.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Priority Correction */}
                              <div>
                                <label
                                  htmlFor="modal-correct-priority"
                                  className="block text-[11px] font-bold text-stone-700 mb-1"
                                >
                                  Assigned Urgency / Priority
                                </label>
                                <select
                                  id="modal-correct-priority"
                                  value={customPriority}
                                  onChange={(e) => setCustomPriority(e.target.value)}
                                  className="w-full p-2 rounded-xl bg-white border border-[#D8CEBA] text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                                >
                                  <option value="critical">Critical (&lt; 6h SLA)</option>
                                  <option value="high">High (24h SLA)</option>
                                  <option value="medium">Medium (72h SLA)</option>
                                  <option value="low">Low (Standard Triage)</option>
                                </select>
                              </div>

                              {/* Department Routing Correction */}
                              <div>
                                <label
                                  htmlFor="modal-correct-department"
                                  className="block text-[11px] font-bold text-stone-700 mb-1"
                                >
                                  Responsible Authority
                                </label>
                                <select
                                  id="modal-correct-department"
                                  value={customDepartment}
                                  onChange={(e) => setCustomDepartment(e.target.value)}
                                  className="w-full p-2 rounded-xl bg-white border border-[#D8CEBA] text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                                >
                                  {MOCK_ADMIN_AUTHORITIES.map((auth) => (
                                    <option key={auth.id} value={`${auth.name} - ${auth.department}`}>
                                      {auth.department}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* Correction Rationale */}
                            <div>
                              <label
                                htmlFor="modal-correction-reason"
                                className="block text-[11px] font-bold text-stone-700 mb-1"
                              >
                                Officer Correction Rationale / Retraining Feedback
                              </label>
                              <textarea
                                id="modal-correction-reason"
                                rows={2}
                                value={correctionReasonText}
                                onChange={(e) => setCorrectionReasonText(e.target.value)}
                                placeholder="Explain why the AI category, priority, or department was adjusted..."
                                className="w-full p-2.5 rounded-xl bg-white border border-[#D8CEBA] text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Duplicate Candidates Section */}
                    {ai.duplicateCandidates && ai.duplicateCandidates.length > 0 && (
                      <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-300 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Copy className="w-4 h-4 text-amber-700" />
                            <h5 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                              Duplicate Grievance Candidates ({ai.duplicateCandidates.filter((c) => !c.isDismissed).length} active)
                            </h5>
                          </div>
                          <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-300">
                            Officer Determination Required &bull; Never Automatically Merged
                          </span>
                        </div>

                        <div className="space-y-3">
                          {ai.duplicateCandidates.map((cand) => {
                            const similarityPct = Math.round(
                              cand.similarityScore <= 1 ? cand.similarityScore * 100 : cand.similarityScore
                            );
                            return (
                              <div
                                key={cand.id}
                                className={`p-3.5 rounded-xl bg-white border transition-all ${
                                  cand.isDismissed
                                    ? 'border-stone-200 bg-stone-50 opacity-60'
                                    : 'border-amber-200 shadow-2xs'
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                                        {cand.id}
                                      </span>
                                      <span className="inline-flex items-center text-[11px] font-mono font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                                        {similarityPct}% match
                                      </span>
                                      <span className="text-stone-400">&bull;</span>
                                      <span className="text-xs text-stone-600 capitalize">
                                        Status: {cand.status?.replace('_', ' ')}
                                      </span>
                                    </div>
                                    <div className="text-xs font-bold text-stone-900">{cand.title}</div>
                                    <div className="text-[11.5px] text-stone-600 flex items-center gap-1.5">
                                      <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                      <span>
                                        {cand.location?.address} ({cand.location?.ward})
                                      </span>
                                    </div>
                                  </div>

                                  {/* Candidate Actions */}
                                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                                    {cand.isDismissed ? (
                                      <span className="text-xs font-semibold text-stone-500 bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200">
                                        Dismissed by Officer
                                      </span>
                                    ) : isCommittee ? (
                                      <>
                                        <button
                                          type="button"
                                          disabled={isResolvingDuplicate}
                                          onClick={() => handleTriggerDuplicateAction(cand, 'confirm_duplicate')}
                                          className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                                        >
                                          Confirm Duplicate
                                        </button>
                                        <button
                                          type="button"
                                          disabled={isResolvingDuplicate}
                                          onClick={() => handleTriggerDuplicateAction(cand, 'dismiss_duplicate')}
                                          className="px-3 py-1.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                                        >
                                          Dismiss Match
                                        </button>
                                      </>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Officer Action Bar for AI */}
                    {isCommittee && !isAiConfirmed && (
                      <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#E2D8C3] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="text-xs text-stone-700">
                          {customCategory !== ai.predictedCategory ||
                          customPriority !== ai.estimatedPriority ||
                          customDepartment !== ai.suggestedDepartment ? (
                            <span className="text-emerald-800 font-bold flex items-center gap-1">
                              <Check className="w-4 h-4 text-emerald-600" />
                              <span>Human modification active. Changes will be logged for AI retraining.</span>
                            </span>
                          ) : (
                            <span>
                              <strong>Advisory Notice:</strong> Review and verify the AI recommendations above before dispatching municipal crews.
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={isApplyingAi}
                          onClick={() => setConfirmAiModal(true)}
                          className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                          <span>
                            {isApplyingAi
                              ? 'Applying...'
                              : customCategory !== ai.predictedCategory ||
                                customPriority !== ai.estimatedPriority ||
                                customDepartment !== ai.suggestedDepartment
                              ? 'Save Human Correction & Apply'
                              : 'Confirm & Apply Recommendation'}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 rounded-3xl bg-[#FAF6EE] border border-[#E2D8C3] text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 mx-auto flex items-center justify-center">
                      <Cpu className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-stone-900">
                      AI Inference Not Integrated / Pending for this Case
                    </h4>
                    <p className="text-xs text-stone-600 max-w-md mx-auto">
                      Automated classification results have not been returned yet by the backend AI service.
                    </p>
                    <div className="p-3 rounded-xl bg-white border border-[#E2D8C3] text-stone-700 font-mono text-[11px] max-w-lg mx-auto text-left">
                      Expected Endpoint: <code>GET /api/v1/complaints/{complaint.id}/ai-insights</code>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: PROGRESS TIMELINE */}
            {activeTab === 'timeline' && (
              <div>
                <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-4">
                  Authentic Resolution Progress Workflow
                </h4>
                <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#EBE3D0]">
                  <ComplaintTimeline timeline={complaint.timeline || []} complaint={complaint} />
                </div>
              </div>
            )}

            {/* TAB 4: UPDATES & NOTES */}
            {activeTab === 'updates' && (
              <div className="space-y-6">
                {/* Citizen Action: Provide Additional Information */}
                {isCitizen && (
                  <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-300 space-y-3">
                    <div className="flex items-center gap-2">
                      <PlusCircle className="w-4 h-4 text-amber-700" />
                      <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                        Provide Additional Information or Clarification
                      </h4>
                    </div>
                    <p className="text-xs text-amber-800">
                      Add details, landmark references, or updated photos to assist municipal crews in locating and remediating the issue.
                    </p>
                    <form onSubmit={handleSubmitCitizenInfo} className="space-y-3 pt-1">
                      <textarea
                        rows={2}
                        value={citizenRemarks}
                        onChange={(e) => setCitizenRemarks(e.target.value)}
                        placeholder="Type additional details or clarify the situation..."
                        className="w-full p-2.5 rounded-xl bg-white border border-amber-300 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="url"
                          value={citizenAttachmentUrl}
                          onChange={(e) => setCitizenAttachmentUrl(e.target.value)}
                          placeholder="Supplementary photo URL (Optional)..."
                          className="flex-1 p-2 rounded-xl bg-white border border-amber-300 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <button
                          type="submit"
                          disabled={isSubmittingCitizenInfo || !citizenRemarks.trim()}
                          className="px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer transition-colors shrink-0"
                        >
                          {isSubmittingCitizenInfo ? 'Submitting...' : 'Submit Clarification'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Officer Action: Post Note / Public Update */}
                {!isCitizen && (
                  <form onSubmit={handleAddNote} className="space-y-3">
                    <label
                      htmlFor="note-update-text"
                      className="block text-xs font-bold text-stone-700 uppercase tracking-wider"
                    >
                      Post Progress Update or Officer Inspection Remark
                    </label>
                    <textarea
                      id="note-update-text"
                      rows={3}
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      placeholder="Enter inspection remarks, contractor coordination logs, or citizen feedback..."
                      className="w-full p-3 rounded-2xl bg-[#FAF6EE] border border-[#E2D8C3] text-xs text-stone-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />

                    <div className="flex items-center justify-between gap-3">
                      {canAddInternalNotes ? (
                        <label
                          htmlFor="internal-note-check"
                          className="flex items-center gap-2 text-xs font-semibold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 cursor-pointer"
                        >
                          <input
                            id="internal-note-check"
                            type="checkbox"
                            checked={isNoteInternal}
                            onChange={(e) => setIsNoteInternal(e.target.checked)}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <Lock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Internal Note (Restricted from citizen)</span>
                        </label>
                      ) : (
                        <span className="text-[11px] text-stone-500">Citizen-visible inquiry</span>
                      )}

                      <button
                        type="submit"
                        disabled={isSubmittingNote || !newNoteText.trim()}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs disabled:opacity-50 transition-all cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isSubmittingNote ? 'Posting...' : 'Post Update'}</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Public Updates List */}
                <div>
                  <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">
                    Public Citizen Updates &amp; Communications
                  </h4>
                  {(!complaint.updates && !complaint.publicUpdates) ||
                  ((complaint.updates?.length || 0) + (complaint.publicUpdates?.length || 0) === 0) ? (
                    <p className="text-xs text-stone-400 italic">No public updates posted yet.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {(complaint.updates || complaint.publicUpdates || []).map((u, i) => (
                        <div
                          key={u.id || i}
                          className="p-3.5 rounded-2xl bg-[#FFFDF9] border border-[#EBE3D0] space-y-1"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-stone-900 flex items-center gap-1.5">
                              <Globe className="w-3.5 h-3.5 text-teal-600" />
                              {u.author || 'Official Update'}
                            </span>
                            <span className="text-stone-400">{formatDate(u.timestamp)}</span>
                          </div>
                          <p className="text-xs text-stone-700">{u.message || u.text}</p>
                          {u.attachmentUrl && (
                            <div className="pt-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenLightbox(u.attachmentUrl)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                              >
                                <Camera className="w-3 h-3" />
                                <span>Attached Photo Evidence</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Internal Notes Section (Restricted from Citizens) */}
                {!isCitizen && canAddInternalNotes && (
                  <div className="pt-4 border-t border-[#EBE3D0]">
                    <div className="flex items-center gap-2 mb-3">
                      <Lock className="w-4 h-4 text-amber-600" />
                      <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                        Internal Committee Notes (Restricted from citizen)
                      </h4>
                    </div>

                    {!complaint.internalNotes || complaint.internalNotes.length === 0 ? (
                      <p className="text-xs text-stone-400 italic">No internal notes on record.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {complaint.internalNotes.map((n, i) => (
                          <div
                            key={n.id || i}
                            className={`p-3.5 rounded-2xl border space-y-1 ${
                              n.isAdminAudit
                                ? 'bg-purple-50/70 border-purple-200 text-purple-950'
                                : 'bg-amber-50/70 border-amber-200/80 text-amber-950'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                                {n.author}
                              </span>
                              <span className="opacity-70">{formatDate(n.timestamp)}</span>
                            </div>
                            <p className="text-xs leading-relaxed">{n.text || n.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: OFFICER ACTIONS */}
            {activeTab === 'actions' && isCommittee && (
              <div className="space-y-6">
                {/* Action 1: Quick Accept */}
                {complaint.status === 'submitted' && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                        Accept Complaint for Review
                      </h4>
                      <p className="text-xs text-amber-800 mt-0.5">
                        Transition this unreviewed grievance into formal municipal triage and inspection.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isAccepting}
                      onClick={handleQuickAccept}
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {isAccepting ? 'Accepting...' : 'Accept Complaint'}
                    </button>
                  </div>
                )}

                {/* Action 2: Workflow Status Transition */}
                {canUpdateStatus && (
                  <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#EBE3D0] space-y-3">
                    <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                      Workflow Status Transition
                    </h4>
                    <p className="text-xs text-stone-600">
                      Update the official status of this complaint according to field inspection milestones.
                    </p>

                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <select
                          id="target-status-select"
                          value={targetStatus}
                          onChange={(e) => setTargetStatus(e.target.value)}
                          className="p-2.5 rounded-xl bg-[#FAF6EE] border border-[#E2D8C3] text-xs font-semibold text-stone-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        >
                          <option value={COMPLAINT_STATUS.SUBMITTED}>Submitted</option>
                          <option value={COMPLAINT_STATUS.UNDER_REVIEW}>Under Review</option>
                          <option value={COMPLAINT_STATUS.ASSIGNED}>Assigned</option>
                          <option value={COMPLAINT_STATUS.IN_PROGRESS}>In Progress</option>
                          {canVerifyResolution && (
                            <option value={COMPLAINT_STATUS.RESOLVED}>Mark as Resolved</option>
                          )}
                          <option value={COMPLAINT_STATUS.REJECTED}>Reject Complaint</option>
                        </select>

                        <button
                          type="button"
                          disabled={isSubmittingStatus}
                          onClick={() => setConfirmStatusModal(true)}
                          className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          Apply Status Change
                        </button>
                      </div>

                      <input
                        id="status-transition-reason"
                        type="text"
                        placeholder="Transition reason / inspection remarks..."
                        value={statusReason}
                        onChange={(e) => setStatusReason(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-[#FAF6EE] border border-[#E2D8C3] text-xs text-stone-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                  </div>
                )}

                {/* Action 3: Authority / Department Forwarding */}
                {canForward && (
                  <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#EBE3D0] space-y-3">
                    <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                      Assign / Dispatch to Municipal Department
                    </h4>
                    <p className="text-xs text-stone-600">
                      Forward this case to a verified authority department and assign an engineering officer.
                    </p>

                    <div className="space-y-3">
                      <select
                        id="authority-assign-select"
                        value={selectedAuthorityId}
                        onChange={(e) => setSelectedAuthorityId(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-[#FAF6EE] border border-[#E2D8C3] text-xs font-semibold text-stone-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      >
                        <option value="">Select Verified Municipal Department...</option>
                        {MOCK_ADMIN_AUTHORITIES.map((auth) => (
                          <option key={auth.id} value={auth.id}>
                            {auth.name} — {auth.department}
                          </option>
                        ))}
                      </select>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <input
                          type="text"
                          placeholder="Specific Officer or Desk (Optional)..."
                          value={assignedOfficerInput}
                          onChange={(e) => setAssignedOfficerInput(e.target.value)}
                          className="flex-1 p-2.5 rounded-xl bg-[#FAF6EE] border border-[#E2D8C3] text-xs text-stone-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />

                        <button
                          type="button"
                          disabled={!selectedAuthorityId || isSubmittingForward}
                          onClick={() => setConfirmForwardModal(true)}
                          className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer shrink-0"
                        >
                          Dispatch Case
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action 4: Request Additional Information from Citizen */}
                <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#EBE3D0] space-y-3">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-amber-600" />
                    <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                      Request Additional Information from Citizen
                    </h4>
                  </div>
                  <p className="text-xs text-stone-600">
                    Send an official query prompting the citizen to supply more details or photos.
                  </p>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <input
                      type="text"
                      placeholder="e.g. Please provide exact landmark or cross street name..."
                      value={infoRequestQuery}
                      onChange={(e) => setInfoRequestQuery(e.target.value)}
                      className="flex-1 p-2.5 rounded-xl bg-[#FAF6EE] border border-[#E2D8C3] text-xs text-stone-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                    <button
                      type="button"
                      disabled={!infoRequestQuery.trim() || isSubmittingInfoRequest}
                      onClick={() => setConfirmRequestInfoModal(true)}
                      className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      Publish Query
                    </button>
                  </div>
                </div>

                {/* Action 5: Record Resolution Details & Evidence */}
                {canVerifyResolution && (
                  <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-300 space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                        Record Resolution Details &amp; Completion Evidence
                      </h4>
                    </div>
                    <p className="text-xs text-emerald-800">
                      Close this complaint by recording the completed remediation notes, resolving officer, and proof photograph.
                    </p>

                    <div className="space-y-3">
                      <div>
                        <label
                          htmlFor="resolution-summary-text"
                          className="block text-[11px] font-bold text-emerald-900 mb-1"
                        >
                          Remediation Summary Notes
                        </label>
                        <textarea
                          id="resolution-summary-text"
                          rows={2}
                          value={resolutionSummary}
                          onChange={(e) => setResolutionSummary(e.target.value)}
                          placeholder="Describe the completed physical repair, materials used, and on-site testing..."
                          className="w-full p-2.5 rounded-xl bg-white border border-emerald-300 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label
                            htmlFor="resolved-by-input"
                            className="block text-[11px] font-bold text-emerald-900 mb-1"
                          >
                            Resolved By / Contractor
                          </label>
                          <input
                            id="resolved-by-input"
                            type="text"
                            value={resolvedByName}
                            onChange={(e) => setResolvedByName(e.target.value)}
                            className="w-full p-2 rounded-xl bg-white border border-emerald-300 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="resolution-signoff-input"
                            className="block text-[11px] font-bold text-emerald-900 mb-1"
                          >
                            Sign-off Verification
                          </label>
                          <input
                            id="resolution-signoff-input"
                            type="text"
                            value={resolutionSignOff}
                            onChange={(e) => setResolutionSignOff(e.target.value)}
                            className="w-full p-2 rounded-xl bg-white border border-emerald-300 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="resolution-evidence-input"
                            className="block text-[11px] font-bold text-emerald-900 mb-1"
                          >
                            Completion Photo URL (Optional)
                          </label>
                          <input
                            id="resolution-evidence-input"
                            type="url"
                            placeholder="https://..."
                            value={resolutionEvidenceUrl}
                            onChange={(e) => setResolutionEvidenceUrl(e.target.value)}
                            className="w-full p-2 rounded-xl bg-white border border-emerald-300 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!resolutionSummary.trim() || isSubmittingResolution}
                        onClick={() => setConfirmResolutionModal(true)}
                        className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer transition-colors"
                      >
                        Record Resolution &amp; Mark Resolved
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 6: ADMINISTRATOR CONTROLS */}
            {activeTab === 'admin' && isAdmin && (
              <div className="space-y-6">
                {/* Admin Status & Department Override */}
                <div className="p-5 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-purple-700" />
                    <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wider">
                      Administrative Override Controls
                    </h4>
                  </div>
                  <p className="text-xs text-purple-800">
                    Administrators have elevated authority to override status, priority, or routing. All overrides are recorded permanently with audit justifications.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="admin-override-status" className="block text-[11px] font-bold text-purple-900 mb-1">
                        Override Status
                      </label>
                      <select
                        id="admin-override-status"
                        value={adminOverrideStatus}
                        onChange={(e) => setAdminOverrideStatus(e.target.value)}
                        className="w-full p-2 rounded-xl bg-white border border-purple-200 text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                      >
                        <option value="">Leave Unchanged ({complaint.status})</option>
                        <option value="submitted">Submitted</option>
                        <option value="under_review">Under Review</option>
                        <option value="assigned">Assigned</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="admin-override-priority" className="block text-[11px] font-bold text-purple-900 mb-1">
                        Override Priority
                      </label>
                      <select
                        id="admin-override-priority"
                        value={adminOverridePriority}
                        onChange={(e) => setAdminOverridePriority(e.target.value)}
                        className="w-full p-2 rounded-xl bg-white border border-purple-200 text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                      >
                        <option value="">Leave Unchanged ({complaint.priority})</option>
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="admin-override-dept" className="block text-[11px] font-bold text-purple-900 mb-1">
                        Reassign Department
                      </label>
                      <select
                        id="admin-override-dept"
                        value={adminOverrideDept}
                        onChange={(e) => setAdminOverrideDept(e.target.value)}
                        className="w-full p-2 rounded-xl bg-white border border-purple-200 text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                      >
                        <option value="">Leave Unchanged</option>
                        {MOCK_ADMIN_AUTHORITIES.map((a) => (
                          <option key={a.id} value={`${a.name} - ${a.department}`}>
                            {a.department}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="admin-override-reason" className="block text-[11px] font-bold text-purple-900 mb-1">
                      Administrative Override Justification (Mandatory)
                    </label>
                    <textarea
                      id="admin-override-reason"
                      rows={2}
                      value={adminOverrideReason}
                      onChange={(e) => setAdminOverrideReason(e.target.value)}
                      placeholder="Specify the administrative or policy justification for this intervention..."
                      className="w-full p-2.5 rounded-xl bg-white border border-purple-200 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-purple-600"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={
                      !adminOverrideReason.trim() ||
                      (!adminOverrideStatus && !adminOverridePriority && !adminOverrideDept) ||
                      isSubmittingAdminOverride
                    }
                    onClick={() => setConfirmAdminOverrideModal(true)}
                    className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer transition-colors"
                  >
                    Execute Administrative Override
                  </button>
                </div>

                {/* System Audit Dossier & Metadata Inspection */}
                <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#EBE3D0] space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-stone-600" />
                    <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                      Municipal Ticket System Audit Metadata
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[11px] text-stone-400 block font-semibold">Ticket ID</span>
                      <span className="font-mono font-bold text-stone-900">{complaint.id}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-stone-400 block font-semibold">Registered At</span>
                      <span className="font-mono text-stone-700">{formatDate(complaint.createdAt)}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-stone-400 block font-semibold">Last Modified</span>
                      <span className="font-mono text-stone-700">{formatDate(complaint.updatedAt)}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-stone-400 block font-semibold">Reporter Channel</span>
                      <span className="font-bold text-stone-700">CivicFix Mobile / Web</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-stone-400 block font-semibold">AI Model Engine</span>
                      <span className="font-mono text-stone-700">{ai?.modelVersion || 'Vision-v2.4'}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-stone-400 block font-semibold">Duplicate Check</span>
                      <span className="font-semibold text-emerald-800">
                        {ai?.duplicateCandidates?.length ? `${ai.duplicateCandidates.length} evaluated` : 'Passed / Clean'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-stone-400 block font-semibold">Ward / Zone</span>
                      <span className="font-semibold text-stone-800">
                        {complaint.location?.ward || 'Ward 150'} ({complaint.location?.zone || 'East'})
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-stone-400 block font-semibold">Current State</span>
                      <span className="font-bold text-emerald-800 capitalize">{complaint.status}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="p-4 sm:p-5 border-t border-[#EBE3D0] bg-[#FAF5EC] flex items-center justify-between">
            <span className="text-[11px] font-medium text-stone-500">
              CivicFix AI Case Management &bull; {isAdmin ? 'System Administrator' : isCommittee ? 'Zonal Desk' : 'Citizen Tracking Portal'}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#D8CEBA] bg-white hover:bg-[#FAF6ED] text-xs font-bold text-stone-700 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox / Fullscreen Evidence Image Modal */}
      {lightboxOpen && lightboxImageUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="absolute -top-10 right-0 text-white hover:text-stone-300 transition-colors p-2 cursor-pointer"
              aria-label="Close image lightbox"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={lightboxImageUrl}
              alt={`Evidence for ${complaint.id}`}
              className="max-h-[80vh] w-auto max-w-full object-contain rounded-2xl border border-white/20"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="text-white text-xs mt-3 text-center">
              <span>{complaint.id} &bull; Photographic Evidence</span>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Status Transition */}
      <ConfirmationDialog
        isOpen={confirmStatusModal}
        title={`Confirm Status Transition to ${targetStatus.toUpperCase()}`}
        message={`Are you sure you want to transition complaint ${complaint.id} to status "${targetStatus}"? This event will be recorded in the municipal audit logs.`}
        confirmLabel="Confirm Transition"
        onConfirm={handleConfirmStatusChange}
        onCancel={() => setConfirmStatusModal(false)}
        isDestructive={targetStatus === COMPLAINT_STATUS.REJECTED}
      />

      {/* Confirmation Dialog: Authority Forwarding */}
      <ConfirmationDialog
        isOpen={confirmForwardModal}
        title="Confirm Department Assignment"
        message={`Dispatch ticket ${complaint.id} to the selected municipal department? Work orders will be routed to their engineering roster.`}
        confirmLabel="Confirm Assignment"
        onConfirm={handleConfirmForward}
        onCancel={() => setConfirmForwardModal(false)}
      />

      {/* Confirmation Dialog: Apply AI Recommendation */}
      <ConfirmationDialog
        isOpen={confirmAiModal}
        title={
          customCategory !== ai?.predictedCategory ||
          customPriority !== ai?.estimatedPriority ||
          customDepartment !== ai?.suggestedDepartment
            ? 'Apply Human-Corrected Recommendation'
            : 'Apply AI-Generated Recommendation'
        }
        message={
          customCategory !== ai?.predictedCategory ||
          customPriority !== ai?.estimatedPriority ||
          customDepartment !== ai?.suggestedDepartment
            ? `Apply verified human adjustments to ${complaint.id}? This will set category to "${customCategory}", department to "${customDepartment}", and priority to "${customPriority}". Rationale will be logged for model evaluation.`
            : `Adopt AI recommendation for ${complaint.id}? This will assign the complaint to ${ai?.suggestedDepartment} with priority "${ai?.estimatedPriority}".`
        }
        confirmLabel="Adopt & Confirm"
        onConfirm={handleApplyAiRecommendation}
        onCancel={() => setConfirmAiModal(false)}
      />

      {/* Confirmation Dialog: Request Additional Information */}
      <ConfirmationDialog
        isOpen={confirmRequestInfoModal}
        title="Publish Information Request to Citizen"
        message={`Publish this clarification request to the citizen reporting ticket ${complaint.id}? A high-visibility prompt will appear on the citizen's tracking dashboard.`}
        confirmLabel="Publish Request"
        onConfirm={handleConfirmRequestInfo}
        onCancel={() => setConfirmRequestInfoModal(false)}
      />

      {/* Confirmation Dialog: Record Resolution */}
      <ConfirmationDialog
        isOpen={confirmResolutionModal}
        title="Confirm Grievance Resolution & Sign-off"
        message={`Mark complaint ${complaint.id} as RESOLVED? This will update the status to resolved, record the remediation summary, and complete the public progress tracker.`}
        confirmLabel="Confirm Resolution"
        onConfirm={handleConfirmResolution}
        onCancel={() => setConfirmResolutionModal(false)}
      />

      {/* Confirmation Dialog: Admin Override */}
      <ConfirmationDialog
        isOpen={confirmAdminOverrideModal}
        title="Confirm Administrative Override"
        message={`Apply administrative override to ticket ${complaint.id}? This will directly update the state and record an immutable audit entry.`}
        confirmLabel="Confirm Override"
        onConfirm={handleConfirmAdminOverride}
        onCancel={() => setConfirmAdminOverrideModal(false)}
        isDestructive={adminOverrideStatus === 'rejected'}
      />

      {/* Confirmation Dialog: Duplicate Candidate Action */}
      <ConfirmationDialog
        isOpen={confirmDuplicateModal}
        title={
          duplicateActionType === 'confirm_duplicate'
            ? `Confirm Ticket ${complaint.id} as Duplicate of ${duplicateActionCandidate?.id}`
            : `Dismiss Duplicate Flag for ${duplicateActionCandidate?.id}`
        }
        message={
          duplicateActionType === 'confirm_duplicate'
            ? `Are you sure you want to mark ticket ${complaint.id} as a verified duplicate of ${duplicateActionCandidate?.id}? The case will be marked as duplicate in the municipal audit trail. Primary case ${duplicateActionCandidate?.id} will retain precedence.`
            : `Dismiss duplicate match with ${duplicateActionCandidate?.id}? This will confirm ${complaint.id} as an independent grievance requiring separate field investigation.`
        }
        confirmLabel={
          duplicateActionType === 'confirm_duplicate'
            ? isResolvingDuplicate
              ? 'Confirming...'
              : 'Confirm Duplicate'
            : isResolvingDuplicate
            ? 'Dismissing...'
            : 'Dismiss Match'
        }
        onConfirm={handleConfirmDuplicateAction}
        onCancel={() => setConfirmDuplicateModal(false)}
        isDestructive={duplicateActionType === 'confirm_duplicate'}
      />
    </>
  );
}
