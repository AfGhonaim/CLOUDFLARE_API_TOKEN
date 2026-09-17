#!/usr/bin/env node
/** Prints a readable digest of the .inspect/*.json records. Offline. */

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(import.meta.dirname, '..', '.inspect');
const files = readdirSync(OUT).filter((f) => f.endsWith('.json') && !f.startsWith('_')).sort();

for (const file of files) {
  const r = JSON.parse(readFileSync(path.join(OUT, file), 'utf8'));
  const d = r.desktop;
  const m = r.mobile;

  console.log(`\n${'='.repeat(74)}`);
  console.log(`${r.company}  —  ${r.url}`);
  console.log(`  HTTP ${r.status}   final: ${r.finalUrl}`);

  if (!d) {
    console.log(`  NO DATA: ${r.error ?? 'nothing captured'}`);
    continue;
  }

  console.log(`  title    : ${d.title || '(EMPTY)'}`);
  console.log(`  lang/dir : ${d.lang} / ${d.dir}   viewport-meta: ${d.hasViewportMeta}   forms: ${d.formCount}`);
  console.log(`  page     : ${d.pageHeight}px tall, ${d.sectionCount} sections, ${d.imageCount} images (${d.imagesWithoutAlt} without alt)`);
  console.log(`  overflow : desktop ${d.horizontalOverflowPx}px | mobile ${m ? m.horizontalOverflowPx : '?'}px`);
  console.log(`  H1 (${d.h1Count})   : ${JSON.stringify(d.h1)}`);
  console.log(`  display  : ${d.h1FontFamily} @ ${d.h1FontSize} w${d.h1FontWeight}`);
  console.log(`  body     : ${d.bodyFontFamily} @ ${d.bodyFontSize} / ${d.bodyLineHeight}`);
  console.log(`  colour   : fg ${d.bodyColor} on bg ${d.bodyBackground}`);
  if (m) console.log(`  mobile H1: ${m.h1FontSize}   body ${m.bodyFontSize}`);
  console.log(`  nav (${d.navLinkCount}) : ${JSON.stringify(d.navLinks.slice(0, 14))}`);
  console.log(`  CTAs     : ${JSON.stringify(d.ctaLabels.slice(0, 10))}`);
  if (d.langSwitcher.length) console.log(`  language : ${JSON.stringify(d.langSwitcher)}`);
  if (d.mailto.length) console.log(`  email    : ${JSON.stringify(d.mailto)}`);
  if (d.tel.length) console.log(`  phone    : ${JSON.stringify(d.tel)}`);
  console.log(`  sections :`);
  for (const s of d.sections.slice(0, 12)) {
    console.log(`     ${String(s.height).padStart(5)}px  ${s.images} img  ${s.heading}`);
  }
}
