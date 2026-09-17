#!/usr/bin/env node
/**
 * Inlines a concept's stylesheets and script into one self-contained HTML file.
 *
 *   node scripts/bundle-concept.mjs <slug>   ->  build/<slug>.html
 *
 * Cloudflare Pages serves the whole site/ directory, so it needs none of this.
 * This exists for hosts that take a single file, and for sending a concept to
 * someone as one attachment. The disclosure markup travels with it — a bundle
 * that lost the badge would be exactly the thing the build is meant to prevent.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const slug = process.argv[2];

if (!slug) {
  console.error('usage: node scripts/bundle-concept.mjs <slug>');
  process.exit(1);
}

const dir = path.join(ROOT, 'site', 'concepts', slug);
let html = await readFile(path.join(dir, 'index.html'), 'utf8');

/** Replace a <link rel="stylesheet" href="..."> with the stylesheet itself. */
async function inlineStylesheet(href, file) {
  const css = await readFile(file, 'utf8');
  const tag = new RegExp(`<link[^>]+href=["']${href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`, 'i');
  if (!tag.test(html)) throw new Error(`no stylesheet link matching ${href}`);
  html = html.replace(tag, `<style>\n${css}\n</style>`);
}

async function inlineScript(src, file) {
  const js = await readFile(file, 'utf8');
  const tag = new RegExp(`<script[^>]+src=["']${src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*></script>`, 'i');
  if (!tag.test(html)) throw new Error(`no script tag matching ${src}`);
  // Deferred in the original, so it must stay deferred: it reads laid-out text.
  html = html.replace(tag, `<script defer>\n${js}\n</script>`);
}

await inlineStylesheet('../../assets/base.css', path.join(ROOT, 'site', 'assets', 'base.css'));
await inlineStylesheet('./styles.css', path.join(dir, 'styles.css'));
await inlineScript('../../assets/motion.js', path.join(ROOT, 'site', 'assets', 'motion.js'));

// The bundle is worthless — and misleading — without the disclosure.
const disclaimers = (html.match(/data-rc-disclaimer/g) ?? []).length;
if (disclaimers < 2 || !/not affiliated with/i.test(html)) {
  throw new Error('bundle lost its concept disclosure; refusing to write it');
}
if (/<link[^>]+stylesheet[^>]+href=["']\.{0,2}\//i.test(html)) {
  throw new Error('a local stylesheet link survived inlining');
}

const out = path.join(ROOT, 'build', `${slug}.html`);
await mkdir(path.dirname(out), { recursive: true });
await writeFile(out, html);

console.log(`${slug}: ${(html.length / 1024).toFixed(0)}KB -> build/${slug}.html`);
