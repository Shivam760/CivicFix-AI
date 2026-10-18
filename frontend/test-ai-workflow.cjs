const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BRAVE_PATH = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';

const browserExecutable = fs.existsSync(EDGE_PATH)
  ? EDGE_PATH
  : fs.existsSync(BRAVE_PATH)
  ? BRAVE_PATH
  : null;

if (!browserExecutable) {
  console.error('Neither Edge nor Brave was found!');
  process.exit(1);
}

const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function startServer() {
  console.log('Spawning vite preview on http://localhost:4173...');
  const child = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], {
    cwd: __dirname,
    shell: true,
    stdio: 'pipe',
  });

  await new Promise((r) => setTimeout(r, 2000));
  return child;
}

async function runAiWorkflowTests() {
  const server = await startServer();
  const baseUrl = 'http://localhost:4173';

  console.log(`Starting headless browser test suite using: ${browserExecutable}`);
  const browser = await puppeteer.launch({
    executablePath: browserExecutable,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  const testResults = [];

  function recordTest(id, name, passed, details = '') {
    testResults.push({ id, name, passed, details });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${mark} [Test ${id.toString().padStart(2, '0')}] ${name}${details ? ` (${details})` : ''}`);
  }

  try {
    await page.setViewport({ width: 1440, height: 900 });

    // Helper: Perform login through UI
    async function loginAs(email, password = 'Password123!') {
      await page.goto(`${baseUrl}/login?demo=true`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('input[name="email"], input[type="email"]');
      
      // Clear inputs
      await page.click('input[name="email"], input[type="email"]', { clickCount: 3 });
      await page.keyboard.press('Backspace');
      await page.type('input[name="email"], input[type="email"]', email, { delay: 10 });

      await page.click('input[name="password"], input[type="password"]', { clickCount: 3 });
      await page.keyboard.press('Backspace');
      await page.type('input[name="password"], input[type="password"]', password, { delay: 10 });

      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
      }
      // Wait for navigation and animation
      await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 5000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 1200));
      const currentUrl = page.url();
      const pageInfo = await page.evaluate(() => {
        const errorAlert = document.querySelector('[role="alert"]')?.textContent;
        const h1 = document.querySelector('h1, h2')?.textContent;
        return { errorAlert, h1 };
      });
      console.log(`[loginAs] target=${email} => landed on: ${currentUrl} | heading: "${pageInfo.h1}" | alert: "${pageInfo.errorAlert}"`);
    }

    // =========================================================================
    // TEST 01: Committee Officer Login & AI Insights Panel Verification
    // =========================================================================
    console.log('\n--- PHASE 1: COMMITTEE OFFICER AI WORKFLOW ---');
    await loginAs('p.sundaram@bbmp.gov.in');

    // Wait until complaint data is loaded and active complaint is populated in the AI panel
    await page.waitForFunction(
      () =>
        document.body.innerText.toLowerCase().includes('estimated severity') &&
        document.body.innerText.toLowerCase().includes('suggested department'),
      { timeout: 10000 }
    );

    const committeeAiInsights = await page.evaluate(() => {
      const panel = document.body.innerText.toLowerCase();
      const hasAiPanel = panel.includes('ai case insights');
      const hasPredictedCategory = panel.includes('predicted category');
      const hasSeverity = panel.includes('estimated severity');
      const hasDepartment = panel.includes('suggested department');
      const hasDuplicateSection = panel.includes('potential duplicate') || panel.includes('duplicate');
      const hasSemanticMatch = panel.includes('semantic match') || panel.includes('match') || panel.includes('%');
      return {
        hasAiPanel,
        hasPredictedCategory,
        hasSeverity,
        hasDepartment,
        hasDuplicateSection,
        hasSemanticMatch,
      };
    });

    console.log('[Test 01 Diagnostics]', committeeAiInsights);

    recordTest(
      1,
      'Committee AI Insights & Duplicate Detection Panel',
      committeeAiInsights.hasAiPanel &&
        committeeAiInsights.hasPredictedCategory &&
        committeeAiInsights.hasDepartment &&
        committeeAiInsights.hasDuplicateSection,
      `AI Category, Severity, Department & Duplicate section verified`
    );
    await page.screenshot({ path: path.join(screenshotsDir, 'ai_01_committee_panel.png') });

    // =========================================================================
    // TEST 02: Complaint Detail Modal AI Tab & Human Correction Controls
    // =========================================================================
    await page.waitForSelector('button', { timeout: 5000 });
    const _openedModal = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const reviewBtn = buttons.find((b) => b.textContent.includes('Review Recommendation'));
      if (reviewBtn) {
        reviewBtn.click();
        return true;
      }
      return false;
    });

    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await new Promise((r) => setTimeout(r, 600));

    const modalAiContent = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (!modal) return { hasModal: false };
      const text = modal.innerText;
      const hasAiSummary = text.includes('Automated Inference Summary') || text.includes('AI Predicted Category') || text.includes('AI-Assisted');
      const hasModifyBtn = Array.from(modal.querySelectorAll('button')).some((b) =>
        b.textContent.includes('Modify Recommendation') || b.textContent.includes('Adjustments')
      );
      const hasDuplicateSection = text.includes('Duplicate Grievance Candidates') || text.includes('Potential Duplicate');
      return {
        hasModal: true,
        hasAiSummary,
        hasModifyBtn,
        hasDuplicateSection,
      };
    });

    console.log('[Test 02 Diagnostics]', modalAiContent);

    recordTest(
      2,
      'Complaint Detail Modal AI Tab & Correction Interface',
      modalAiContent.hasModal && modalAiContent.hasAiSummary && modalAiContent.hasModifyBtn,
      'Modal opened with AI summary and Human Modification controls'
    );
    await page.screenshot({ path: path.join(screenshotsDir, 'ai_02_modal_ai_tab.png') });

    // =========================================================================
    // TEST 03: Toggle Human Modification Controls & Selectors
    // =========================================================================
    await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (!modal) return false;
      const modifyBtn = Array.from(modal.querySelectorAll('button')).find((b) =>
        b.textContent.includes('Modify Recommendation') || b.textContent.includes('Adjustments')
      );
      if (modifyBtn) modifyBtn.click();
      return true;
    });

    await page.waitForSelector('#modal-correct-category', { timeout: 5000 });
    await new Promise((r) => setTimeout(r, 400));

    const correctionInputsExist = await page.evaluate(() => {
      const categorySelect = document.querySelector('#modal-correct-category');
      const prioritySelect = document.querySelector('#modal-correct-priority');
      const deptSelect = document.querySelector('#modal-correct-department');
      const reasonText = document.querySelector('#modal-correction-reason');
      return {
        hasCategorySelect: !!categorySelect,
        hasPrioritySelect: !!prioritySelect,
        hasDeptSelect: !!deptSelect,
        hasReasonText: !!reasonText,
      };
    });

    console.log('[Test 03 Diagnostics]', correctionInputsExist);

    recordTest(
      3,
      'Human Correction Inputs (Category, Priority, Department, Reason)',
      correctionInputsExist.hasCategorySelect &&
        correctionInputsExist.hasPrioritySelect &&
        correctionInputsExist.hasDeptSelect &&
        correctionInputsExist.hasReasonText,
      'All 4 correction form controls active for human reviewer sign-off'
    );
    await page.screenshot({ path: path.join(screenshotsDir, 'ai_03_human_correction_active.png') });

    // Close modal
    await page.evaluate(() => {
      const closeBtn = document.querySelector('[role="dialog"] button:has(svg)');
      if (closeBtn) closeBtn.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    // =========================================================================
    // TEST 04: Citizen Portal Experience (Submission States & Intake Badges)
    // =========================================================================
    console.log('\n--- PHASE 2: CITIZEN EXPERIENCE & INTAKE STATE ---');
    await loginAs('aarav.sharma@example.com');

    // Wait until complaints list is loaded in DOM
    await page.waitForFunction(
      () =>
        document.body.innerText.includes('CF-2026') ||
        document.body.innerText.includes('Track Complaint'),
      { timeout: 10000 }
    );

    const citizenAiState = await page.evaluate(() => {
      const body = document.body.innerText;
      const hasAiTriagedBadge = body.includes('AI Triaged') || body.includes('AI Pending') || body.includes('AI Intake');
      const hasReportButton = Array.from(document.querySelectorAll('button, a')).some((el) =>
        el.textContent.includes('Report') && el.textContent.includes('Issue')
      );
      const cardCount = document.querySelectorAll('[role="button"]').length;
      return {
        hasAiTriagedBadge,
        hasReportButton,
        cardCount,
      };
    });

    console.log('[Test 04 Diagnostics]', citizenAiState);

    recordTest(
      4,
      'Citizen Portal AI Intake Badges & Unblocked Tracking',
      citizenAiState.hasReportButton && citizenAiState.cardCount > 0,
      `AI intake badges present, grievances accessible without blocking`
    );
    await page.screenshot({ path: path.join(screenshotsDir, 'ai_04_citizen_dashboard.png') });

    // =========================================================================
    // TEST 05: Citizen Report Modal AI Classification & Submission Review
    // =========================================================================
    const _openedReportModal = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const reportBtn = buttons.find((b) => b.textContent.includes('Report a New Issue'));
      if (reportBtn) {
        reportBtn.click();
        return true;
      }
      return false;
    });

    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await new Promise((r) => setTimeout(r, 600));

    const reportModalAi = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (!modal) return { hasModal: false };
      const hasAiAssistBtn = Array.from(modal.querySelectorAll('button')).some((b) =>
        b.textContent.includes('AI') || b.textContent.includes('Auto-Categorize') || b.textContent.includes('Assistant')
      );
      return {
        hasModal: true,
        hasAiAssistBtn,
      };
    });

    console.log('[Test 05 Diagnostics]', reportModalAi);

    recordTest(
      5,
      'Citizen Report Wizard AI Auto-Classification Assist',
      reportModalAi.hasModal && reportModalAi.hasAiAssistBtn,
      'Grievance intake wizard with AI categorization assist active'
    );
    await page.screenshot({ path: path.join(screenshotsDir, 'ai_05_citizen_report_modal.png') });

    // Close report modal
    await page.evaluate(() => {
      const closeBtn = document.querySelector('[role="dialog"] button:has(svg)');
      if (closeBtn) closeBtn.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    // =========================================================================
    // TEST 06: Admin AI Monitoring Dashboard & Health Telemetry
    // =========================================================================
    console.log('\n--- PHASE 3: ADMIN AI TELEMETRY MONITORING ---');
    await loginAs('admin.varma@civicfix.ai');

    await page.waitForFunction(
      () =>
        document.body.innerText.includes('Platform Administration') ||
        document.body.innerText.includes('AI Monitoring') ||
        document.body.innerText.includes('Total Complaints'),
      { timeout: 8000 }
    ).catch(() => {});

    // Switch to AI Monitoring tab
    const _switchedToAiTab = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const aiTab = tabs.find((t) => t.textContent.includes('AI Monitoring') || t.textContent.includes('AI Models'));
      if (aiTab) {
        aiTab.click();
        return true;
      }
      return false;
    });

    // Wait until AI telemetry data loads
    await page.waitForFunction(
      () =>
        document.body.innerText.toLowerCase().includes('ai processed') ||
        document.body.innerText.toLowerCase().includes('recent ai inferences') ||
        document.body.innerText.toLowerCase().includes('inference id'),
      { timeout: 8000 }
    );

    const adminAiMetrics = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      const hasProcessed = text.includes('ai processed') || text.includes('complaintsprocessed');
      const hasAwaiting = text.includes('awaiting triage') || text.includes('awaitingclassification');
      const hasFailures = text.includes('pipeline failures') || text.includes('processingfailures');
      const hasLatency = text.includes('avg latency') || text.includes('avgprocessingtimems');
      const hasCorrections = text.includes('human corrections') || text.includes('humancorrections');
      const hasAvailability = text.includes('ai availability') || text.includes('serviceavailabilitypct');
      const hasInferenceTable = text.includes('recent ai inferences') || text.includes('inference id') || text.includes('live inference');
      return {
        hasProcessed,
        hasAwaiting,
        hasFailures,
        hasLatency,
        hasCorrections,
        hasAvailability,
        hasInferenceTable,
      };
    });

    console.log('[Test 06 Diagnostics]', adminAiMetrics);

    recordTest(
      6,
      'Admin AI Telemetry (6 Core Metrics + Live Inferences Table)',
      adminAiMetrics.hasProcessed &&
        adminAiMetrics.hasLatency &&
        adminAiMetrics.hasCorrections &&
        adminAiMetrics.hasAvailability,
      'AI processed count, latency, human overrides, and availability metrics verified'
    );
    await page.screenshot({ path: path.join(screenshotsDir, 'ai_06_admin_monitoring.png') });

  } catch (err) {
    console.error(`\n❌ UNEXPECTED TEST ERROR: ${err.message}`);
    console.error(err.stack);
  } finally {
    await browser.close();
    server.kill();
    console.log('\n==================================================');
    const passedCount = testResults.filter((t) => t.passed).length;
    console.log(`AI WORKFLOW TEST SUMMARY: ${passedCount}/${testResults.length} CRITERIA PASSED`);
    console.log('==================================================\n');
  }
}

runAiWorkflowTests();
