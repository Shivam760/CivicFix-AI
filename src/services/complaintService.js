/**
 * src/services/complaintService.js
 * 
 * Centralized complaint data service for Citizen, Committee, and Admin dashboards.
 * 
 * BACKEND INTEGRATION:
 * Communicates with FastAPI endpoints backed by PostgreSQL tables:
 * - `complaints`
 * - `complaint_timelines`
 * - `complaint_updates`
 * - `complaint_attachments`
 * 
 * When FastAPI is online, fetches real database rows.
 * When offline or in developer simulation mode, falls back to isolated mock fixtures
 * with explicit simulation flags so the frontend never confuses mock data with live rows.
 */

import { apiRequest } from './apiClient';
import { MOCK_CITIZEN_COMPLAINTS } from '../mocks/citizenDashboardMock';
import { MOCK_COMMITTEE_COMPLAINTS } from '../mocks/committeeDashboardMock';

// In-memory working cache for local edits during offline/demo mode
let localCitizenComplaints = [...MOCK_CITIZEN_COMPLAINTS];
let localCommitteeComplaints = [...MOCK_COMMITTEE_COMPLAINTS];

async function getLocalCitizenComplaints() {
  return localCitizenComplaints;
}

async function getLocalCommitteeComplaints() {
  return localCommitteeComplaints;
}

/**
 * Fetch complaints belonging to the currently authenticated citizen.
 * 
 * BACKEND INTEGRATION:
 * FastAPI Endpoint: GET /api/v1/complaints/mine
 * Authorization: Bearer JWT (Role: citizen)
 * Backend requirement: Derives citizen ID from JWT; never accepts client-provided user_id.
 * Expected response: Array of complaint objects with id, title, category, status, priority, location, createdAt.
 */
export async function getCitizenComplaints() {
  const res = await apiRequest('/api/v1/complaints/mine');
  if (res.ok && Array.isArray(res.data)) {
    return { success: true, data: res.data, isMock: false };
  }
  const complaints = await getLocalCitizenComplaints();
  // Offline fallback to demonstration fixture
  return {
    success: true,
    data: complaints,
    isMock: true,
    notice: 'Demonstration Data: FastAPI /api/v1/complaints/mine currently offline.',
  };
}

/**
 * Fetch complaints assigned to the committee member or their jurisdiction.
 * 
 * BACKEND INTEGRATION:
 * FastAPI Endpoint: GET /api/v1/committee/complaints
 * Authorization: Bearer JWT (Role: committee)
 * Query parameters supported: status, priority, category, page, limit.
 * Expected response: { items: [...], total: number, page: number }
 */
export async function getCommitteeComplaints(filters = {}) {
  const query = new URLSearchParams();
  if (filters.status && filters.status !== 'all') query.append('status', filters.status);
  if (filters.priority && filters.priority !== 'all') query.append('priority', filters.priority);
  if (filters.category && filters.category !== 'all') query.append('category', filters.category);
  if (filters.search) query.append('search', filters.search);

  const endpoint = `/api/v1/committee/complaints?${query.toString()}`;
  const res = await apiRequest(endpoint);

  if (res.ok && res.data) {
    const items = Array.isArray(res.data) ? res.data : res.data.items || [];
    return { success: true, data: items, total: res.data.total || items.length, isMock: false };
  }

  // Offline mock filtering
  const committeeComplaints = await getLocalCommitteeComplaints();
  let filtered = [...committeeComplaints];
  if (filters.status && filters.status !== 'all') {
    filtered = filtered.filter((c) => c.status === filters.status);
  }
  if (filters.priority && filters.priority !== 'all') {
    filtered = filtered.filter((c) => c.priority === filters.priority);
  }
  if (filters.category && filters.category !== 'all') {
    filtered = filtered.filter((c) => c.category === filters.category);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        (c.location && c.location.address && c.location.address.toLowerCase().includes(q))
    );
  }

  return {
    success: true,
    data: filtered,
    total: filtered.length,
    isMock: true,
    notice: 'Demonstration Data: FastAPI /api/v1/committee/complaints currently offline.',
  };
}

