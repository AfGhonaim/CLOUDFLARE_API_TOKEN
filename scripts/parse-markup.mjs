#!/usr/bin/env node
/**
 * Summarises the saved homepage markup in .inspect/html/.
 *
 * Offline only: it reads files already on disk and makes no network requests.
 * This is the markup-level half of Phase 1. It cannot report anything about
 * rendering — type sizes, spacing, colour, or layout — so it is a supplement
 * to looking at the pages, never a substitute.
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(ROOT, '.inspect', 'html');

if (!existsSync(SOURCE)) {
  console.error(`nothing saved at ${SOURCE}`);
  process.exit(1);
}

const strip = (html) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const unique = (list) => [...new Set(list)];

function attr(tag, name) {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return match ? match[1] : null;
}

function collect(html, pattern, take) {
  return [...html.matchAll(pattern)].map(take).filter(Boolean);
}

for (const file of readdirSync(SOURCE).filter((f) => f.endsWith('.html')).sort()) {
  const html = readFileSync(path.join(SOURCE, file), 'utf8');
  const name = path.basename(file, '.html').toUpperCase();

  if (html.length < 2000) {
    console.log(`\n${'='.repeat(72)}\n${name} — interstitial only (${html.length} bytes), no usable markup`);
    continue;
  }

  const anchors = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)]
    .map(([, attrs, inner]) => ({ href: attr(`<a ${attrs}>`, 'href') ?? '', text: strip(inner) }))
    .filter((a) => a.text && a.text.length < 45);

  const images = collect(html, /<img\b[^>]*>/gi, (m) => m[0]);
  const stylesheets = collect(html, /<link\b[^>]*>/gi, (m) =>
    /stylesheet/i.test(m[0]) ? attr(m[0], 'href') : null);
  const scripts = collect(html, /<script\b[^>]*src=/gi, (m) => m[0]);

  const heads = (level) =>
    collect(html, new RegExp(`<${level}\\b[^>]*>([\\s\\S]*?)</${level}>`, 'gi'), (m) => strip(m[1]).slice(0, 110))
      .filter(Boolean);

  const googleFonts = unique(stylesheets
    .map((href) => href?.match(/fonts\.googleapis\.com\/css2?\?family=([^&'"]+)/)?.[1])
    .filter(Boolean)
    .map((f) => decodeURIComponent(f).replace(/\+/g, ' ')));

  const fontStacks = unique(collect(html, /font-family\s*:\s*['"]?([A-Za-z0-9 _-]{3,30})/gi, (m) => m[1].trim()));

  const langSwitch = anchors
    .map((a) => a.text.trim())
    .filter((t) => /^(ar|en|العربية|عربي|english|arabic)$/i.test(t));

  const emails = unique(collect(html, /mailto:([^"'?>\s]+)/gi, (m) => m[1]));
  const phones = unique(collect(html, /tel:([^"'?>\s]+)/gi, (m) => m[1]));

  const h1 = heads('h1');
  const h2 = heads('h2');
  const bodyText = strip(html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')).length;

  console.log(`\n${'='.repeat(72)}\n${name}`);
  console.log(`  title        : ${strip(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').slice(0, 95)}`);
  console.log(`  lang         : ${attr(html.match(/<html\b[^>]*>/i)?.[0] ?? '', 'lang') ?? '(none)'}    viewport-meta: ${/name=["']viewport["']/i.test(html)}    forms: ${(html.match(/<form\b/gi) ?? []).length}`);
  console.log(`  meta desc    : ${(html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)?.[1] ?? '(none)').slice(0, 115)}`);
  console.log(`  links ${String(anchors.length).padEnd(5)} images ${String(images.length).padEnd(5)}(no alt: ${images.filter((i) => !attr(i, 'alt')).length})`);
  console.log(`  stylesheets ${String(stylesheets.length).padEnd(4)}scripts ${String(scripts.length).padEnd(4)}server-rendered text: ${bodyText} chars`);
  if (googleFonts.length) console.log(`  google fonts : ${googleFonts.slice(0, 6).join(', ')}`);
  if (fontStacks.length) console.log(`  font stacks  : ${fontStacks.slice(0, 8).join(', ')}`);
  if (langSwitch.length) console.log(`  lang switcher: ${unique(langSwitch).slice(0, 5).join(', ')}`);
  if (emails.length) console.log(`  emails       : ${emails.slice(0, 5).join(', ')}`);
  if (phones.length) console.log(`  phones       : ${phones.slice(0, 5).join(', ')}`);
  console.log(`  H1 (${h1.length})       : ${JSON.stringify(h1.slice(0, 3))}`);
  console.log(`  H2 (${h2.length})       : ${JSON.stringify(h2.slice(0, 10))}`);
  console.log(`  nav/links    : ${JSON.stringify(anchors.filter((a) => !a.href.startsWith('http')).slice(0, 18).map((a) => a.text))}`);
}
