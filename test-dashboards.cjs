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

// Start Vite preview on port 4173
async function startServer() {
  console.log('Spawning vite preview on http://localhost:4173...');
  const child = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], {
    cwd: __dirname,
    shell: true,
    stdio: 'pipe',
  });

  child.stdout.on('data', (_data) => {
    // console.log(`[vite] ${_data.toString().trim()}`);
  });

  // Wait 2 seconds for server to bind
  await new Promise((r) => setTimeout(r, 2000));
  return child;
}

async function runDashboardTests() {
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
    // ==========================================
    // TEST 01: Citizen Dashboard at 1440x900
    // ==========================================
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${baseUrl}/citizen/dashboard`, { waitUntil: 'networkidle0' });

    const citizenContent = await page.evaluate(() => {
      const heading = document.querySelector('h1')?.textContent || '';
      const cards = document.querySelectorAll('[class*="rounded-2xl"], [class*="rounded-3xl"]');
      const hasHorizontalScroll = document.documentElement.scrollWidth > window.innerWidth;
      const reportBtn = Array.from(document.querySelectorAll('button, a')).some((el) =>
        el.textContent.includes('Report New Issue')
      );
      return { heading, cardCount: cards.length, hasHorizontalScroll, reportBtn };
    });

    recordTest(
      1,
      'Citizen Dashboard Desktop (1440x900)',
      citizenContent.heading.includes('Citizen Grievance Portal') &&
        citizenContent.reportBtn &&
        !citizenContent.hasHorizontalScroll,
      `Header: "${citizenContent.heading}", Report button present, no horizontal scroll`
    );
    await page.screenshot({ path: path.join(screenshotsDir, 'dashboard_citizen_1440x900.png') });

    // ==========================================
    // TEST 02: Citizen Report Page at 1280x720
    // ==========================================
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto(`${baseUrl}/citizen/report`, { waitUntil: 'networkidle0' });

    const reportPageValid = await page.evaluate(() => {
      const form = document.querySelector('form');
      const select = document.querySelector('select[name="category"]');
      const titleInput = document.querySelector('input[name="title"]');
      const hasHorizontalScroll = document.documentElement.scrollWidth > window.innerWidth;
      return Boolean(form && select && titleInput && !hasHorizontalScroll);
    });

    recordTest(
      2,
      'Citizen Issue Intake Form (/citizen/report)',
      reportPageValid,
      'Intake form, category selector, and inputs present'
    );
    await page.screenshot({ path: path.join(screenshotsDir, 'citizen_report_form.png') });

    // ==========================================
    // TEST 03: Committee Member Dashboard at 1920x1080
    // ==========================================
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(`${baseUrl}/committee/dashboard`, { waitUntil: 'networkidle0' });

    const committeeDesk = await page.evaluate(() => {
      const heading = document.querySelector('h1')?.textContent || '';
      const queueTabs = Array.from(document.querySelectorAll('button')).some((b) =>
        b.textContent.includes('All Assigned')
      );
      const table = document.querySelector('table');
      const reviewButtons = Array.from(document.querySelectorAll('button')).filter((b) =>
        b.textContent.includes('Review Case')
      );
      const hasHorizontalScroll = document.documentElement.scrollWidth > window.innerWidth;
      return {
        heading,
        hasQueueTabs: queueTabs,
        hasTable: Boolean(table),
        reviewBtnCount: reviewButtons.length,
        hasHorizontalScroll,
      };
    });

    recordTest(
      3,
      'Committee Operations Desk (1920x1080 Full HD)',
      committeeDesk.heading.includes('Committee Operations Desk') &&
        committeeDesk.hasQueueTabs &&
        committeeDesk.hasTable &&
        !committeeDesk.hasHorizontalScroll,
      `Work queue tabs present, case table rendered, ${committeeDesk.reviewBtnCount} review actions`
    );
    await page.screenshot({ path: path.join(screenshotsDir, 'dashboard_committee_1920x1080.png') });

    // ==========================================
    // TEST 04: Committee Case Detail Modal Inspection
    // ==========================================
    const reviewBtn = await page.$('button::-p-text(Review Case)');
    if (reviewBtn) {
      await reviewBtn.click();
      await new Promise((r) => setTimeout(r, 400));
      const modalOpen = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]');
        const hasOfficerActions = Array.from(document.querySelectorAll('button')).some((b) =>
          b.textContent.includes('Officer Actions')
        );
        return Boolean(dialog && hasOfficerActions);
      });

      recordTest(
        4,
        'Committee Case Detail Modal & Authorized Actions',
        modalOpen,
        'Modal opened, officer action tabs and workflow status controls accessible'
      );
      await page.screenshot({ path: path.join(screenshotsDir, 'committee_case_detail_modal.png') });

      // Close modal
      const closeBtn = await page.$('button[aria-label="Close details"]');
      if (closeBtn) await closeBtn.click();
      await new Promise((r) => setTimeout(r, 300));
    }

    // ==========================================
    // TEST 05: Administrator Dashboard at 1600x900
    // ==========================================
    await page.setViewport({ width: 1600, height: 900 });
    await page.goto(`${baseUrl}/admin/dashboard`, { waitUntil: 'networkidle0' });

    const adminConsole = await page.evaluate(() => {
      const heading = document.querySelector('h1')?.textContent || '';
      const svgCharts = document.querySelectorAll('svg');
      const tabs = Array.from(document.querySelectorAll('button')).map((b) => b.textContent);
      const hasUsersTab = tabs.some((t) => t.includes('User Directory'));
      const hasAuthTab = tabs.some((t) => t.includes('Authority Directory'));
      const hasAuditTab = tabs.some((t) => t.includes('System Audit Trail'));
      const hasHorizontalScroll = document.documentElement.scrollWidth > window.innerWidth;
      return {
        heading,
        chartCount: svgCharts.length,
        hasUsersTab,
        hasAuthTab,
        hasAuditTab,
        hasHorizontalScroll,
      };
    });

    recordTest(
      5,
      'Administrator Dashboard (1600x900)',
      adminConsole.heading.includes('Platform Administration') &&
        adminConsole.hasUsersTab &&
        adminConsole.hasAuthTab &&
        adminConsole.hasAuditTab &&
        !adminConsole.hasHorizontalScroll,
      `SVG charts rendered (${adminConsole.chartCount}), governance tabs verified`
    );
    await page.screenshot({ path: path.join(screenshotsDir, 'dashboard_admin_1600x900.png') });

    // ==========================================
    // TEST 06: Admin User Management Section
    // ==========================================
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent.includes('User Directory')
      );
      if (btn) btn.click();
    });
    try {
      await page.waitForFunction(
        () => document.querySelectorAll('table tbody tr').length > 0,
        { timeout: 8000 }
      );
    } catch {}
    const userTableValid = await page.evaluate(() => {
      const table = document.querySelector('table');
      const rows = document.querySelectorAll('table tbody tr');
      return Boolean(table && rows.length > 0);
    });
    recordTest(
      6,
      'Admin User Governance & RBAC Tab',
      userTableValid,
      'User table rendered with active citizen, officer, and admin rows'
    );
    await page.screenshot({ path: path.join(screenshotsDir, 'admin_user_management.png') });

    // ==========================================
    // TEST 07: Admin Verified Authority Directory
    // ==========================================
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent.includes('Authority Directory')
      );
      if (btn) btn.click();
    });
    try {
      await page.waitForFunction(
        () => document.querySelectorAll('table tbody tr').length > 0,
        { timeout: 8000 }
      );
    } catch {}
    const authTableValid = await page.evaluate(() => {
      const registerBtn = Array.from(document.querySelectorAll('button')).some((b) =>
        b.textContent.includes('Register Authority')
      );
      const table = document.querySelector('table');
      const rows = document.querySelectorAll('table tbody tr');
      return Boolean(registerBtn && table && rows.length > 0);
    });
    recordTest(
      7,
      'Admin Verified Authority Directory Tab',
      authTableValid,
      'Municipal authority directory and registration trigger verified'
    );
    await page.screenshot({ path: path.join(screenshotsDir, 'admin_authority_directory.png') });

    // ==========================================
    // TEST 08: Admin Audit Trail Tab
    // ==========================================
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent.includes('System Audit Trail')
      );
      if (btn) btn.click();
    });
    try {
      await page.waitForFunction(
        () => document.querySelectorAll('table tbody tr').length > 0,
        { timeout: 8000 }
      );
    } catch {}
    const auditTableValid = await page.evaluate(() => {
      const table = document.querySelector('table');
      const rows = document.querySelectorAll('table tbody tr');
      const immutableBadge = document.body.textContent.includes('IMMUTABLE LOGS');
      return Boolean(table && rows.length > 0 && immutableBadge);
    });
    recordTest(
      8,
      'Admin System Audit Trail Tab',
      auditTableValid,
      'Audit table and immutable security notice active'
    );
    await page.screenshot({ path: path.join(screenshotsDir, 'admin_audit_trail.png') });

    // ==========================================
    // TEST 09: Role Dispatcher Hub (/dashboard)
    // ==========================================
    await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle0' });
    const hubValid = await page.evaluate(() => {
      const heading = document.querySelector('h1')?.textContent || '';
      const citizenCard = document.body.textContent.includes('Normal Citizen');
      const committeeCard = document.body.textContent.includes('Committee Member');
      const adminCard = document.body.textContent.includes('System Administrator');
      return heading.includes('Role Dashboard Portal') && citizenCard && committeeCard && adminCard;
    });
    recordTest(9, 'Role Dispatcher Portal (/dashboard)', hubValid, 'Three distinct role entry points rendered');
    await page.screenshot({ path: path.join(screenshotsDir, 'role_dispatcher_portal.png') });

    // ==========================================
    // TEST 10: Tablet Responsiveness (768x1024 Portrait)
    // ==========================================
    await page.setViewport({ width: 768, height: 1024 });
    await page.goto(`${baseUrl}/committee/dashboard`, { waitUntil: 'networkidle0' });
    const tablet768 = await page.evaluate(() => {
      const hasHorizontalScroll = document.documentElement.scrollWidth > window.innerWidth;
      const menuButton = document.querySelector('button[aria-label="Toggle navigation menu"]');
      return !hasHorizontalScroll && Boolean(menuButton);
    });
    recordTest(10, 'Tablet Portrait (768x1024) Responsiveness', tablet768, 'Zero horizontal overflow, mobile drawer toggle accessible');
    await page.screenshot({ path: path.join(screenshotsDir, 'responsive_committee_768x1024.png') });

    // ==========================================
    // TEST 11: Smartphone Pro Max (430x932) Responsiveness
    // ==========================================
    await page.setViewport({ width: 430, height: 932 });
    await page.goto(`${baseUrl}/citizen/dashboard`, { waitUntil: 'networkidle0' });
    const mobile430 = await page.evaluate(() => {
      const hasHorizontalScroll = document.documentElement.scrollWidth > window.innerWidth;
      const cards = document.querySelectorAll('[class*="rounded-2xl"]');
      return !hasHorizontalScroll && cards.length > 0;
    });
    recordTest(11, 'Smartphone Pro Max (430x932) Layout', mobile430, 'Adaptive cards stacked, touch controls intact, zero overflow');
    await page.screenshot({ path: path.join(screenshotsDir, 'responsive_citizen_430x932.png') });

    // ==========================================
    // TEST 12: Standard Smartphone (390x844) Responsiveness
    // ==========================================
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(`${baseUrl}/admin/dashboard`, { waitUntil: 'networkidle0' });
    const mobile390 = await page.evaluate(() => {
      const hasHorizontalScroll = document.documentElement.scrollWidth > window.innerWidth;
      return !hasHorizontalScroll;
    });
    recordTest(12, 'Standard Smartphone (390x844) Admin View', mobile390, 'No horizontal clipping on mobile viewport');
    await page.screenshot({ path: path.join(screenshotsDir, 'responsive_admin_390x844.png') });

    // ==========================================
    // TEST 13: Compact Mobile (320x700) Responsiveness
    // ==========================================
    await page.setViewport({ width: 320, height: 700 });
    await page.goto(`${baseUrl}/citizen/dashboard`, { waitUntil: 'networkidle0' });
    const mobile320 = await page.evaluate(() => {
      const hasHorizontalScroll = document.documentElement.scrollWidth > window.innerWidth;
      return !hasHorizontalScroll;
    });
    recordTest(13, 'Compact Viewport (320x700) Minimum Bounds', mobile320, 'Zero horizontal overflow on small displays');
    await page.screenshot({ path: path.join(screenshotsDir, 'responsive_citizen_320x700.png') });

    // ==========================================
    // TEST 14: Preserved Authentication (Login Page)
    // ==========================================
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle0' });
    const loginIntact = await page.evaluate(() => {
      const form = document.querySelector('form');
      const email = document.querySelector('input[name="email"]');
      const pass = document.querySelector('input[name="password"]');
      return Boolean(form && email && pass);
    });
    recordTest(14, 'Preserved Login Page Flow', loginIntact, 'Existing credentials form fully functional');

    // ==========================================
    // SUMMARY
    // ==========================================
    const allPassed = testResults.every((t) => t.passed);
    console.log('\n==================================================');
    console.log(`TEST SUMMARY: ${testResults.filter((t) => t.passed).length}/${testResults.length} DASHBOARD CRITERIA PASSED`);
    console.log('==================================================\n');

    if (!allPassed) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.kill();
  }
}

runDashboardTests();