/**
 * Fetch full complaint details by ID.
 * 
 * BACKEND INTEGRATION:
 * FastAPI Endpoint: GET /api/v1/complaints/{id}
 * Authorization: Bearer JWT
 * Permissions: Citizen can only view their own complaint. Committee can view assigned or zone complaints.
 */
export async function getComplaintById(id) {
  const res = await apiRequest(`/api/v1/complaints/${id}`);
  if (res.ok && res.data) {
    return { success: true, data: res.data, isMock: false };
  }

  // Find in local mock stores
  const commComplaints = await getLocalCommitteeComplaints();
  const citComplaints = await getLocalCitizenComplaints();
  const found =
    commComplaints.find((c) => c.id === id) ||
    citComplaints.find((c) => c.id === id);

  if (found) {
    return { success: true, data: found, isMock: true };
  }

  return { success: false, error: `Complaint ${id} not found.` };
}

/**
 * Submit a new citizen civic issue report.
 * 
 * BACKEND INTEGRATION:
 * FastAPI Endpoint: POST /api/v1/complaints
 * Payload: { title, description, category, location: { address, landmark, latitude, longitude }, attachmentUrl? }
 * Response: { id, status: 'submitted', createdAt }
 */
export async function submitCitizenComplaint(payload) {
  const res = await apiRequest('/api/v1/complaints', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (res.ok && res.data) {
    return { success: true, data: res.data, isMock: false };
  }

  // Offline mock insertion
  const newReport = {
    id: `CF-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    title: payload.title,
    description: payload.description,
    category: payload.category || 'other_civic',
    categoryLabel: payload.categoryLabel || 'Civic Infrastructure',
    location: payload.location || { address: 'Bengaluru City', ward: 'Ward 150' },
    status: 'submitted',
    priority: payload.priority || 'medium',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    assignedDepartment: 'Pending Municipal Review',
    assignedOfficer: 'Unassigned',
    hasAttachment: Boolean(payload.attachmentUrl),
    attachmentUrl: payload.attachmentUrl || null,
    timeline: [
      {
        stage: 'submitted',
        title: 'Complaint Registered',
        description: 'Report filed by citizen.',
        timestamp: new Date().toISOString(),
        completed: true,
        actor: 'Citizen',
      },
      {
        stage: 'under_review',
        title: 'Municipal Triage Pending',
        description: 'Awaiting committee assessment.',
        timestamp: null,
        completed: false,
        actor: 'Ward Desk',
      },
    ],
    updates: [],
  };

  await getLocalCitizenComplaints();
  await getLocalCommitteeComplaints();
  localCitizenComplaints = [newReport, ...(localCitizenComplaints || [])];
  localCommitteeComplaints = [
    {
      ...newReport,
      reporterName: 'Aarav Sharma (Citizen)',
      slaDeadline: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
      internalNotes: [],
      publicUpdates: [],
    },
    ...(localCommitteeComplaints || []),
  ];

  return {
    success: true,
    data: newReport,
    isMock: true,
    message: 'Report submitted successfully (Dev Simulation Mode).',
  };
}

/**
 * Committee action: update complaint status.
 * 
 * BACKEND INTEGRATION:
 * FastAPI Endpoint: PATCH /api/v1/committee/complaints/{id}/status
 * Payload: { new_status: string, transition_reason: string }
 * Backend enforces state machine transitions and logs to audit trail.
 */
export async function updateComplaintStatus(complaintId, newStatus, reason = '') {
  const res = await apiRequest(`/api/v1/committee/complaints/${complaintId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ new_status: newStatus, transition_reason: reason }),
  });

  if (res.ok && res.data) {
    return { success: true, data: res.data, isMock: false };
  }

  // Update in local mock storage
  await getLocalCitizenComplaints();
  await getLocalCommitteeComplaints();
  if (localCommitteeComplaints) {
    localCommitteeComplaints = localCommitteeComplaints.map((c) => {
      if (c.id === complaintId) {
        return {
          ...c,
          status: newStatus,
          updatedAt: new Date().toISOString(),
        };
      }
      return c;
    });
  }

  if (localCitizenComplaints) {
    localCitizenComplaints = localCitizenComplaints.map((c) => {
      if (c.id === complaintId) {
        return {
          ...c,
          status: newStatus,
          updatedAt: new Date().toISOString(),
        };
      }
      return c;
    });
  }

  return {
    success: true,
    message: `Status updated to ${newStatus} (Dev simulation).`,
    isMock: true,
  };
}

