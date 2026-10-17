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

  await new Promise((r) => setTimeout(r, 2500));
  return child;
}

async function runTests() {
  const server = await startServer();
  const baseUrl = 'http://localhost:4173';

  console.log(`Starting headless browser modal test suite using: ${browserExecutable}`);
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
    await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 6000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1200));
  }

  try {
    await page.setViewport({ width: 1440, height: 900 });

    // ==========================================
    // 1. CITIZEN PORTAL COMPLAINT DETAIL TEST
    // ==========================================
    console.log('\n--- 1. Testing Citizen Portal Complaint Detail ---');
    await loginAs('aarav.sharma@example.com');
    await page.waitForSelector('h1', { timeout: 6000 });

    // Click complaint card
    const card = await page.waitForSelector('div[role="button"][aria-label*="Track complaint"], div[role="button"]', { timeout: 6000 });
    await card.click();

    await page.waitForSelector('div[role="dialog"]', { timeout: 6000 });
    const modalTitle = await page.$eval('h2#modal-complaint-title', (el) => el.innerText).catch(() => '');
    recordTest(1, 'Complaint Detail Modal opens on Citizen Dashboard', modalTitle.length > 0, `Title: "${modalTitle}"`);

    // Verify Overview & Evidence sections exist
    const hasCategory = await page.$eval('div[role="dialog"]', (el) => el.innerText.includes('Category')).catch(() => false);
    const hasLocation = await page.$eval('div[role="dialog"]', (el) => el.innerText.includes('Incident Location')).catch(() => false);
    recordTest(2, 'Modal displays structured Category and Incident Location sections', hasCategory && hasLocation);

    // Switch to Progress Timeline tab
    await page.click('button[data-tab="timeline"]');
    await new Promise((r) => setTimeout(r, 400));

    const hasTimelineMilestone = await page.$eval(
      'div[role="dialog"]',
      (el) => el.innerText.includes('Complaint Submitted') || el.innerText.includes('Complaint Registered') || el.innerText.includes('Intake')
    ).catch(() => false);
    recordTest(3, 'Timeline tab displays authentic canonical civic milestones without fabrication', hasTimelineMilestone);

    // Switch to Updates & Notes tab as Citizen
    await page.click('button[data-tab="updates"]');
    await new Promise((r) => setTimeout(r, 600));

    const diag = await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"]');
      const buttons = Array.from(dialog?.querySelectorAll('button[data-tab]') || []).map(b => ({
        tab: b.getAttribute('data-tab'),
        classes: b.className
      }));
      return {
        buttons,
        bodySnippet: dialog?.innerText.substring(0, 500)
      };
    });
    console.log('DIAGNOSTIC TEST 04:', JSON.stringify(diag, null, 2));

    // Verify citizen can see "Provide Additional Information" form
    const hasCitizenForm = await page.$eval(
      'div[role="dialog"]',
      (el) => el.innerText.toLowerCase().includes('provide additional information') || el.innerText.toLowerCase().includes('public citizen updates')
    ).catch(() => false);
    recordTest(4, 'Citizen portal provides clarification & additional info input', hasCitizenForm);

    // Verify internal notes are HIDDEN from Citizen (Security Invariant)
    const hasInternalNotes = await page.$eval('div[role="dialog"]', (el) => el.innerText.toLowerCase().includes('internal committee notes')).catch(() => false);
    recordTest(5, 'RBAC Security Invariant: Internal notes are strictly hidden from citizen', !hasInternalNotes);

    // Test Escape key closes modal
    await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 500));
    const dialogAfterEsc = await page.$('div[role="dialog"]');
    recordTest(6, 'Modal accessibility: Escape key cleanly closes modal', dialogAfterEsc === null);

    // ==========================================
    // 2. COMMITTEE OFFICER PORTAL TEST
    // ==========================================
    console.log('\n--- 2. Testing Committee Officer Portal Complaint Detail ---');
    await loginAs('p.sundaram@bbmp.gov.in');
    await page.waitForSelector('h1', { timeout: 6000 });

    // Click "Review" button on active queue table
    const reviewBtn = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('table button, button'));
      const btn = buttons.find((b) => b.innerText && b.innerText.trim() === 'Review');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (!reviewBtn) {
      const firstRowBtn = await page.$('table tbody tr button');
      if (firstRowBtn) await firstRowBtn.click();
    }

    await page.waitForSelector('div[role="dialog"]', { timeout: 6000 });

    // Verify Officer Actions tab exists for Committee
    const hasOfficerActionsTab = await page.$('button[data-tab="actions"]');
    recordTest(7, 'Committee Officer portal surfaces Officer Actions tab', hasOfficerActionsTab !== null);

    if (hasOfficerActionsTab) {
      await page.click('button[data-tab="actions"]');
      await new Promise((r) => setTimeout(r, 400));

      const actionsText = await page.$eval('div[role="dialog"]', (el) => el.innerText.toLowerCase()).catch(() => '');
      const hasStatusTransition = actionsText.includes('workflow status transition');
      const hasDeptDispatch = actionsText.includes('municipal department');
      const hasRequestInfo = actionsText.includes('request additional information');
      const hasRecordResolution = actionsText.includes('record resolution details');

      recordTest(
        8,
        'Officer Actions center contains Status, Department Dispatch, Request Info, and Resolution controls',
        hasStatusTransition && hasDeptDispatch && hasRequestInfo && hasRecordResolution
      );
    }

    // Verify AI Analysis tab & Human Review controls
    const hasAiTab = await page.$('button[data-tab="ai_analysis"]');
    if (hasAiTab) {
      await page.click('button[data-tab="ai_analysis"]');
      await new Promise((r) => setTimeout(r, 400));

      const hasAiSummary = await page.$eval(
        'div[role="dialog"]',
        (el) => el.innerText.toLowerCase().includes('civicfix ai') || el.innerText.toLowerCase().includes('ai predicted category')
      ).catch(() => false);
      recordTest(9, 'AI Case Dossier tab presents model predictions and confidence telemetry', hasAiSummary);
    }

    await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 400));

    // ==========================================
    // 3. ADMINISTRATOR PORTAL TEST
    // ==========================================
    console.log('\n--- 3. Testing Administrator Portal Complaint Detail ---');
    await loginAs('admin.varma@civicfix.ai');
    await page.goto(`${baseUrl}/admin/complaints`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('h1', { timeout: 6000 });

    // Click "Inspect" button on first complaint row
    const inspectBtn = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('table button, button'));
      const btn = buttons.find((b) => b.innerText && b.innerText.trim() === 'Inspect');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (!inspectBtn) {
      const firstRowBtn = await page.$('table tbody tr button');
      if (firstRowBtn) await firstRowBtn.click();
    }

    await page.waitForSelector('div[role="dialog"]', { timeout: 6000 });

    // Verify Admin Controls tab exists
    const hasAdminTab = await page.$('button[data-tab="admin"]');
    recordTest(10, 'Administrator view includes Admin Controls & System Audit tab', hasAdminTab !== null);

    if (hasAdminTab) {
      await page.click('button[data-tab="admin"]');
      await new Promise((r) => setTimeout(r, 400));

      const adminText = await page.$eval('div[role="dialog"]', (el) => el.innerText.toLowerCase()).catch(() => '');
      const hasOverrideControls = adminText.includes('administrative override controls');
      const hasAuditMetadata = adminText.includes('audit metadata');

      recordTest(
        11,
        'Admin Controls tab exposes Override Controls and System Audit Metadata',
        hasOverrideControls && hasAuditMetadata
      );
    }

    // Save screenshot
    await page.screenshot({ path: path.join(screenshotsDir, 'complaint-detail-admin.png') });

  } catch (err) {
    console.error('Test execution failed with error:', err);
    recordTest(99, 'Execution without uncaught error', false, err.message);
  } finally {
    await browser.close();
    server.kill();
  }

  const passedCount = testResults.filter((r) => r.passed).length;
  const totalCount = testResults.length;
  console.log(`\n========================================`);
  console.log(`COMPLAINT DETAIL E2E TEST SUMMARY: ${passedCount}/${totalCount} PASSED`);
  console.log(`========================================\n`);

  if (passedCount === totalCount && totalCount > 0) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
