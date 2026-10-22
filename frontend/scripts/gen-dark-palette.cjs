// Generates src/styles/dark-palette.css. Re-run after adding new fixed
// colours (classes like bg-[#FAF6EE]):  npm run gen:dark   (in frontend/)
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
const OUT = path.join(SRC, 'styles/dark-palette.css');
const S = '[data-theme="dark"]';
const lines = [];

const esc = (cls) => cls.replace(/[:/[\]#.]/g, (c) => `\\${c}`);
function rule(cls, decl, { hover = false, groupHover = false } = {}) {
  if (groupHover) lines.push(`${S} .group:hover .${esc(`group-hover:${cls}`)} { ${decl} }`);
  else if (hover) lines.push(`${S} .${esc(`hover:${cls}`)}:hover { ${decl} }`);
  else lines.push(`${S} .${esc(cls)} { ${decl} }`);
}

// ---- 1. Tailwind palette tints (bg-emerald-50, text-stone-800, ...) ----------
const colors = ['emerald', 'teal', 'green', 'amber', 'yellow', 'orange', 'rose', 'red', 'blue', 'sky', 'indigo', 'purple', 'stone', 'slate', 'gray', 'zinc'];
const bg = { 50: 14, 100: 20, 200: 30 };
const border = { 100: 22, 200: 32, 300: 45, 400: 60 };
const text = { 600: 100, 700: 92, 800: 80, 900: 68, 950: 58 };

for (const c of colors) {
  const mid = `var(--color-${c}-500)`;
  const light = `var(--color-${c}-400)`;
  for (const [shade, pct] of Object.entries(bg)) {
    const v = `background-color: color-mix(in oklab, ${mid} ${pct}%, var(--color-surface));`;
    rule(`bg-${c}-${shade}`, v);
    rule(`bg-${c}-${shade}`, v, { hover: true });
    for (const a of [50, 60, 70, 80, 90]) {
      rule(`bg-${c}-${shade}/${a}`, `background-color: color-mix(in oklab, ${mid} ${Math.round((pct * a) / 100)}%, var(--color-surface));`);
    }
  }
  for (const [shade, pct] of Object.entries(border)) {
    const v = `border-color: color-mix(in oklab, ${mid} ${pct}%, var(--color-border));`;
    rule(`border-${c}-${shade}`, v);
    rule(`border-${c}-${shade}`, v, { hover: true });
    for (const a of [50, 60, 80]) rule(`border-${c}-${shade}/${a}`, v);
  }
  for (const [shade, pct] of Object.entries(text)) {
    const v = `color: color-mix(in oklab, ${light} ${pct}%, white);`;
    rule(`text-${c}-${shade}`, v);
    rule(`text-${c}-${shade}`, v, { hover: true });
    rule(`text-${c}-${shade}`, v, { groupHover: true });
  }
}
for (const g of ['stone', 'slate', 'gray', 'zinc']) {
  for (const shade of [800, 900, 950]) rule(`text-${g}-${shade}`, 'color: var(--color-navy);');
  for (const shade of [400, 500, 600, 700]) rule(`text-${g}-${shade}`, 'color: var(--color-muted);');
}
for (const a of ['', '/50', '/60', '/70', '/80', '/90', '/95']) {
  rule(`bg-white${a}`, 'background-color: var(--color-surface-raised);');
}
rule('bg-white', 'background-color: var(--color-surface-raised);', { hover: true });
rule('from-white', '--tw-gradient-from: var(--color-surface);');
rule('to-white', '--tw-gradient-to: var(--color-surface);');

// ---- 2. Fixed hex colours (bg-[#FAF6EE], text-[#181A20], ...) ----------------
function hexToHsl(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let s = 0, hue = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    hue = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    hue *= 60;
  }
  return { h: hue, s, l };
}
const hsl = ({ h, s, l }, alpha) =>
  `hsl(${h.toFixed(0)} ${(s * 100).toFixed(0)}% ${(l * 100).toFixed(0)}%${alpha != null ? ` / ${alpha}` : ''})`;

// kind: 'bg' (backgrounds, gradients), 'text', 'border'
function darkVersion(hex, kind) {
  const c = hexToHsl(hex);
  const neutral = c.s < 0.35 || c.l > 0.9 || c.l < 0.15;
  if (neutral) {
    const s = c.s * 0.5;
    if (kind === 'text') return { h: c.h, s, l: 0.95 - c.l * 0.75 };
    if (kind === 'border') return { h: c.h, s, l: 0.12 + (1 - c.l) * 0.6 };
    return { h: c.h, s, l: 0.06 + (1 - c.l) * 0.55 };
  }
  // Saturated brand colours: keep, but deepen pale tints and lift dark text.
  if (kind === 'bg' && c.l > 0.7) return { h: c.h, s: c.s * 0.6, l: 0.16 };
  if (kind === 'border' && c.l > 0.7) return { h: c.h, s: c.s * 0.6, l: 0.28 };
  if (kind === 'text' && c.l < 0.4) return { h: c.h, s: c.s, l: 0.62 };
  return c;
}

const PROPS = {
  bg: ['bg', 'background-color'],
  text: ['text', 'color'],
  border: ['border', 'border-color'],
  'border-t': ['border', 'border-top-color'],
  'border-b': ['border', 'border-bottom-color'],
  'border-l': ['border', 'border-left-color'],
  'border-r': ['border', 'border-right-color'],
  divide: ['border', 'border-color'],
  ring: ['border', '--tw-ring-color'],
  from: ['bg', '--tw-gradient-from'],
  via: ['bg', '--tw-gradient-via'],
  to: ['bg', '--tw-gradient-to'],
  fill: ['bg', 'fill'],
  stroke: ['border', 'stroke'],
  placeholder: ['text', 'color'],
};

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(jsx|js)$/.test(e.name)) out.push(fs.readFileSync(p, 'utf8'));
  }
  return out;
}
const re = /((?:[a-z-]+:)*)(bg|text|border-[tblr]|border|divide|ring|from|via|to|fill|stroke|placeholder)-\[(#[0-9A-Fa-f]{3,8})\](?:\/(\d+))?/g;
const seen = new Set();
let hexCount = 0;
for (const file of walk(SRC)) {
  for (const m of file.matchAll(re)) {
    const [whole, variants, prop, hex, alpha] = m;
    if (seen.has(whole) || hex.length > 7) continue;
    seen.add(whole);
    const [kind, cssProp] = PROPS[prop];
    const color = hsl(darkVersion(hex, kind), alpha ? Number(alpha) / 100 : undefined);
    const base = whole.slice(variants.length);
    const decl = `${cssProp}: ${color};`;
    if (variants === '') rule(base, decl);
    else if (variants === 'hover:') rule(base, decl, { hover: true });
    else if (variants === 'group-hover:') rule(base, decl, { groupHover: true });
    else if (variants === 'placeholder:') lines.push(`${S} .${esc(whole)}::placeholder { color: ${color}; }`);
    else if (variants === 'focus:') lines.push(`${S} .${esc(whole)}:focus { ${decl} }`);
    else continue;
    hexCount += 1;
  }
}

const header = `/*
 * dark-palette.css: GENERATED by scripts/gen-dark-palette.cjs (npm run gen:dark). Do not edit by hand.
 *
 * Dark mode without editing every component:
 * 1. Tailwind's light tint classes (bg-emerald-50, text-stone-800, ...) become
 *    dark tints / light text of the same hue. Mid shades (400-600: buttons,
 *    icons) stay as they are.
 * 2. The teammate's fixed colours (bg-[#FAF6EE], text-[#181A20], ...) get a
 *    dark version: neutral colours have their lightness flipped; saturated
 *    brand colours stay, with pale tints deepened.
 * Applies whenever <html data-theme="dark"> (set by ThemeProvider).
 */
`;
fs.writeFileSync(OUT, header + lines.join('\n') + '\n');
console.log(`${lines.length} rules (${hexCount} for fixed hex colours)`);
