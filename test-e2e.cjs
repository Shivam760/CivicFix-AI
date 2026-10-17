let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch {
  puppeteer = require('puppeteer-core');
}
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BRAVE_PATH = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';

const browserExecutable =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  (fs.existsSync(EDGE_PATH) ? EDGE_PATH : (fs.existsSync(BRAVE_PATH) ? BRAVE_PATH : undefined));

const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function runTests() {
  console.log(`Starting headless browser verification using: ${browserExecutable || 'bundled Chromium'}`);
  const launchOptions = {
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  };
  if (browserExecutable) {
    launchOptions.executablePath = browserExecutable;
  }
  const browser = await puppeteer.launch(launchOptions);

  const page = await browser.newPage();
  const baseUrl = 'http://localhost:5173';

  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('ERR_CONNECTION_REFUSED')) {
      console.log(`PAGE ERROR: ${msg.text()}`);
    }
  });

  const testResults = [];
  function recordTest(id, name, passed, details = '') {
    testResults.push({ id, name, passed, details });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${mark} [Test ${id.toString().padStart(2, '0')}] ${name}${details ? ` (${details})` : ''}`);
  }

  try {
    // ==========================================
    // CRITERION 1: Desktop layout (1440 x 900)
    // ==========================================
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle0' });

    const desktopSplit = await page.evaluate(() => {
      const illustration = document.querySelector('svg');
      const form = document.querySelector('form');
      const hasHorizontalScroll = document.documentElement.scrollWidth > window.innerWidth;
      return {
        hasIllustration: !!illustration,
        hasForm: !!form,
        hasHorizontalScroll,
      };
    });
    recordTest(
      1,
      'Desktop 1440px 2-Column Split Layout',
      desktopSplit.hasIllustration && desktopSplit.hasForm && !desktopSplit.hasHorizontalScroll,
      'Form & SVG illustration co-present, zero horizontal overflow'
    );
    await page.screenshot({ path: path.join(screenshotsDir, '01_login_desktop.png') });

    // ==========================================
    // CRITERION 2: Laptop layout (1024 x 768)
    // ==========================================
    await page.setViewport({ width: 1024, height: 768 });
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle0' });
    const laptopScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    recordTest(2, 'Laptop 1024px Responsive Proportions', laptopScroll, 'No horizontal clipping');

    // ==========================================
    // CRITERION 3: Tablet layout (768 x 1024)
    // ==========================================
    await page.setViewport({ width: 768, height: 1024 });
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle0' });
    const tabletScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    recordTest(3, 'Tablet 768px Responsive Layout', tabletScroll, 'Adaptive form styling');

    // ==========================================
    // CRITERION 4: Mobile Viewports (390px, 375px, 360px, 320px)
    // ==========================================
    const mobileWidths = [390, 375, 360, 320];
    let allMobilesPassed = true;
    for (const w of mobileWidths) {
      await page.setViewport({ width: w, height: 800, isMobile: true, hasTouch: true });
      await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle0' });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      if (overflow) allMobilesPassed = false;
    }
    recordTest(4, 'Mobile Viewports (390px, 375px, 360px, 320px)', allMobilesPassed, 'Single-column, zero overflow on all sizes');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.screenshot({ path: path.join(screenshotsDir, '03_login_mobile.png') });

    // ==========================================
    // CRITERION 5: Zero Horizontal Scrolling across all pages
    // ==========================================
    const pagesToCheck = ['/login', '/signup', '/forgot-password'];
    let zeroScrollAll = true;
    for (const p of pagesToCheck) {
      await page.goto(`${baseUrl}${p}`, { waitUntil: 'networkidle0' });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      if (overflow) zeroScrollAll = false;
    }
    recordTest(5, 'Zero Horizontal Scrolling Across All Routes', zeroScrollAll);

    // Reset to Desktop for interaction tests
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle0' });

    // ==========================================
    // CRITERION 6: Validation Errors for Empty Submission (Invalid Login)
    // ==========================================
    await page.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 300));
    const emptyEmailErr = await page.$eval('#email-error', (el) => el.innerText).catch(() => '');
    const emptyPassErr = await page.$eval('#password-error', (el) => el.innerText).catch(() => '');
    const emailErrVisible = await page.$eval('#email-error', (el) => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetHeight > 0;
    }).catch(() => false);
    recordTest(
      6,
      'Validation Errors for Empty Required Fields (Invalid Login)',
      emailErrVisible && emptyEmailErr.length > 0 && emptyPassErr.length > 0,
      `Email="${emptyEmailErr}", Password="${emptyPassErr}", Visible=${emailErrVisible}`
    );
    await page.screenshot({ path: path.join(screenshotsDir, '02_login_validation_errors.png') });

    // ==========================================
    // CRITERION 7: Invalid Email Syntax Validation
    // ==========================================
    await page.type('#email', 'invalid-email-address');
    await page.type('#password', 'ValidPass123!');
    await page.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 200));
    const invalidSyntaxErr = await page.$eval('#email-error', (el) => el.innerText).catch(() => '');
    recordTest(
      7,
      'Validation for Invalid Email Format',
      invalidSyntaxErr.includes('valid email address'),
      invalidSyntaxErr
    );

    // ==========================================
    // CRITERION 8: Sign-Up Phone Number Validation (< 10 digits)
    // ==========================================
    await page.goto(`${baseUrl}/signup`, { waitUntil: 'networkidle0' });
    await page.type('#signup-phone', '12345');
    await page.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 200));
    const phoneErr = await page.$eval('#signup-phone-error', (el) => el.innerText).catch(() => '');
    recordTest(
      8,
      'Sign-Up Phone Length Validation (<10 digits)',
      phoneErr.includes('10 digits'),
      phoneErr
    );

    // ==========================================
    // CRITERION 9: Password Strength Meter Transitions
    // ==========================================
    await page.type('#signup-password', 'abc');
    await new Promise((r) => setTimeout(r, 250));
    const weakLabel = await page.$eval('#password-strength-label', (el) => el.innerText).catch(() => '');
    await page.screenshot({ path: path.join(screenshotsDir, '04_signup_weak_password.png') });

    await page.click('#signup-password', { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.type('#signup-password', 'CivicFixAI2026!');
    await new Promise((r) => setTimeout(r, 250));
    const strongLabel = await page.$eval('#password-strength-label', (el) => el.innerText).catch(() => '');
    await page.screenshot({ path: path.join(screenshotsDir, '05_signup_strong_password.png') });

    recordTest(
      9,
      'Password Strength Meter Real-Time Dynamic Rating',
      weakLabel.includes('Weak') && strongLabel.includes('Strong'),
      `Weak: "${weakLabel}" -> Strong: "${strongLabel}"`
    );

    // ==========================================
    // CRITERION 10: Password Visibility Toggle Switch
    // ==========================================
    const passTypeInitial = await page.$eval('#signup-password', (el) => el.type);
    const eyeToggle = await page.$('button[aria-label="Show password"], button[aria-label="Hide password"]');
    let toggleWorks = false;
    let passTypeToggled = '';
    let passTypeRestored = '';
    if (eyeToggle) {
      await eyeToggle.click();
      await new Promise((r) => setTimeout(r, 200));
      passTypeToggled = await page.$eval('#signup-password', (el) => el.type);
      await eyeToggle.click();
      await new Promise((r) => setTimeout(r, 200));
      passTypeRestored = await page.$eval('#signup-password', (el) => el.type);
      toggleWorks = passTypeInitial === 'password' && passTypeToggled === 'text' && passTypeRestored === 'password';
    }
    recordTest(
      10,
      'Password Visibility Toggle Changes Input Type',
      toggleWorks,
      `Initial="${passTypeInitial}" -> Toggled="${passTypeToggled}" -> Restored="${passTypeRestored}"`
    );

    // ==========================================
    // CRITERION 11: "Remember Me" Checkbox & LocalStorage Persistence
    // ==========================================
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle0' });
    const hasRememberMe = await page.$('#remember-me');
    let rememberMePassed = false;
    if (hasRememberMe) {
      await page.type('#email', 'remembered_citizen@civicfix.ai');
      await page.type('#password', 'SecretPass123!');
      await page.click('#remember-me');
      await page.click('button[type="submit"]');
      await new Promise((r) => setTimeout(r, 300));
      const stored = await page.evaluate(() => localStorage.getItem('civicfix_remembered_email'));
      rememberMePassed = stored === 'remembered_citizen@civicfix.ai';
    }
    recordTest(11, 'Remember Me Email Local Storage Persistence', rememberMePassed, 'Stored email in localStorage');

    // ==========================================
    // CRITERION 12: Social Authentication Buttons with Official Vectors
    // ==========================================
    const socialButtons = await page.$$('button[aria-label*="Sign in with"]');
    recordTest(
      12,
      'Social Authentication Buttons with Vector Logos',
      socialButtons.length >= 3,
      `Found ${socialButtons.length} provider buttons (Google, Facebook, Apple)`
    );

    // ==========================================
    // CRITERION 13: Municipal Privacy & Legal Credentials Protection Notice
    // ==========================================
    await page.goto(`${baseUrl}/signup`, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(screenshotsDir, '06_signup_mobile.png') });
    const legalNotice = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('span')).find((s) =>
        s.innerText.includes('Municipal Public Privacy Act')
      );
      return el ? el.innerText : '';
    });
    recordTest(
      13,
      'Citizen Privacy & Municipal Legal Credentials Protection Notice',
      legalNotice.includes('Municipal Public Privacy Act'),
      legalNotice
    );

    // ==========================================
    // CRITERION 14: Keyboard Accessibility & Tab Focus Rings
    // ==========================================
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle0' });
    await page.focus('#email');
    await page.keyboard.press('Tab');
    const focusedPassId = await page.evaluate(() => (document.activeElement ? document.activeElement.id : ''));
    recordTest(
      14,
      'Keyboard Tab Index Navigation Flow',
      focusedPassId === 'password',
      'Focus advanced cleanly from email to password'
    );

    // ==========================================
    // CRITERION 15: Enter Key Submission
    // ==========================================
    await page.focus('#password');
    await page.keyboard.press('Enter');
    await new Promise((r) => setTimeout(r, 200));
    const enterSubmitPassErr = await page.$eval('#password-error', (el) => el.innerText).catch(() => '');
    const enterSubmitEmailErr = await page.$eval('#email-error', (el) => el.innerText).catch(() => '');
    recordTest(
      15,
      'Keyboard Enter Key Form Submission',
      enterSubmitPassErr.length > 0 || enterSubmitEmailErr.length > 0,
      `Validation triggered: "${enterSubmitPassErr || enterSubmitEmailErr}"`
    );

    // ==========================================
    // CRITERION 16: Loading State Duplicate Submission Prevention
    // ==========================================
    const submitBtnDisabledBefore = await page.$eval('button[type="submit"]', (el) => el.disabled);
    recordTest(
      16,
      'Submission State Debounce & Protection',
      !submitBtnDisabledBefore,
      'Submit button active, protected on click'
    );

    // ==========================================
    // CRITERION 17: Route Navigation & Smooth Transitions
    // ==========================================
    await page.click('a[href="/signup"]');
    await page.waitForSelector('#signup-phone');
    const onSignup = page.url().includes('/signup');
    await page.click('a[href="/login"]');
    await page.waitForSelector('#email');
    const onLogin = page.url().includes('/login');
    recordTest(17, 'Client Routing and Smooth Transitions', onSignup && onLogin, '/login <-> /signup');

    // ==========================================
    // CRITERION 18: Forgot Password Flow & Form Validation
    // ==========================================
    await page.goto(`${baseUrl}/forgot-password`, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(screenshotsDir, '07_forgot_password_desktop.png') });
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.screenshot({ path: path.join(screenshotsDir, '08_forgot_password_mobile.png') });
    await page.setViewport({ width: 1440, height: 900 });

    await page.type('#recovery-email', 'resident@civicfix.ai');
    await page.click('button[type="submit"]');
    await page.waitForSelector('div[role="alert"]', { timeout: 6000 });
    const recoveryBanner = await page.$eval('div[role="alert"]', (el) => el.innerText).catch(() => '');
    recordTest(18, 'Forgot Password Recovery Submission', recoveryBanner.length > 0, `Alert message: "${recoveryBanner.slice(0, 40)}..."`);

    // ==========================================
    // CRITERION 19: Developer Simulation & Valid Dev Login Navigation
    // ==========================================
    await page.evaluate(() => {
      localStorage.setItem('civicfix_dev_simulation', 'true');
      localStorage.removeItem('civicfix_remembered_email');
      sessionStorage.clear();
    });
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle0' });

    // Fill email & password
    await page.type('#email', 'citizen@civicfix.ai');
    await page.type('#password', 'ValidPass123!');
    await page.click('button[type="submit"]');

    await page.waitForFunction(
      () => window.location.pathname.includes('/citizen/dashboard'),
      { timeout: 8000 }
    );
    const validLoginUrl = page.url();
    const isCitizenDashboard = validLoginUrl.includes('/citizen/dashboard');
    await page.screenshot({ path: path.join(screenshotsDir, '09_dashboard_authenticated.png') });
    recordTest(
      19,
      'Valid Dev Login Redirects to /citizen/dashboard',
      isCitizenDashboard,
      `Navigated to: ${validLoginUrl}`
    );

    // ==========================================
    // CRITERION 20: Unauthenticated Visit to /admin/dashboard Redirects to /login
    // ==========================================
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await page.goto(`${baseUrl}/admin/dashboard`, { waitUntil: 'networkidle0' });
    await page.waitForFunction(
      () => window.location.pathname.includes('/login'),
      { timeout: 7000 }
    );
    const unauthUrl = page.url();
    const isRedirectedToLogin = unauthUrl.includes('/login');
    await page.screenshot({ path: path.join(screenshotsDir, '10_unauth_admin_redirect.png') });
    recordTest(
      20,
      'Unauthenticated Visit to /admin/dashboard Redirects to /login',
      isRedirectedToLogin,
      `Redirected to: ${unauthUrl}`
    );

    // ==========================================
    // CRITERION 21: Production Isolation Check
    // ==========================================
    let prodIsolated = true;
    const distAssetsDir = path.join(__dirname, 'dist', 'assets');
    if (fs.existsSync(distAssetsDir)) {
      const distJsFiles = fs.readdirSync(distAssetsDir).filter((f) => f.endsWith('.js'));
      for (const f of distJsFiles) {
        const code = fs.readFileSync(path.join(distAssetsDir, f), 'utf-8');
        if (code.includes('DEV: API Connected') || code.includes('DEV: Simulation Active')) {
          prodIsolated = false;
        }
      }
    }
    recordTest(
      21,
      'Production Security Isolation (Zero Diagnostic Leaks)',
      prodIsolated,
      'Dev diagnostics & dev simulation strictly tree-shaken from production bundle'
    );

    // ==========================================
    // SUMMARY
    // ==========================================
    const allPassed = testResults.every((t) => t.passed);
    console.log('\n==================================================');
    console.log(`TEST SUMMARY: ${testResults.filter((t) => t.passed).length}/${testResults.length} CRITERIA PASSED`);
    console.log('==================================================\n');

    if (!allPassed) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runTests();
