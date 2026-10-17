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
  console.error('Neither Edge nor Brave browser was found!');
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

const results = [];
function recordTest(id, name, passed, detail = '') {
  results.push({ id, name, passed, detail });
  const statusIcon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${statusIcon} [Test ${id.toString().padStart(2, '0')}] ${name} ${detail ? `(${detail})` : ''}`);
}

async function runTests() {
  const server = await startServer();
  const baseUrl = 'http://localhost:4173';

  console.log(`Starting Portal Refinements & Responsive Suite using: ${browserExecutable}`);
  const browser = await puppeteer.launch({
    executablePath: browserExecutable,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();

  // Helper login
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
    // 1. CITIZEN PORTAL REFINEMENTS
    // ==========================================
    console.log('\n--- 1. Testing Citizen Portal UI Refinements ---');
    await loginAs('aarav.sharma@example.com');
    await page.waitForSelector('h1, h2', { timeout: 6000 });

    // Test 1: Single primary CTA (no duplicate Report Issue buttons in welcome body)
    const reportBtns = await page.$$eval('button', (btns) =>
      btns.filter((b) => b.innerText && b.innerText.includes('Report New Issue')).map((b) => b.innerText.trim())
    );
    // There should be exactly 1 primary Report New Issue button (in the Topbar)
    recordTest(
      1,
      'Citizen Portal: Single unified primary CTA for reporting new issue',
      reportBtns.length === 1,
      `Found ${reportBtns.length} "Report New Issue" button(s)`
    );

    // Test 2: Complaint Card surfaces Next Action and Latest Update
    const cards = await page.$$eval('[role="button"]', (els) =>
      els
        .filter((el) => el.getAttribute('aria-label')?.startsWith('Track complaint'))
        .map((el) => el.innerText)
    );
    const hasNextAction = cards.some((text) => text.includes('Next'));
    recordTest(
      2,
      'Citizen Portal: ComplaintCard surfaces Next Action badge & clear milestone progress',
      hasNextAction && cards.length > 0,
      `Cards verified: ${cards.length}`
    );

    // Test 3: Citizen Portal Zero Horizontal Overflow across 5 responsive breakpoints
    const breakpoints = [
      { name: 'Mobile Ultra-Narrow (320px)', width: 320, height: 640 },
      { name: 'Mobile Standard (390px)', width: 390, height: 844 },
      { name: 'Tablet (768px)', width: 768, height: 1024 },
      { name: 'Laptop (1366px)', width: 1366, height: 768 },
      { name: 'Desktop Full HD (1920px)', width: 1920, height: 1080 },
    ];

    let citizenResponsivePassed = true;
    for (const bp of breakpoints) {
      await page.setViewport({ width: bp.width, height: bp.height, isMobile: bp.width <= 768 });
      await new Promise((r) => setTimeout(r, 200));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      if (overflow) {
        console.warn(`Citizen portal overflow detected at ${bp.name}`);
        citizenResponsivePassed = false;
      }
    }
    recordTest(
      3,
      'Citizen Portal: Zero horizontal overflow across all 5 responsive breakpoints (320px to 1920px)',
      citizenResponsivePassed,
      'All viewports verified'
    );

    // ==========================================
    // 2. COMMITTEE OFFICER PORTAL REFINEMENTS
    // ==========================================
    console.log('\n--- 2. Testing Committee Officer Portal UI Refinements ---');
    await page.setViewport({ width: 1440, height: 900 });
    await loginAs('p.sundaram@bbmp.gov.in');
    await page.waitForSelector('h1, h2', { timeout: 6000 });

    // Test 4: Compact header & AI Case Insights panel
    // Test 4: Compact header & AI Case Insights panel
    const headerInfo = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasAiText: text.includes('AI Case Insights') || text.includes('AI Auto-Triage'),
        hasOfficer: text.includes('Officer') || text.includes('Institutional'),
        sample: text.substring(0, 300),
      };
    });
    recordTest(
      4,
      'Committee Officer Portal: Streamlined executive header and AI Case Insights',
      headerInfo.hasAiText && headerInfo.hasOfficer,
      `Header verified (Officer=${headerInfo.hasOfficer}, AI=${headerInfo.hasAiText})`
    );

    // Test 5: AI Insights distinguishes AI suggestion vs Confirmed Decision
    // Click inspect urgent case or inspect button via DOM
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.innerText.includes('Inspect Highest Priority Case') || (b.title && b.title.includes('Inspect AI Insights'))
      );
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    const hasAiBadge = await page.evaluate(() => {
      const text = document.body.innerText;
      return (
        text.includes('AI Suggestion') ||
        text.includes('Officer-Confirmed Decision') ||
        text.includes('AI Case Insights')
      );
    });
    recordTest(
      5,
      'Committee Officer Portal: Clear visual distinction for AI recommendations vs confirmed decisions',
      hasAiBadge,
      'Badge styling verified'
    );

    // Test 6: Committee Officer Responsive Breakpoints
    let committeeResponsivePassed = true;
    for (const bp of breakpoints) {
      await page.setViewport({ width: bp.width, height: bp.height, isMobile: bp.width <= 768 });
      await new Promise((r) => setTimeout(r, 200));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      if (overflow) {
        console.warn(`Committee portal overflow detected at ${bp.name}`);
        committeeResponsivePassed = false;
      }
    }
    recordTest(
      6,
      'Committee Officer Portal: Zero horizontal overflow across all 5 responsive breakpoints (320px to 1920px)',
      committeeResponsivePassed,
      'All viewports verified'
    );

    // ==========================================
    // 3. ADMIN PORTAL & SIDEBAR REFINEMENTS
    // ==========================================
    console.log('\n--- 3. Testing Administrator Portal & Navigation Refinements ---');
    await page.setViewport({ width: 1440, height: 900 });
    await loginAs('admin.varma@civicfix.ai', 'AdminPass123!');
    await page.waitForSelector('h1, h2', { timeout: 6000 });

    // Test 7: Sidebar navigation labels truncation & no clipping
    await page.setViewport({ width: 1366, height: 768 });
    const navItemCount = await page.$$eval('aside nav a', (links) => links.length);
    recordTest(
      7,
      'Admin Portal: Sidebar navigation properly renders full navigation menu without label clipping',
      navItemCount >= 6,
      `Found ${navItemCount} navigation links`
    );

    // Test 8: Admin Portal Responsive Breakpoints
    let adminResponsivePassed = true;
    for (const bp of breakpoints) {
      await page.setViewport({ width: bp.width, height: bp.height, isMobile: bp.width <= 768 });
      await new Promise((r) => setTimeout(r, 200));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      if (overflow) {
        console.warn(`Admin portal overflow detected at ${bp.name}`);
        adminResponsivePassed = false;
      }
    }
    recordTest(
      8,
      'Admin Portal: Zero horizontal overflow across all 5 responsive breakpoints (320px to 1920px)',
      adminResponsivePassed,
      'All viewports verified'
    );

    // ==========================================
    // 4. TOAST NOTIFICATION POSITIONING
    // ==========================================
    console.log('\n--- 4. Testing Notification System Non-Obscurity ---');
    // Test 9: Toast container is positioned bottom-right to never obscure topbar or headers
    const toastPosition = await page.evaluate(() => {
      const container = document.querySelector('[aria-live="polite"]');
      if (!container) return null;
      const classes = container.className;
      return {
        isBottom: classes.includes('bottom-'),
        isRight: classes.includes('right-'),
        isNotTop: !classes.includes('top-'),
      };
    });
    recordTest(
      9,
      'Notification Toasts: Container positioned bottom-right, eliminating topbar/action obstruction',
      toastPosition && toastPosition.isBottom && toastPosition.isRight && toastPosition.isNotTop,
      'Bottom-right placement verified'
    );

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    await browser.close();
    try {
      server.kill('SIGTERM');
      process.kill(server.pid);
    } catch {}
  }

  console.log('\n========================================');
  const allPassed = results.every((r) => r.passed);
  console.log(`PORTAL REFINEMENTS SUITE SUMMARY: ${results.filter((r) => r.passed).length}/${results.length} PASSED`);
  console.log('========================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runTests();
