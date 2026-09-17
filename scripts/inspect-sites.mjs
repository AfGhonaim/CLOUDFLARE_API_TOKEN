#!/usr/bin/env node
/**
 * Phase 1 field work: load each target site in a real browser and record what
 * it actually renders. Everything written here is observed, never inferred —
 * the redesigns have to be grounded in the real page.
 *
 *   node scripts/inspect-sites.mjs [slug]
 *
 * Writes .inspect/<slug>.json plus desktop/mobile screenshots.
 */

import { chromium, devices } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, '.inspect');

function findChromium() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!base) return undefined;
  const build = readdirSync(base)
    .filter((n) => /^chromium-\d+$/.test(n))
    .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]))[0];
  return build ? path.join(base, build, 'chrome-linux', 'chrome') : undefined;
}

/** Runs in the page. Reports what is on screen, not what the markup implies. */
function extract() {
  const text = (el) => (el?.innerText ?? '').trim().replace(/\s+/g, ' ');
  const css = (el, prop) => (el ? getComputedStyle(el).getPropertyValue(prop) : null);

  const nav = document.querySelector('header nav, nav, header, [role="navigation"]');
  const navLinks = nav
    ? [...nav.querySelectorAll('a')]
        .map((a) => text(a))
        .filter((t) => t && t.length < 40)
        .slice(0, 30)
    : [];

  const headings = [...document.querySelectorAll('h1, h2')]
    .map((h) => ({ level: h.tagName, text: text(h).slice(0, 120) }))
    .filter((h) => h.text)
    .slice(0, 30);

  const h1s = [...document.querySelectorAll('h1')];
  const firstH1 = h1s[0];

  const buttons = [...document.querySelectorAll('a[class*="btn"], a[class*="button"], button, .cta, [class*="cta"]')]
    .map((b) => text(b))
    .filter((t) => t && t.length < 50)
    .slice(0, 20);

  const images = [...document.querySelectorAll('img')];
  const bigImages = images
    .filter((img) => img.naturalWidth > 400)
    .map((img) => ({
      src: (img.currentSrc || img.src || '').slice(0, 160),
      natural: `${img.naturalWidth}x${img.naturalHeight}`,
      rendered: `${Math.round(img.getBoundingClientRect().width)}x${Math.round(img.getBoundingClientRect().height)}`,
      alt: (img.alt || '').slice(0, 80),
    }))
    .slice(0, 12);

  const langLinks = [...document.querySelectorAll('a, button')]
    .map((el) => text(el))
    .filter((t) => /^(ar|en|عربي|العربية|english|arabic)$/i.test(t))
    .slice(0, 6);

  const mailto = [...document.querySelectorAll('a[href^="mailto:"]')]
    .map((a) => a.getAttribute('href').replace('mailto:', '').split('?')[0])
    .slice(0, 8);
  const tel = [...document.querySelectorAll('a[href^="tel:"]')]
    .map((a) => a.getAttribute('href').replace('tel:', ''))
    .slice(0, 8);

  // Representative body copy: the longest paragraph on the page.
  const paragraph = [...document.querySelectorAll('p')]
    .filter((p) => text(p).length > 60)
    .sort((a, b) => text(b).length - text(a).length)[0];

  const sections = [...document.querySelectorAll('section, main > div, body > div > section')]
    .filter((s) => s.getBoundingClientRect().height > 200)
    .map((s) => {
      const heading = s.querySelector('h1, h2, h3');
      return {
        heading: heading ? text(heading).slice(0, 80) : '(no heading)',
        height: Math.round(s.getBoundingClientRect().height),
        images: s.querySelectorAll('img').length,
      };
    })
    .slice(0, 20);

  return {
    title: document.title,
    lang: document.documentElement.lang || '(none)',
    dir: document.documentElement.dir || 'ltr',
    metaDescription: document.querySelector('meta[name="description"]')?.content?.slice(0, 200) ?? null,
    hasViewportMeta: Boolean(document.querySelector('meta[name="viewport"]')),
    navLinkCount: navLinks.length,
    navLinks,
    h1Count: h1s.length,
    h1: firstH1 ? text(firstH1).slice(0, 200) : null,
    h1FontFamily: css(firstH1, 'font-family'),
    h1FontSize: css(firstH1, 'font-size'),
    h1FontWeight: css(firstH1, 'font-weight'),
    bodyFontFamily: css(document.body, 'font-family'),
    bodyFontSize: paragraph ? css(paragraph, 'font-size') : css(document.body, 'font-size'),
    bodyLineHeight: paragraph ? css(paragraph, 'line-height') : null,
    bodyColor: css(document.body, 'color'),
    bodyBackground: css(document.body, 'background-color'),
    headings,
    sectionCount: sections.length,
    sections,
    ctaLabels: [...new Set(buttons)],
    imageCount: images.length,
    imagesWithoutAlt: images.filter((i) => !i.alt).length,
    bigImages,
    langSwitcher: [...new Set(langLinks)],
    mailto: [...new Set(mailto)],
    tel: [...new Set(tel)],
    formCount: document.querySelectorAll('form').length,
    horizontalOverflowPx: document.documentElement.scrollWidth - window.innerWidth,
    pageHeight: document.body.scrollHeight,
  };
}