/**
 * Committee action: add note or public progress update.
 * 
 * BACKEND INTEGRATION:
 * FastAPI Endpoint: POST /api/v1/committee/complaints/{id}/updates
 * Payload: { message: string, is_internal: boolean }
 * Backend MUST reject is_internal=true notes from being visible on citizen endpoints.
 */
export async function addComplaintNote(complaintId, { text, isInternal = false, author = 'Committee Officer' }) {
  const res = await apiRequest(`/api/v1/committee/complaints/${complaintId}/updates`, {
    method: 'POST',
    body: JSON.stringify({ message: text, is_internal: isInternal }),
  });

  if (res.ok && res.data) {
    return { success: true, data: res.data, isMock: false };
  }

  // Offline mock insertion
  await getLocalCitizenComplaints();
  await getLocalCommitteeComplaints();
  const newNote = {
    id: `note-${Date.now()}`,
    author,
    timestamp: new Date().toISOString(),
    text,
    message: text,
    isInternal,
  };

  if (localCommitteeComplaints) {
    localCommitteeComplaints = localCommitteeComplaints.map((c) => {
      if (c.id === complaintId) {
        if (isInternal) {
          return { ...c, internalNotes: [newNote, ...(c.internalNotes || [])] };
        } else {
          return { ...c, publicUpdates: [newNote, ...(c.publicUpdates || [])] };
        }
      }
      return c;
    });
  }

  if (!isInternal && localCitizenComplaints) {
    localCitizenComplaints = localCitizenComplaints.map((c) => {
      if (c.id === complaintId) {
        return {
          ...c,
          updates: [
            {
              id: newNote.id,
              author,
              role: 'Official Authority',
              timestamp: newNote.timestamp,
              message: text,
              isPublic: true,
            },
            ...(c.updates || []),
          ],
        };
      }
      return c;
    });
  }

  return { success: true, data: newNote, isMock: true };
}

/**
 * Committee action: assign or forward complaint to a verified authority department.
 * 
 * BACKEND INTEGRATION:
 * FastAPI Endpoint: POST /api/v1/committee/complaints/{id}/assign
 * Payload: { authority_id: string, department_name: string, officer_name?: string }
 */
export async function forwardComplaintToAuthority(complaintId, { authorityId, departmentName, officerName }) {
  const res = await apiRequest(`/api/v1/committee/complaints/${complaintId}/assign`, {
    method: 'POST',
    body: JSON.stringify({ authority_id: authorityId, department_name: departmentName, officer_name: officerName }),
  });

  if (res.ok && res.data) {
    return { success: true, data: res.data, isMock: false };
  }

  // Mock assignment
  await getLocalCitizenComplaints();
  await getLocalCommitteeComplaints();
  if (localCommitteeComplaints) {
    localCommitteeComplaints = localCommitteeComplaints.map((c) => {
      if (c.id === complaintId) {
        return {
          ...c,
          status: 'assigned',
          department: departmentName,
          assignedTo: officerName || 'Zonal Engineer Desk',
          updatedAt: new Date().toISOString(),
        };
      }
      return c;
    });
  }

  if (localCitizenComplaints) {
    localCitizenComplaints = localCitizenComplaints.map((c) => {
      if (c.id === complaintId) {
        return {
          ...c,
          status: 'assigned',
          assignedDepartment: departmentName,
          assignedOfficer: officerName || 'Zonal Engineer Desk',
          updatedAt: new Date().toISOString(),
        };
      }
      return c;
    });
  }

  return { success: true, isMock: true, message: `Dispatched to ${departmentName}` };
}

