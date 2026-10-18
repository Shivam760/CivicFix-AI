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

async function run() {
  console.log('Spawning vite preview on port 4188...');
  const child = spawn('npx', ['vite', 'preview', '--port', '4188', '--strictPort'], {
    cwd: __dirname,
    shell: true,
    stdio: 'ignore',
  });

  await new Promise((r) => setTimeout(r, 2000));

  try {
    const browser = await puppeteer.launch({
      executablePath: browserExecutable,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    // 1. Ultra-Wide Desktop 1920x1080
    console.log('Testing 1920x1080 wide desktop...');
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto('http://localhost:4188/', { waitUntil: 'networkidle0', timeout: 30000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(screenshotsDir, 'landing-1920-hero.png'), fullPage: false });

    // Scroll to How It Works & Live Map
    await page.evaluate(() => {
      const el = document.querySelector('#live-map');
      if (el) el.scrollIntoView();
    });
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(screenshotsDir, 'landing-1920-livemap.png'), fullPage: false });

    // Scroll to Product Showcase
    await page.evaluate(() => {
      const el = document.querySelector('#product-showcase');
      if (el) el.scrollIntoView();
    });
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(screenshotsDir, 'landing-1920-showcase.png'), fullPage: false });

    // 2. Standard Desktop 1440x900
    console.log('Testing 1440x900 standard desktop...');
    await page.setViewport({ width: 1440, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: path.join(screenshotsDir, 'landing-1440-hero.png'), fullPage: false });

    // 3. Mobile Viewport 390x844
    console.log('Testing 390x844 mobile...');
    await page.setViewport({ width: 390, height: 844, isMobile: true });
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: path.join(screenshotsDir, 'landing-mobile-hero.png'), fullPage: false });

    await browser.close();
    console.log('Verification completed successfully! All screenshots saved in ./screenshots');
  } finally {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', child.pid, '/f', '/t'], { shell: true });
      } else {
        child.kill();
      }
    } catch {}
  }
}

run().catch((err) => {
  console.error('Error running wide test:', err);
  process.exit(1);
});
