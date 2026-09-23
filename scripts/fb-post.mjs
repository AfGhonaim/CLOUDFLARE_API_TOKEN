#!/usr/bin/env node
/**
 * Publishes a post to a Facebook Page through the Graph API.
 *
 *   node scripts/fb-post.mjs --check
 *   node scripts/fb-post.mjs --message "Hello" [--link URL] [--image PATH|URL] [--schedule ISO]
 *   node scripts/fb-post.mjs --file post.txt ... --publish
 *
 * Without --publish nothing is sent: the script prints exactly what would be
 * posted. A Page post is public the moment it lands, so going live is always
 * a deliberate second step.
 *
 * Credentials come from the environment (or a gitignored .env at the repo root):
 *   FB_PAGE_ID     the Page's numeric id
 *   FB_PAGE_TOKEN  a Page access token with pages_manage_posts
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const GRAPH = 'https://graph.facebook.com';

/** Facebook only accepts a scheduled time 10 minutes to 30 days ahead. */
const MIN_SCHEDULE_MS = 10 * 60 * 1000;
const MAX_SCHEDULE_MS = 30 * 24 * 60 * 60 * 1000;

const USAGE = `usage:
  node scripts/fb-post.mjs --check
  node scripts/fb-post.mjs (--message TEXT | --file PATH) [--link URL] [--image PATH|URL]
                           [--schedule ISO-8601] [--publish]`;

export function parseArgs(argv) {
  const opts = { check: false, publish: false };
  const valued = new Set(['--message', '--file', '--link', '--image', '--schedule']);
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--check') opts.check = true;
    else if (arg === '--publish') opts.publish = true;
    else if (valued.has(arg)) {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) throw new Error(`${arg} needs a value`);
      opts[arg.slice(2)] = value;
      i += 1;
    } else {
      throw new Error(`unknown option: ${arg}`);
    }
  }
  return opts;
}

const isUrl = (value) => /^https?:\/\//i.test(value);

/**
 * Work out which endpoint and fields a post needs, without touching the network.
 * A photo goes to /photos with the text as its caption; anything else to /feed.
 */
export function planPost({ message, link, image, schedule }, now = Date.now()) {
  if (!message && !image) throw new Error('a post needs --message/--file, --image, or both');
  if (link && image) throw new Error('Facebook cannot attach both a link and an image; put the link in the message');
  if (link && !isUrl(link)) throw new Error(`--link must be an http(s) URL: ${link}`);

  const fields = {};
  if (schedule) {
    const at = Date.parse(schedule);
    if (Number.isNaN(at)) throw new Error(`--schedule is not a date: ${schedule}`);
    if (at - now < MIN_SCHEDULE_MS || at - now > MAX_SCHEDULE_MS) {
      throw new Error('--schedule must be between 10 minutes and 30 days from now');
    }
    fields.published = 'false';
    fields.scheduled_publish_time = String(Math.floor(at / 1000));
  }

  if (image) {
    if (message) fields.caption = message;
    if (isUrl(image)) fields.url = image;
    return { edge: 'photos', fields, localImage: isUrl(image) ? null : image };
  }

  fields.message = message;
  if (link) fields.link = link;
  return { edge: 'feed', fields, localImage: null };
}

async function graph(method, urlPath, token, body) {
  const response = await fetch(`${GRAPH}/${urlPath}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.error) {
    const e = json.error ?? {};
    const hint =
      e.code === 190 ? ' — the token is expired or invalid; generate a new Page token'
      : e.code === 200 || e.code === 10 ? ' — the token lacks pages_manage_posts, or is a user token rather than a Page token'
      : '';
    throw new Error(`Graph API ${response.status}: ${e.message ?? 'unknown error'}${hint}`);
  }
  return json;
}

function loadEnv() {
  try {
    process.loadEnvFile(path.join(ROOT, '.env'));
  } catch {
    // No .env, or a Node without loadEnvFile: the real environment is enough.
  }
  const pageId = process.env.FB_PAGE_ID;
  const token = process.env.FB_PAGE_TOKEN;
  const version = process.env.GRAPH_API_VERSION || 'v23.0';
  const missing = [!pageId && 'FB_PAGE_ID', !token && 'FB_PAGE_TOKEN'].filter(Boolean);
  return { pageId, token, version, missing };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.file) opts.message = (await readFile(path.resolve(opts.file), 'utf8')).trim();

  const env = loadEnv();

  if (opts.check) {
    if (env.missing.length) throw new Error(`missing ${env.missing.join(', ')}`);
    const page = await graph('GET', `${env.version}/${env.pageId}?fields=id,name,link`, env.token);
    console.log(`OK: token works for Page "${page.name}" (${page.id})${page.link ? `  ${page.link}` : ''}`);
    return;
  }

  const plan = planPost(opts);

  console.log(`POST /${env.pageId ?? '<FB_PAGE_ID>'}/${plan.edge}`);
  for (const [key, value] of Object.entries(plan.fields)) {
    const shown = key === 'scheduled_publish_time' ? `${value} (${new Date(value * 1000).toISOString()})` : value;
    console.log(`  ${key}: ${String(shown).replace(/\n/g, '\n    ')}`);
  }
  if (plan.localImage) console.log(`  source: ${plan.localImage} (uploaded)`);

  if (!opts.publish) {
    console.log('\nDry run — nothing was posted. Add --publish to post it.');
    return;
  }
  if (env.missing.length) throw new Error(`missing ${env.missing.join(', ')}`);

  const form = new FormData();
  for (const [key, value] of Object.entries(plan.fields)) form.append(key, value);
  if (plan.localImage) {
    const bytes = await readFile(path.resolve(plan.localImage));
    form.append('source', new Blob([bytes]), path.basename(plan.localImage));
  }

  const result = await graph('POST', `${env.version}/${env.pageId}/${plan.edge}`, env.token, form);
  const postId = result.post_id ?? result.id;
  console.log(`\n${plan.fields.published === 'false' ? 'Scheduled' : 'Posted'}: ${postId}`);
  console.log(`https://www.facebook.com/${postId}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`fb-post: ${error.message}\n\n${USAGE}`);
    process.exit(1);
  });
}