/**
 * Fetch AI complaint triage insights and predictions.
 * 
 * BACKEND INTEGRATION:
 * FastAPI Endpoint: GET /api/v1/complaints/{id}/ai-insights
 * Authorization: Bearer JWT
 * Response: {
 *   predictedCategory: string,
 *   categoryLabel: string,
 *   estimatedPriority: 'low' | 'medium' | 'high' | 'critical',
 *   confidenceScore: number, // 0.0 - 1.0
 *   suggestedDepartment: string,
 *   recommendedAction: string,
 *   analyzedAt: string,
 *   modelVersion: string,
 *   isConfirmed?: boolean
 * }
 */
export async function getComplaintAiInsights(complaintId) {
  const res = await apiRequest(`/api/v1/complaints/${complaintId}/ai-insights`);
  if (res.ok && res.data) {
    return { success: true, data: res.data, isMock: false };
  }

  // Check local mock store
  const commComplaints = await getLocalCommitteeComplaints();
  const found = commComplaints.find((c) => c.id === complaintId);

  if (found && found.aiAnalysis) {
    return {
      success: true,
      data: found.aiAnalysis,
      isMock: true,
      notice: 'Demonstration AI inference data from local store.',
    };
  }

  return {
    success: false,
    pending: true,
    requiresEndpoint: `/api/v1/complaints/${complaintId}/ai-insights`,
    message: 'AI inference pipeline pending or not yet integrated for this grievance record.',
  };
}

/**
 * Committee action: Confirm or modify and apply AI recommendation to complaint.
 * 
 * BACKEND INTEGRATION:
 * FastAPI Endpoint: POST /api/v1/committee/complaints/{id}/apply-ai
 * Payload: {
 *   predictedCategory: string,
 *   categoryLabel?: string,
 *   suggestedDepartment: string,
 *   estimatedPriority: string,
 *   isCorrection: boolean,
 *   originalPrediction?: object,
 *   correctionReason?: string
 * }
 */
