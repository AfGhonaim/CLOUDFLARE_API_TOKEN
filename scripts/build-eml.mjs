#!/usr/bin/env node
/**
 * Turns an outreach draft into a .eml file that opens in any mail client,
 * ready to review and send by hand.
 *
 *   node scripts/build-eml.mjs <slug>   ->  build/<slug>.eml
 *
 * Sending is deliberately not automated. These are cold commercial emails to
 * named companies, they go out under someone's own name and domain, and the
 * owner reviews each one before it leaves.
 *
 * The build refuses to produce a file that is not actually sendable: an
 * unresolved preview link, a missing postal address, or a placeholder
 * recipient all fail here rather than in someone's inbox.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const slug = process.argv[2];

if (!slug) {
  console.error('usage: node scripts/build-eml.mjs <slug>');
  process.exit(1);
}

const raw = await readFile(path.join(ROOT, 'outreach', 'emails', `${slug}.md`), 'utf8');
const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
if (!match) throw new Error(`${slug}.md has no header block`);

const headers = {};
for (const line of match[1].split(/\r?\n/)) {
  const pair = /^([A-Za-z-]+):\s*(.*)$/.exec(line.trim());
  if (pair) headers[pair[1].toLowerCase()] = pair[2].trim();
}
const body = match[2].trim();

const blockers = [];
if (!headers.to || headers.to === 'Not found' || !headers.to.includes('@')) {
  blockers.push('no verified recipient address');
}
if (!headers.subject) blockers.push('no subject line');
if (body.includes('PREVIEW_URL')) {
  blockers.push('the preview link is still the PREVIEW_URL placeholder');
}
if (/\[[^\]]*POSTAL ADDRESS[^\]]*\]/i.test(body)) {
  blockers.push('the sender postal address is still a placeholder, and cold commercial email requires one');
}
if (!/EGP\s*5,?000/.test(body)) blockers.push('the offer price is missing');
if (!/does not include|would be separate/i.test(body)) {
  blockers.push('the offer states a price without naming what it excludes');
}

if (blockers.length > 0) {
  console.error(`\n${slug} is not sendable yet:\n`);
  for (const blocker of blockers) console.error(`  - ${blocker}`);
  console.error('');
  process.exit(1);
}

const eml = [
  `To: ${headers.to}`,
  `Subject: ${headers.subject}`,
  'MIME-Version: 1.0',
  'Content-Type: text/plain; charset=utf-8',
  'X-Unsent: 1',
  '',
  body,
  '',
].join('\r\n');

const out = path.join(ROOT, 'build', `${slug}.eml`);
await mkdir(path.dirname(out), { recursive: true });
await writeFile(out, eml);

console.log(`${slug}: ready to send -> build/${slug}.eml  (to ${headers.to})`);
