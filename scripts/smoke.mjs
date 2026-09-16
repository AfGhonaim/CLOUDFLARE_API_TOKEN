#!/usr/bin/env node
/**
 * Renders every concept in Chromium at the three designed breakpoints and
 * fails on anything that would embarrass the pitch: a JS error, a page that
 * scrolls sideways, body copy under 16px, or content that never reveals.
 *
 * Also loads each page with reduced motion forced on, where everything must
 * already be visible without scrolling.
 *
 *   node scripts/smoke.mjs            all concepts
 *   node scripts/smoke.mjs <slug>     one concept
 *
 * Screenshots land in .smoke/ (gitignored).
 */

import { chromium } from 'playwright';
import { readdir, mkdir, stat } from 'node:fs/promises';
import { readdirSync } from 'node:fs';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(import.meta.dirname, '..');
const CONCEPTS = path.join(ROOT, 'site', 'concepts');
const SHOTS = path.join(ROOT, '.smoke');

const VIEWPORTS = [
  { name: 'mobile', width: 360, height: 780 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

/**
 * The sandbox ships a Chromium build that may not match the one this
 * Playwright version expects, so prefer whatever is actually on disk.
 */
function findChromium() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;

  const base = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!base) return undefined;

  try {
    const build = readdirSync(base)
      .filter((name) => /^chromium-\d+$/.test(name))
      .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]))[0];
    return build ? path.join(base, build, 'chrome-linux', 'chrome') : undefined;
  } catch {
    return undefined;
  }
}

const only = process.argv[2];
const problems = [];
const warnings = [];

async function scrollThrough(page) {
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.75;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 90));
    }
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((r) => setTimeout(r, 400));
  });
}

async function run(browser, slug, viewport) {
  const label = `${slug} @ ${viewport.name}`;
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];

  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto(pathToFileURL(path.join(CONCEPTS, slug, 'index.html')).href, {
    waitUntil: 'load',
  });
  await scrollThrough(page);

  const result = await page.evaluate(() => {
    const unrevealed = [...document.querySelectorAll('[data-reveal], [data-reveal-clip], [data-split]')]
      .filter((el) => !el.classList.contains('is-revealed')).length;

    // Representative body copy: the longest paragraph outside the concept
    // shell. Short label paragraphs are legitimately set smaller.
    const paragraph = [...document.querySelectorAll('p')]
      .filter((el) => !el.closest('.rc-badge, .rc-footer, .rc-cta__scope'))
      .filter((el) => el.textContent.trim().length > 80)
      .sort((a, b) => b.textContent.length - a.textContent.length)[0];
    const bodySize = paragraph ? parseFloat(getComputedStyle(paragraph).fontSize) : null;

    const overflow = document.documentElement.scrollWidth - window.innerWidth;

    const badge = document.querySelector('.rc-badge');
    const badgeVisible = badge ? badge.getBoundingClientRect().width > 0 : false;

    return { unrevealed, bodySize, overflow, badgeVisible };
  });

  if (errors.length > 0) problems.push(`${label}: ${errors.length} JS error(s) — ${errors[0]}`);
  if (result.overflow > 1) problems.push(`${label}: scrolls sideways by ${result.overflow}px`);
  if (result.unrevealed > 0) problems.push(`${label}: ${result.unrevealed} element(s) never revealed`);
  if (!result.badgeVisible) problems.push(`${label}: the concept badge is not rendering`);
  if (result.bodySize !== null && result.bodySize < 16) {
    warnings.push(`${label}: body copy is ${result.bodySize}px, under the 16px floor`);
  }

  await page.screenshot({
    path: path.join(SHOTS, `${slug}-${viewport.name}.png`),
    fullPage: true,
  });

  await context.close();
}

async function runReducedMotion(browser, slug) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();

  await page.goto(pathToFileURL(path.join(CONCEPTS, slug, 'index.html')).href, {
    waitUntil: 'load',
  });

  // No scrolling: with motion off, everything must already be in its final state.
  const hidden = await page.evaluate(() =>
    [...document.querySelectorAll('[data-reveal], [data-split]')]
      .filter((el) => parseFloat(getComputedStyle(el).opacity) < 0.99).length);

  if (hidden > 0) {
    problems.push(`${slug} @ reduced-motion: ${hidden} element(s) still hidden with motion disabled`);
  }

  await context.close();
}

const entries = existsSync(CONCEPTS) ? await readdir(CONCEPTS) : [];
const slugs = [];
for (const entry of entries) {
  if (only && entry !== only) continue;
  if ((await stat(path.join(CONCEPTS, entry))).isDirectory()) slugs.push(entry);
}

if (slugs.length === 0) {
  console.log('no concepts to smoke test');
  process.exit(0);
}

await mkdir(SHOTS, { recursive: true });
const executablePath = findChromium();
const browser = await chromium.launch(executablePath ? { executablePath } : {});

for (const slug of slugs) {
  for (const viewport of VIEWPORTS) await run(browser, slug, viewport);
  await runReducedMotion(browser, slug);
}

await browser.close();

for (const warning of warnings) console.warn(`  warn  ${warning}`);

if (problems.length > 0) {
  console.error(`\n${problems.length} problem(s) across ${slugs.length} concept(s):\n`);
  for (const problem of problems) console.error(`  fail  ${problem}`);
  console.error('');
  process.exit(1);
}

console.log(`smoke: ${slugs.length} concept(s) rendered clean at 360/768/1440 and with reduced motion`);
console.log(`screenshots -> .smoke/`);