export async function applyAiRecommendation(complaintId, recommendation, correctionMeta = {}) {
  const isCorrection = Boolean(correctionMeta.isCorrection);
  const payload = {
    predictedCategory: recommendation.predictedCategory,
    categoryLabel: recommendation.categoryLabel,
    suggestedDepartment: recommendation.suggestedDepartment,
    estimatedPriority: recommendation.estimatedPriority,
    isCorrection,
    originalPrediction: correctionMeta.originalPrediction || null,
    correctionReason: correctionMeta.correctionReason || '',
  };

  const res = await apiRequest(`/api/v1/committee/complaints/${complaintId}/apply-ai`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (res.ok && res.data) {
    return { success: true, data: res.data, isMock: false };
  }

  // Update in local mock storage
  await getLocalCitizenComplaints();
  await getLocalCommitteeComplaints();

  const noteText = isCorrection
    ? `Officer applied human correction to AI recommendation: [Category: ${correctionMeta.originalPrediction?.predictedCategory || 'original'} -> ${recommendation.predictedCategory}], [Priority: ${correctionMeta.originalPrediction?.estimatedPriority || 'original'} -> ${recommendation.estimatedPriority}], [Department: ${correctionMeta.originalPrediction?.suggestedDepartment || 'original'} -> ${recommendation.suggestedDepartment}]. Reason: ${correctionMeta.correctionReason || 'Manual adjustment'}.`
    : `Officer verified and applied AI recommendation: Assigned to ${recommendation.suggestedDepartment} with priority ${recommendation.estimatedPriority}.`;

  const applyUpdate = (c) => {
    if (c.id === complaintId) {
      return {
        ...c,
        status: 'assigned',
        department: recommendation.suggestedDepartment || c.department,
        assignedDepartment: recommendation.suggestedDepartment || c.assignedDepartment,
        category: recommendation.predictedCategory || c.category,
        categoryLabel: recommendation.categoryLabel || c.categoryLabel,
        priority: recommendation.estimatedPriority || c.priority,
        updatedAt: new Date().toISOString(),
        aiAnalysis: c.aiAnalysis
          ? {
              ...c.aiAnalysis,
              isConfirmed: true,
              isCorrected: isCorrection,
              correctionReason: correctionMeta.correctionReason || null,
              confirmedCategory: recommendation.predictedCategory,
              confirmedPriority: recommendation.estimatedPriority,
              confirmedDepartment: recommendation.suggestedDepartment,
            }
          : undefined,
        internalNotes: [
          {
            id: `note-${Date.now()}`,
            author: 'Committee Officer',
            timestamp: new Date().toISOString(),
            text: noteText,
            isInternal: true,
          },
          ...(c.internalNotes || []),
        ],
      };
    }
    return c;
  };

  if (localCommitteeComplaints) {
    localCommitteeComplaints = localCommitteeComplaints.map(applyUpdate);
  }
  if (localCitizenComplaints) {
    localCitizenComplaints = localCitizenComplaints.map(applyUpdate);
  }

  return {
    success: true,
    isMock: true,
    message: isCorrection
      ? `Human correction applied and saved to ${complaintId} (recorded for AI retraining).`
      : `AI recommendation successfully confirmed and applied to ${complaintId}.`,
  };
}

/**
 * Committee action: Review and resolve a duplicate complaint candidate.
 * 
 * BACKEND INTEGRATION:
 * FastAPI Endpoint: POST /api/v1/committee/complaints/{id}/duplicates
 * Payload: { candidateId: string, action: 'confirm_duplicate' | 'dismiss_duplicate', reason: string }
 * 
 * Safety Guarantee:
 * Complaints are NEVER automatically merged or closed by AI.
 * Human officer review and explicit verification is required.
 */
export async function resolveDuplicateCandidate(complaintId, { candidateId, action, reason = '' }) {
  const res = await apiRequest(`/api/v1/committee/complaints/${complaintId}/duplicates`, {
    method: 'POST',
    body: JSON.stringify({ candidate_id: candidateId, action, reason }),
  });

  if (res.ok && res.data) {
    return { success: true, data: res.data, isMock: false };
  }

  await getLocalCitizenComplaints();
  await getLocalCommitteeComplaints();

  const isConfirmedDuplicate = action === 'confirm_duplicate';
  const auditNoteText = isConfirmedDuplicate
    ? `Officer confirmed complaint as DUPLICATE of ticket ${candidateId}. Primary case retains precedence. Inspection note: ${reason || 'Identical incident location and citizen evidence.'}`
    : `Officer reviewed duplicate candidate ${candidateId} and DISMISSED match: Confirmed as separate independent incident. Reason: ${reason || 'Distinct physical defect requiring separate work order.'}`;

  const applyUpdate = (c) => {
    if (c.id === complaintId) {
      const updatedCandidates = (c.aiAnalysis?.duplicateCandidates || []).map((cand) => {
        if (cand.id === candidateId) {
          return {
            ...cand,
            isDismissed: !isConfirmedDuplicate,
            isConfirmedDuplicate,
            reviewedAt: new Date().toISOString(),
            resolutionReason: reason,
          };
        }
        return cand;
      });

      return {
        ...c,
        status: isConfirmedDuplicate ? 'rejected' : c.status,
        duplicateOf: isConfirmedDuplicate ? candidateId : undefined,
        updatedAt: new Date().toISOString(),
        aiAnalysis: c.aiAnalysis
          ? {
              ...c.aiAnalysis,
              duplicateCandidates: updatedCandidates,
            }
          : undefined,
        internalNotes: [
          {
            id: `note-${Date.now()}`,
            author: 'Committee Officer',
            timestamp: new Date().toISOString(),
            text: auditNoteText,
            isInternal: true,
          },
          ...(c.internalNotes || []),
        ],
      };
    }
    return c;
  };

  if (localCommitteeComplaints) {
    localCommitteeComplaints = localCommitteeComplaints.map(applyUpdate);
  }
  if (localCitizenComplaints) {
    localCitizenComplaints = localCitizenComplaints.map(applyUpdate);
  }

  return {
    success: true,
    isMock: true,
    message: isConfirmedDuplicate
      ? `Case ${complaintId} confirmed as duplicate of ${candidateId}. Workflow updated.`
      : `Duplicate candidate ${candidateId} dismissed. Case ${complaintId} marked as independent grievance.`,
  };
}

/**
 * AI-assisted issue classification during citizen reporting.
 * 
 * BACKEND INTEGRATION:
 * FastAPI Endpoint: POST /api/v1/ai/classify
 * Payload: { title: string, description: string }
 * Response: {
 *   predictedCategory: string,
 *   categoryLabel: string,
 *   estimatedPriority: 'low' | 'medium' | 'high' | 'critical',
 *   suggestedDepartment: string,
 *   confidenceScore?: number,
 *   reasoning?: string
 * }
 * 
 * When offline or endpoint is not yet deployed, returns clean status without fabricating false data.
 */
export async function classifyIssueWithAi({ title, description }) {
  if (!title && !description) {
    return {
      success: false,
      message: 'Please provide at least an issue title or description for AI assessment.',
    };
  }

  const res = await apiRequest('/api/v1/ai/classify', {
    method: 'POST',
    body: JSON.stringify({ title, description }),
  });

  if (res.ok && res.data) {
    return { success: true, data: res.data, isMock: false };
  }

  return {
    success: false,
    requiresEndpoint: 'POST /api/v1/ai/classify',
    message: 'AI Auto-Classification endpoint is not active or FastAPI is offline. You can select the category and urgency manually.',
  };
}

/**
 * Citizen action: Submit clarification or additional evidence/information.
 * 
 * BACKEND INTEGRATION:
 * FastAPI Endpoint: POST /api/v1/complaints/{id}/citizen-info
 * Payload: { remarks: string, attachmentUrl?: string }
 */
export async function submitCitizenAdditionalInfo(complaintId, { remarks, attachmentUrl = null }) {
  const res = await apiRequest(`/api/v1/complaints/${complaintId}/citizen-info`, {
    method: 'POST',
    body: JSON.stringify({ remarks, attachment_url: attachmentUrl }),
  });

  if (res.ok && res.data) {
    return { success: true, data: res.data, isMock: false };
  }

  // Update in local mock storage
  await getLocalCitizenComplaints();
  await getLocalCommitteeComplaints();

  const timestamp = new Date().toISOString();
  const updateEntry = {
    id: `cit-update-${Date.now()}`,
    author: 'Citizen (Report Author)',
    role: 'Citizen',
    timestamp,
    message: remarks,
    isPublic: true,
    attachmentUrl,
  };

  const applyUpdate = (c) => {
    if (c.id === complaintId) {
      const updatedTimeline = [
        ...(c.timeline || []),
        {
          stage: 'citizen_clarification',
          title: 'Citizen Provided Additional Information',
          description: remarks,
          timestamp,
          completed: true,
          actor: 'Citizen',
          attachmentUrl,
        },
      ];

      return {
        ...c,
        additionalInfoRequested: false,
        additionalInfoNote: null,
        attachmentUrl: attachmentUrl || c.attachmentUrl,
        hasAttachment: Boolean(attachmentUrl || c.hasAttachment),
        timeline: updatedTimeline,
        updatedAt: timestamp,
        updates: [updateEntry, ...(c.updates || [])],
        publicUpdates: [updateEntry, ...(c.publicUpdates || [])],
      };
    }
    return c;
  };

  if (localCommitteeComplaints) {
    localCommitteeComplaints = localCommitteeComplaints.map(applyUpdate);
  }
  if (localCitizenComplaints) {
    localCitizenComplaints = localCitizenComplaints.map(applyUpdate);
  }

  return {
    success: true,
    isMock: true,
    data: updateEntry,
    message: 'Additional information submitted successfully to municipal records.',
  };
}

/**
 * Committee Officer action: Request additional information from citizen.
 * 
 * BACKEND INTEGRATION:
 * FastAPI Endpoint: POST /api/v1/committee/complaints/{id}/request-info
 * Payload: { queryText: string, requestedFields?: string[] }
 */
export async function requestAdditionalInfo(complaintId, { queryText, requestedFields = [] }) {
  const res = await apiRequest(`/api/v1/committee/complaints/${complaintId}/request-info`, {
    method: 'POST',
    body: JSON.stringify({ query_text: queryText, requested_fields: requestedFields }),
  });

  if (res.ok && res.data) {
    return { success: true, data: res.data, isMock: false };
  }

  await getLocalCitizenComplaints();
  await getLocalCommitteeComplaints();

  const timestamp = new Date().toISOString();
  const requestEntry = {
    id: `req-info-${Date.now()}`,
    author: 'Committee Officer',
    role: 'Municipal Desk',
    timestamp,
    message: `[Action Required by Citizen]: ${queryText}`,
    isPublic: true,
    isInfoRequest: true,
  };

  const applyUpdate = (c) => {
    if (c.id === complaintId) {
      const updatedTimeline = [
        ...(c.timeline || []),
        {
          stage: 'info_requested',
          title: 'Additional Information Requested',
          description: queryText,
          timestamp,
          completed: true,
          actor: 'Committee Officer',
        },
      ];

      return {
        ...c,
        status: 'under_review',
        additionalInfoRequested: true,
        additionalInfoNote: queryText,
        updatedAt: timestamp,
        timeline: updatedTimeline,
        updates: [requestEntry, ...(c.updates || [])],
        publicUpdates: [requestEntry, ...(c.publicUpdates || [])],
      };
    }
    return c;
  };

  if (localCommitteeComplaints) {
    localCommitteeComplaints = localCommitteeComplaints.map(applyUpdate);
  }
  if (localCitizenComplaints) {
    localCitizenComplaints = localCitizenComplaints.map(applyUpdate);
  }

  return {
    success: true,
    isMock: true,
    data: requestEntry,
    message: 'Information request published. Citizen notified to supply clarification.',
  };
}

/**
 * Committee Officer action: Record resolution details, evidence, and sign-off.
 * 
 * BACKEND INTEGRATION:
 * FastAPI Endpoint: POST /api/v1/committee/complaints/{id}/resolve
 * Payload: { resolutionSummary: string, resolvedBy: string, evidenceUrl?: string, resolutionSignOff?: string }
 */
export async function recordComplaintResolution(complaintId, {
  resolutionSummary,
  resolvedBy = 'Municipal Zonal Engineer',
  evidenceUrl = null,
  resolutionSignOff = 'Verified on-site',
}) {
  const res = await apiRequest(`/api/v1/committee/complaints/${complaintId}/resolve`, {
    method: 'POST',
    body: JSON.stringify({
      resolution_summary: resolutionSummary,
      resolved_by: resolvedBy,
      evidence_url: evidenceUrl,
      resolution_sign_off: resolutionSignOff,
    }),
  });

  if (res.ok && res.data) {
    return { success: true, data: res.data, isMock: false };
  }

  await getLocalCitizenComplaints();
  await getLocalCommitteeComplaints();

  const timestamp = new Date().toISOString();
  const resolutionData = {
    summary: resolutionSummary,
    resolvedBy,
    evidenceUrl,
    resolutionSignOff,
    resolvedAt: timestamp,
  };

  const resolveUpdate = {
    id: `res-${Date.now()}`,
    author: resolvedBy,
    role: 'Municipal Authority',
    timestamp,
    message: `Issue Resolved: ${resolutionSummary}`,
    isPublic: true,
    evidenceUrl,
  };

  const applyUpdate = (c) => {
    if (c.id === complaintId) {
      const updatedTimeline = [
        ...(c.timeline || []).map((t) => {
          if (t.stage === 'resolved') {
            return {
              ...t,
              completed: true,
              timestamp,
              description: resolutionSummary,
              actor: resolvedBy,
              evidenceUrl,
            };
          }
          return t;
        }),
      ];

      // If resolved stage wasn't in timeline, append it
      if (!updatedTimeline.some((t) => t.stage === 'resolved')) {
        updatedTimeline.push({
          stage: 'resolved',
          title: 'Complaint Resolved',
          description: resolutionSummary,
          timestamp,
          completed: true,
          actor: resolvedBy,
          evidenceUrl,
        });
      }

      return {
        ...c,
        status: 'resolved',
        resolution: resolutionData,
        resolvedAt: timestamp,
        updatedAt: timestamp,
        timeline: updatedTimeline,
        updates: [resolveUpdate, ...(c.updates || [])],
        publicUpdates: [resolveUpdate, ...(c.publicUpdates || [])],
      };
    }
    return c;
  };

  if (localCommitteeComplaints) {
    localCommitteeComplaints = localCommitteeComplaints.map(applyUpdate);
  }
  if (localCitizenComplaints) {
    localCitizenComplaints = localCitizenComplaints.map(applyUpdate);
  }

  return {
    success: true,
    isMock: true,
    data: resolutionData,
    message: `Complaint ${complaintId} marked as RESOLVED with sign-off recorded.`,
  };
}

/**
 * Administrator action: Override complaint status, priority, or department with audit reason.
 * 
 * BACKEND INTEGRATION:
 * FastAPI Endpoint: POST /api/v1/admin/complaints/{id}/override
 * Payload: { status?: string, priority?: string, department?: string, reason: string }
 */
export async function adminOverrideComplaint(complaintId, { status, priority, department, reason }) {
  const res = await apiRequest(`/api/v1/admin/complaints/${complaintId}/override`, {
    method: 'POST',
    body: JSON.stringify({ status, priority, department, reason }),
  });

  if (res.ok && res.data) {
    return { success: true, data: res.data, isMock: false };
  }

  await getLocalCitizenComplaints();
  await getLocalCommitteeComplaints();

  const timestamp = new Date().toISOString();
  const auditNote = {
    id: `audit-${Date.now()}`,
    author: 'Platform Administrator',
    timestamp,
    text: `ADMIN OVERRIDE: ${[
      status ? `Status -> ${status}` : '',
      priority ? `Priority -> ${priority}` : '',
      department ? `Department -> ${department}` : '',
    ]
      .filter(Boolean)
      .join(', ')}. Reason: ${reason || 'Administrative policy intervention'}.`,
    isInternal: true,
    isAdminAudit: true,
  };

  const applyUpdate = (c) => {
    if (c.id === complaintId) {
      return {
        ...c,
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
        ...(department ? { department, assignedDepartment: department } : {}),
        updatedAt: timestamp,
        internalNotes: [auditNote, ...(c.internalNotes || [])],
      };
    }
    return c;
  };

  if (localCommitteeComplaints) {
    localCommitteeComplaints = localCommitteeComplaints.map(applyUpdate);
  }
  if (localCitizenComplaints) {
    localCitizenComplaints = localCitizenComplaints.map(applyUpdate);
  }

  return {
    success: true,
    isMock: true,
    message: `Administrative override applied to ${complaintId} and logged in municipal audit trail.`,
  };
}


