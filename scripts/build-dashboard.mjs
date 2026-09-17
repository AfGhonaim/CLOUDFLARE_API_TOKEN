#!/usr/bin/env node
/**
 * Builds site/index.html — the review dashboard.
 *
 * Reads data/companies.json plus the matching draft in outreach/emails/<slug>.md
 * so the whole email (recipient, subject, body, preview link) can be reviewed in
 * one place before anything is sent.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA = path.join(ROOT, 'data', 'companies.json');
const EMAILS = path.join(ROOT, 'outreach', 'emails');
const OUT = path.join(ROOT, 'site', 'index.html');

const REQUIRED = ['slug', 'company', 'website', 'industry', 'status'];

// Only demanded once a record claims to be reviewable — a seeded target has
// none of this yet, and inventing it to satisfy the schema is the one thing
// this pipeline must never do.
const REQUIRED_FOR_REVIEW = ['opportunity', 'preview', 'subject'];
const REVIEWABLE = new Set(['Ready for Review', 'Approved', 'Sent', 'Replied']);
const STATUSES = [
  'Not started', 'Analyzed', 'Concept built', 'Ready for Review',
  'Approved', 'Sent', 'Replied', 'Declined', 'Skipped',
];

const esc = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const missing = (value) =>
  value === undefined || value === null || value === '' || value === 'Not found';

/** Minimal `to:`/`subject:` header block followed by the body. */
function parseEmail(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) return { headers: {}, body: raw.trim() };

  const headers = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^([A-Za-z-]+):\s*(.*)$/.exec(line.trim());
    if (pair) headers[pair[1].toLowerCase()] = pair[2].trim();
  }
  return { headers, body: match[2].trim() };
}

const companies = JSON.parse(await readFile(DATA, 'utf8'));
if (!Array.isArray(companies)) throw new Error('data/companies.json must be an array');

const errors = [];
const seen = new Map();

for (const [index, row] of companies.entries()) {
  const label = row.slug ?? row.company ?? `row ${index}`;

  for (const field of REQUIRED) {
    if (missing(row[field])) errors.push(`${label}: missing required field "${field}"`);
  }
  if (REVIEWABLE.has(row.status)) {
    for (const field of REQUIRED_FOR_REVIEW) {
      if (missing(row[field])) errors.push(`${label}: status is "${row.status}" but "${field}" is empty`);
    }
    if (!Array.isArray(row.findings) || row.findings.length === 0) {
      errors.push(`${label}: status is "${row.status}" but no findings are recorded`);
    }
  }
  if (row.status && !STATUSES.includes(row.status)) {
    errors.push(`${label}: unknown status "${row.status}"`);
  }
  // Duplicate outreach to the same company is the one mistake with a real cost.
  for (const key of [row.slug, row.website?.replace(/\/+$/, '').toLowerCase()]) {
    if (!key) continue;
    if (seen.has(key)) errors.push(`${label}: duplicates ${seen.get(key)} (${key})`);
    else seen.set(key, label);
  }
  if (!missing(row.contactEmail) && missing(row.contactSource)) {
    errors.push(`${label}: has a contact email but no contactSource to verify it against`);
  }

  const draft = path.join(EMAILS, `${row.slug}.md`);
  if (existsSync(draft)) {
    const { headers, body } = parseEmail(await readFile(draft, 'utf8'));
    row._email = body;
    row._to = headers.to ?? row.contactEmail;
    if (headers.subject) row.subject = headers.subject;
    if (!missing(row.preview) && !body.includes(row.preview)) {
      errors.push(`${label}: the draft does not contain its preview link`);
    }
  }
}

const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
for (const row of companies) counts[row.status] = (counts[row.status] ?? 0) + 1;

const linkOrDash = (href, text) =>
  missing(href) ? '<span class="muted">—</span>'
    : `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(text ?? href)}</a>`;