/**
 * The session's egress proxy re-terminates TLS with its own CA, which is
 * configured for curl and Node but is not in Chromium's root store.
 *
 * Rather than turning certificate checking off, trust is pinned to that one
 * CA's public key. Any certificate chain that does not include this exact key
 * still fails the navigation, so a genuinely bad certificate on a target site
 * is still caught. `ignoreHTTPSErrors` would disable verification wholesale
 * and must not be used here.
 */
function proxyCaSpkiHash() {
  const ca = '/root/.ccr/agent-proxy-ca.crt';
  if (!existsSync(ca)) return null;
  try {
    const pubkey = execFileSync('openssl', ['x509', '-in', ca, '-pubkey', '-noout']);
    const der = execFileSync('openssl', ['pkey', '-pubin', '-outform', 'der'], { input: pubkey });
    return execFileSync('openssl', ['dgst', '-sha256', '-binary'], { input: der }).toString('base64');
  } catch {
    return null;
  }
}

const targets = JSON.parse(await readFile(path.join(ROOT, 'data', 'companies.json'), 'utf8'));
const only = process.argv[2];
const list = only ? targets.filter((t) => t.slug === only) : targets;

await mkdir(OUT, { recursive: true });
const spki = proxyCaSpkiHash();
const args = ['--no-sandbox'];
if (spki) args.push(`--ignore-certificate-errors-spki-list=${spki}`);

const browser = await chromium.launch({ executablePath: findChromium(), args });
const summary = [];

for (const target of list) {
  const record = { slug: target.slug, company: target.company, url: target.website };
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'en-US',
  });
  const page = await context.newPage();

  // A page that renders an error shell usually failed on a subresource — often
  // a host the environment's allowlist is missing. Record them so the cause is
  // visible instead of guessed at.
  const failures = [];
  page.on('requestfailed', (request) => {
    failures.push(`${request.failure()?.errorText ?? 'failed'} ${request.url().slice(0, 120)}`);
  });

  try {
    const response = await page.goto(target.website, { waitUntil: 'domcontentloaded', timeout: 60000 });
    record.status = response?.status() ?? null;
    record.finalUrl = page.url();

    // Let lazy content and hero media settle, then scroll to trigger reveals.
    await page.waitForTimeout(3500);
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 250));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1200);

    record.desktop = await page.evaluate(extract);

    // A client-rendered site can lose a bundle to an aborted request and land
    // on the browser's own error shell. One reload settles that. This is not
    // used to push past a site's bot protection — a challenge page is reported
    // as a challenge page.
    if (/couldn.t load|can.t be reached|ERR_/i.test(record.desktop.h1 ?? '')) {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(5000);
      record.desktop = await page.evaluate(extract);
      record.reloaded = true;
    }

    await page.screenshot({ path: path.join(OUT, `${target.slug}-desktop-hero.png`) });
    await page.screenshot({ path: path.join(OUT, `${target.slug}-desktop-full.png`), fullPage: true });

    const mobile = await browser.newContext({ ...devices['Pixel 5'] });
    const mobilePage = await mobile.newPage();
    await mobilePage.goto(target.website, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await mobilePage.waitForTimeout(3000);
    record.mobile = await mobilePage.evaluate(extract);
    await mobilePage.screenshot({ path: path.join(OUT, `${target.slug}-mobile-hero.png`) });
    await mobilePage.screenshot({ path: path.join(OUT, `${target.slug}-mobile-full.png`), fullPage: true });
    await mobile.close();

    record.failedRequests = [...new Set(failures)].slice(0, 15);
    record.ok = true;
    console.log(`OK    ${target.slug.padEnd(20)} ${record.status}  "${record.desktop.title.slice(0, 55)}"`);
    if (record.failedRequests.length) {
      console.log(`      ${record.failedRequests.length} failed request(s), first: ${record.failedRequests[0]}`);
    }
  } catch (error) {
    record.ok = false;
    record.error = String(error).split('\n')[0];
    console.log(`FAIL  ${target.slug.padEnd(20)} ${record.error.slice(0, 90)}`);
  }

  await context.close();
  await writeFile(path.join(OUT, `${target.slug}.json`), JSON.stringify(record, null, 2));
  summary.push({ slug: record.slug, ok: record.ok, status: record.status ?? null });
}

await browser.close();
await writeFile(path.join(OUT, '_summary.json'), JSON.stringify(summary, null, 2));
console.log(`\n${summary.filter((s) => s.ok).length}/${summary.length} loaded`);
