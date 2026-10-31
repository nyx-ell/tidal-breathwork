// Generates the social sharing image, icons and README screenshot for Tidal Breathwork.
//
//   npm install && npx playwright install chromium
//   npm run og
//
// Writes og-image.png (1200×630), favicon.svg, apple-touch-icon.png (180×180)
// and screenshot.png to the repo root. The OG image is a live capture of the
// hero in index.html, taken mid-inhale, so it uses the page's own palette,
// typefaces and breathing orb. Needs a network connection for Google Fonts.

import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pageUrl = pathToFileURL(path.join(root, 'index.html')).href;

const P = {
  ink: '#21353B',
  heroDark: '#86B8A7',
  inkLight: '#DCE7E4',
};

const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${P.ink}"/>
  <circle cx="32" cy="23" r="10" fill="${P.heroDark}"/>
  <path d="M9 45c5.75 0 5.75-6.5 11.5-6.5S25.75 45 31.5 45s5.75-6.5 11.5-6.5S48.75 45 54.5 45" fill="none" stroke="${P.inkLight}" stroke-width="6" stroke-linecap="round"/>
</svg>
`;

const browser = await chromium.launch();

// Opens the page and waits until the hero orb is part-way through an inhale,
// with the "Breathe in" cue fully visible.
async function openHero(viewport, scale) {
  const page = await browser.newPage({
    viewport,
    deviceScaleFactor: scale,
    colorScheme: 'light',
    reducedMotion: 'no-preference',
  });
  await page.goto(pageUrl, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(12000 + 3300);
  return page;
}

// 1. Social image: the hero itself, with the toolbar swapped for the address.
const og = await openHero({ width: 1200, height: 630 }, 1);
await og.addStyleTag({
  content: `
  .tools,.need,.maker,.foot{display:none!important}
  .hero{min-height:calc(630px - 4.5rem)!important;padding:0 0 3rem!important}
  .og-url{font-size:17px;letter-spacing:.02em;color:${P.ink};opacity:.75}
`,
});
await og.evaluate(() => {
  const url = document.createElement('span');
  url.className = 'og-url';
  url.textContent = 'breathwork.nicolelin.com';
  document.querySelector('.bar').append(url);
});
await og.waitForTimeout(100);
await writeFile(
  path.join(root, 'og-image.png'),
  await og.screenshot({ type: 'png' }),
);
await og.close();

// 2. README screenshot: the hero as a visitor sees it on a laptop.
const shot = await openHero({ width: 1440, height: 900 }, 2);
await writeFile(
  path.join(root, 'screenshot.png'),
  await shot.screenshot({ type: 'png' }),
);
await shot.close();

// 3. Icons.
await writeFile(path.join(root, 'favicon.svg'), FAVICON);
const icon = await browser.newPage({ viewport: { width: 180, height: 180 } });
await icon.setContent(
  `<style>*{margin:0}body{width:180px;height:180px;background:${P.ink}}svg{width:180px;height:180px;display:block}</style>${FAVICON.replace('rx="14"', 'rx="0"')}`,
);
await writeFile(
  path.join(root, 'apple-touch-icon.png'),
  await icon.screenshot({ type: 'png' }),
);

await browser.close();
console.log(
  'Wrote og-image.png, screenshot.png, favicon.svg and apple-touch-icon.png',
);
