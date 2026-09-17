#!/usr/bin/env node
/**
 * Gate for every concept page in site/concepts/.
 *
 * The concepts carry real company names and branding, so the disclaimer is the
 * thing that keeps them honest proposals rather than lookalike sites. This runs
 * in CI and before every deploy; a missing banner fails the build.
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CONCEPTS = path.join(ROOT, 'site', 'concepts');

const problems = [];
const warnings = [];

function fail(slug, message) {
  problems.push(`${slug}: ${message}`);
}

function warn(slug, message) {
  warnings.push(`${slug}: ${message}`);
}

function checkPage(slug, html) {
  const disclaimers = (html.match(/data-rc-disclaimer/g) ?? []).length;
  if (disclaimers < 2) {
    fail(slug, `expected the banner and footer disclaimer markup, found ${disclaimers} of 2`);
  }

  if (!/Website Redesign Concept/i.test(html)) {
    fail(slug, 'the page never says "Website Redesign Concept"');
  }

  if (!/not affiliated with/i.test(html)) {
    fail(slug, 'missing the "not affiliated with" statement');
  }

  if (!/<meta\s+name=["']robots["'][^>]*noindex/i.test(html)) {
    fail(slug, 'missing <meta name="robots" content="noindex, nofollow">');
  }

  if (!/<meta\s+name=["']viewport["']/i.test(html)) {
    fail(slug, 'missing a viewport meta tag, so the page will not be responsive on phones');
  }

  if (!/<html[^>]+\blang=/i.test(html)) {
    fail(slug, 'the <html> element has no lang attribute');
  }

  const placeholders = html.match(/\{\{[A-Z_]+\}\}/g);
  if (placeholders) {
    fail(slug, `unreplaced template placeholders: ${[...new Set(placeholders)].join(', ')}`);
  }

  // The commercial CTA must state the price and its limits together, so no
  // page can imply the fee covers backend, CMS, hosting, or maintenance.
  const hasPrice = /EGP\s*5,?000/i.test(html);
  if (!hasPrice) {
    fail(slug, 'missing the "EGP 5,000" production CTA');
  } else if (!/does not include/i.test(html) || !/frontend/i.test(html)) {
    fail(slug, 'states a price without the frontend-only scope wording next to it');
  }

  // Previews must not expose the source or point anyone at the repository.
  if (/github\.com|gitlab\.com|bitbucket\.org/i.test(html)) {
    fail(slug, 'links to a code host — previews must not expose the source');
  }
  if (/\bdownload=|<a[^>]+\.zip["']/i.test(html)) {
    fail(slug, 'offers a file download — previews must not hand over source');
  }

  // A concept must not be able to collect anything from a visitor.
  if (/type=["']password["']/i.test(html)) {
    fail(slug, 'contains a password input — concepts must never collect credentials');
  }

  for (const [, attrs] of html.matchAll(/<form\b([^>]*)>/gi)) {
    if (/\baction=/i.test(attrs)) {
      fail(slug, 'a <form> has an action attribute — concepts must not submit anywhere');
    }
  }

  for (const [tag] of html.matchAll(/<(?:input|textarea|select)\b[^>]*>/gi)) {
    if (/type=["'](?:hidden|submit|button)["']/i.test(tag)) continue;
    if (!/\bdisabled\b/i.test(tag)) {
      warn(slug, 'an interactive field is not disabled — decorative fields should set `disabled`');
    }
  }
}

const dir = existsSync(CONCEPTS) ? await readdir(CONCEPTS) : [];
const slugs = [];

for (const entry of dir) {
  const full = path.join(CONCEPTS, entry);
  if (!(await stat(full)).isDirectory()) continue;
  slugs.push(entry);

  const page = path.join(full, 'index.html');
  if (!existsSync(page)) {
    fail(entry, 'has no index.html');
    continue;
  }
  checkPage(entry, await readFile(page, 'utf8'));
}

for (const warning of warnings) console.warn(`  warn  ${warning}`);

if (problems.length > 0) {
  console.error(`\n${problems.length} problem(s) across ${slugs.length} concept(s):\n`);
  for (const problem of problems) console.error(`  fail  ${problem}`);
  console.error('');
  process.exit(1);
}

console.log(`checked ${slugs.length} concept(s) — all carry the required disclaimer`);