const rows = companies.map((row, i) => {
  const host = missing(row.website) ? '' : String(row.website).replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const contact = missing(row.contactName)
    ? '<span class="muted">Not found</span>'
    : esc(row.contactName) + (missing(row.contactRole) ? '' : `<span class="role">${esc(row.contactRole)}</span>`);
  const email = missing(row.contactEmail)
    ? '<span class="muted">Not found</span>'
    : `<a href="mailto:${esc(row.contactEmail)}">${esc(row.contactEmail)}</a>`;

  const detail = row._email
    ? `<tr class="detail" id="detail-${esc(row.slug)}" hidden>
        <td colspan="9">
          <div class="draft">
            <div class="draft__meta">
              <span><b>To</b> ${esc(row._to ?? 'Not found')}</span>
              <span><b>Subject</b> ${esc(row.subject ?? '')}</span>
              <span><b>Preview</b> ${linkOrDash(row.preview)}</span>
            </div>
            <pre>${esc(row._email)}</pre>
            ${row.findings?.length ? `<div class="draft__findings"><b>Observed on the live site</b><ul>${row.findings.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></div>` : ''}
          </div>
        </td>
      </tr>`
    : '';

  return `<tr class="row" data-status="${esc(row.status)}" data-search="${esc([row.company, host, row.industry, row.contactName, row.contactEmail].filter((v) => !missing(v)).join(' ').toLowerCase())}">
      <td class="num">${i + 1}</td>
      <td class="company">${esc(row.company)}${row._email ? `<button class="toggle" type="button" data-target="detail-${esc(row.slug)}" aria-expanded="false">view email</button>` : ''}</td>
      <td>${linkOrDash(row.website, host)}</td>
      <td>${esc(row.industry)}</td>
      <td class="opportunity">${esc(row.opportunity)}</td>
      <td>${linkOrDash(row.preview, 'Preview')}</td>
      <td>${contact}</td>
      <td class="email">${email}</td>
      <td class="subject">${esc(row.subject ?? '')}</td>
      <td><span class="pill pill--${esc(String(row.status).toLowerCase().replaceAll(' ', '-'))}">${esc(row.status)}</span></td>
    </tr>${detail}`;
}).join('\n');

const withEmail = companies.filter((r) => !missing(r.contactEmail)).length;
const withPreview = companies.filter((r) => !missing(r.preview)).length;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Redesign Outreach — Review Dashboard</title>
<link rel="stylesheet" href="./assets/dashboard.css">
</head>
<body>
<header class="head">
  <div class="head__inner">
    <div>
      <h1>Redesign outreach — review dashboard</h1>
      <p class="muted">Generated ${new Date().toISOString().slice(0, 10)} · nothing is sent until the batch is explicitly approved.</p>
    </div>
    <div class="stats">
      <div class="stat"><b>${companies.length}</b><span>companies</span></div>
      <div class="stat"><b>${withPreview}</b><span>previews</span></div>
      <div class="stat"><b>${withEmail}</b><span>emails found</span></div>
      <div class="stat"><b>${counts['Ready for Review'] ?? 0}</b><span>ready for review</span></div>
      <div class="stat"><b>${counts['Sent'] ?? 0}</b><span>sent</span></div>
    </div>
  </div>
</header>

<main class="wrap">
  ${errors.length ? `<div class="alert"><b>${errors.length} data problem(s) — fix before review:</b><ul>${errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>` : ''}
  ${companies.length === 0 ? '<p class="empty">No companies loaded yet. Add records to <code>data/companies.json</code> and run <code>npm run build</code>.</p>' : ''}

  <div class="controls">
    <label class="field">
      <span class="visually-hidden">Filter companies</span>
      <input id="q" type="search" placeholder="Filter by company, domain, industry, contact…" autocomplete="off">
    </label>
    <label class="field">
      <span class="visually-hidden">Filter by status</span>
      <select id="status">
        <option value="">All statuses</option>
        ${STATUSES.filter((s) => counts[s]).map((s) => `<option value="${esc(s)}">${esc(s)} (${counts[s]})</option>`).join('')}
      </select>
    </label>
    <button id="expand" type="button">Expand all emails</button>
    <span id="shown" class="muted"></span>
  </div>

  <div class="tablewrap">
    <table>
      <thead>
        <tr>
          <th>#</th><th>Company</th><th>Website</th><th>Industry</th>
          <th>Key UX opportunity</th><th>Preview</th><th>Contact</th>
          <th>Email</th><th>Subject</th><th>Status</th>
        </tr>
      </thead>
      <tbody>
${rows}
      </tbody>
    </table>
  </div>
</main>

<script>
const q = document.getElementById('q');
const status = document.getElementById('status');
const shown = document.getElementById('shown');
const rows = [...document.querySelectorAll('tr.row')];

function apply() {
  const term = q.value.trim().toLowerCase();
  const want = status.value;
  let visible = 0;
  for (const row of rows) {
    const ok = (!term || row.dataset.search.includes(term)) && (!want || row.dataset.status === want);
    row.hidden = !ok;
    const detail = row.nextElementSibling;
    if (detail?.classList.contains('detail') && !ok) detail.hidden = true;
    if (ok) visible++;
  }
  shown.textContent = visible + ' of ' + rows.length + ' shown';
}

q.addEventListener('input', apply);
status.addEventListener('change', apply);
apply();

document.addEventListener('click', (event) => {
  const button = event.target.closest('.toggle');
  if (!button) return;
  const detail = document.getElementById(button.dataset.target);
  const open = detail.hidden;
  detail.hidden = !open;
  button.setAttribute('aria-expanded', String(open));
  button.textContent = open ? 'hide email' : 'view email';
});

document.getElementById('expand').addEventListener('click', (event) => {
  const open = event.target.dataset.open !== 'true';
  event.target.dataset.open = String(open);
  event.target.textContent = open ? 'Collapse all emails' : 'Expand all emails';
  for (const button of document.querySelectorAll('.toggle')) {
    const detail = document.getElementById(button.dataset.target);
    if (button.closest('tr').hidden) continue;
    detail.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    button.textContent = open ? 'hide email' : 'view email';
  }
});
</script>
</body>
</html>
`;

await writeFile(OUT, html);

console.log(`dashboard: ${companies.length} company record(s) -> site/index.html`);
if (errors.length > 0) {
  console.error(`\n${errors.length} data problem(s):`);
  for (const error of errors) console.error(`  fail  ${error}`);
  process.exit(1);
}
