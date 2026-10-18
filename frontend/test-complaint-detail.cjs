/**
 * test-complaint-detail.cjs
 * Comprehensive test verification for Complaint Detail & Lifecycle actions.
 */

async function runTests() {
  console.log('--- CIVICFIX AI COMPLAINT DETAIL & WORKFLOW TEST SUITE ---\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      process.exitCode = 1;
    }
  }

  // Import service dynamically
  const complaintService = await import('./src/services/complaintService.js');

  // Test 1: Committee Officer requests additional information
  console.log('Test 1: Committee Officer requests additional info');
  const reqRes = await complaintService.requestAdditionalInfo('CF-2026-0891', {
    queryText: 'Please verify if the pothole is blocking the pedestrian crossing.',
    requestedFields: ['landmark', 'photo'],
  });
  assert(reqRes.success, 'requestAdditionalInfo returns success');

  const compAfterReq = await complaintService.getComplaintById('CF-2026-0891');
  assert(compAfterReq.data.additionalInfoRequested === true, 'Complaint has additionalInfoRequested flag set to true');
  assert(
    compAfterReq.data.timeline.some((t) => t.stage === 'info_requested'),
    'Timeline contains info_requested event'
  );

  // Test 2: Citizen provides additional information & clarification
  console.log('\nTest 2: Citizen provides additional clarification');
  const citRes = await complaintService.submitCitizenAdditionalInfo('CF-2026-0891', {
    remarks: 'The pothole is directly adjacent to EcoSpace Gate 2 pedestrian zebra crossing.',
    attachmentUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
  });
  assert(citRes.success, 'submitCitizenAdditionalInfo returns success');

  const compAfterCit = await complaintService.getComplaintById('CF-2026-0891');
  assert(compAfterCit.data.additionalInfoRequested === false, 'additionalInfoRequested flag cleared after citizen response');
  assert(
    compAfterCit.data.timeline.some((t) => t.stage === 'citizen_clarification'),
    'Timeline contains citizen_clarification event'
  );

  // Test 3: Officer records resolution with evidence
  console.log('\nTest 3: Officer records resolution details and evidence');
  const resRes = await complaintService.recordComplaintResolution('CF-2026-0891', {
    resolutionSummary: 'Bitumen wet-mix asphalt resurfacing completed and cured. Road markings repainted.',
    resolvedBy: 'Er. N. K. Murthy (Executive Engineer)',
    evidenceUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
    resolutionSignOff: 'Verified on-site by East Zone Quality Control Cell',
  });
  assert(resRes.success, 'recordComplaintResolution returns success');

  const compAfterRes = await complaintService.getComplaintById('CF-2026-0891');
  assert(compAfterRes.data.status === 'resolved', 'Complaint status transitioned to resolved');
  assert(compAfterRes.data.resolution?.summary.includes('asphalt resurfacing'), 'Resolution summary properly recorded');
  assert(compAfterRes.data.resolution?.evidenceUrl !== null, 'Photographic evidence URL recorded');

  // Test 4: Administrator override
  console.log('\nTest 4: Administrator executes administrative override');
  const adminRes = await complaintService.adminOverrideComplaint('CF-2026-0904', {
    status: 'in_progress',
    priority: 'critical',
    department: 'Bangalore Water Supply and Sewerage Board (BWSSB) - Emergency Response Unit',
    reason: 'Ministerial priority escalation due to water supply disruption.',
  });
  assert(adminRes.success, 'adminOverrideComplaint returns success');

  const compAfterAdmin = await complaintService.getComplaintById('CF-2026-0904');
  assert(compAfterAdmin.data.status === 'in_progress', 'Admin override changed status to in_progress');
  assert(
    compAfterAdmin.data.internalNotes.some((n) => n.isAdminAudit && n.text.includes('ADMIN OVERRIDE')),
    'Admin override logged in internal audit trail'
  );

  // Test 5: Verify RBAC Privacy Invariant
  console.log('\nTest 5: RBAC Privacy Invariant - Internal notes never in citizen updates');
  const citizenComplaintsRes = await complaintService.getCitizenComplaints();
  const citizenList = citizenComplaintsRes.data;
  let leakFound = false;
  for (const c of citizenList) {
    if (c.updates) {
      for (const u of c.updates) {
        if (u.isInternal === true) {
          leakFound = true;
        }
      }
    }
  }
  assert(!leakFound, 'Zero internal notes leaked to citizen updates feed');

  console.log(`\n========================================`);
  console.log(`RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log(`========================================\n`);

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
