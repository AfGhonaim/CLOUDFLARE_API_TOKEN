#!/usr/bin/env node
/**
 * Publish to a Facebook Page from the command line.
 *
 *   node scripts/facebook-post.mjs pages                      list Pages your user token manages
 *   node scripts/facebook-post.mjs whoami                     check the Page token
 *   node scripts/facebook-post.mjs post --message "Hello"     preview a post
 *   node scripts/facebook-post.mjs post --message "Hello" --yes          publish it
 *   node scripts/facebook-post.mjs post --image photo.jpg --message "…" --yes
 *   node scripts/facebook-post.mjs post --link https://… --message "…" --schedule 2026-10-01T09:00:00+03:00 --yes
 *   node scripts/facebook-post.mjs scheduled                  list posts waiting to go out
 *
 * `post` only previews unless --yes is given: a Page post is public the moment
 * it lands, so publishing is always an explicit act.
 *
 * Credentials come from the environment or a .env file (see docs/FACEBOOK.md).
 */

import { parseArgs } from 'node:util';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { loadConfig, createClient, buildPost, parseSchedule } from './lib/facebook.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');

/** Minimal .env reader: KEY=value lines; the real environment wins. */
function loadDotEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const pair = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!pair || process.env[pair[1]] !== undefined) continue;
    process.env[pair[1]] = pair[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

function usage() {
  console.error('usage: node scripts/facebook-post.mjs <pages|whoami|post|scheduled> [options]');
  console.error('  post options: --message <text> | --message-file <path>, --link <url>, --image <path|url>,');
  console.error('                --schedule <ISO time>, --yes');
  process.exit(1);
}

loadDotEnv(path.join(ROOT, '.env'));

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    message: { type: 'string', short: 'm' },
    'message-file': { type: 'string' },
    link: { type: 'string' },
    image: { type: 'string' },
    schedule: { type: 'string' },
    yes: { type: 'boolean', short: 'y', default: false },
  },
});

const command = positionals[0];

try {
  switch (command) {
    case 'pages': {
      const client = createClient(loadConfig(process.env, { requirePage: false }));
      const pages = await client.listPages();
      if (pages.length === 0) {
        console.log('This user token manages no Pages, or was granted none of them at login.');
        break;
      }
      for (const page of pages) {
        const canPost = (page.tasks ?? []).includes('CREATE_CONTENT');
        console.log(`${page.name}\n  FB_PAGE_ID=${page.id}\n  FB_PAGE_ACCESS_TOKEN=${page.access_token}\n  can post: ${canPost ? 'yes' : 'no'}\n`);
      }
      console.log('Copy the two lines for your Page into .env. Treat the token like a password.');
      break;
    }

    case 'whoami': {
      const page = await createClient(loadConfig(process.env)).whoami();
      console.log(`Connected to "${page.name}" (id ${page.id})${page.link ? ` — ${page.link}` : ''}`);
      if (page.fan_count !== undefined) console.log(`Followers/likes: ${page.fan_count}`);
      break;
    }

    case 'post': {
      const message = values['message-file']
        ? readFileSync(values['message-file'], 'utf8')
        : values.message;
      const post = {
        message,
        link: values.link,
        image: values.image,
        scheduleAt: values.schedule ? parseSchedule(values.schedule) : undefined,
      };
      const { edge, fields, imageFile } = buildPost(post);
      const config = loadConfig(process.env);

      console.log(`Page:     ${config.pageId}`);
      console.log(`Type:     ${edge === 'photos' ? 'photo' : fields.link ? 'link' : 'text'}`);
      if (fields.message) console.log(`Message:\n${fields.message.replace(/^/gm, '  ')}`);
      if (fields.link) console.log(`Link:     ${fields.link}`);
      if (imageFile || fields.url) console.log(`Image:    ${imageFile ?? fields.url}`);
      console.log(`When:     ${post.scheduleAt ? new Date(post.scheduleAt * 1000).toString() : 'immediately'}`);

      if (!values.yes) {
        console.log('\nPreview only. Re-run with --yes to publish.');
        break;
      }
      const result = await createClient(config).publish(post);
      const id = result.post_id ?? result.id;
      console.log(`\n${post.scheduleAt ? 'Scheduled' : 'Published'}: ${id}`);
      console.log(`https://www.facebook.com/${id}`);
      break;
    }

    case 'scheduled': {
      const posts = await createClient(loadConfig(process.env)).listScheduled();
      if (posts.length === 0) console.log('Nothing scheduled.');
      for (const p of posts) {
        const when = new Date(Number(p.scheduled_publish_time) * 1000).toString();
        console.log(`${when}  ${p.id}\n  ${(p.message ?? '(no text)').split('\n')[0].slice(0, 100)}`);
      }
      break;
    }

    default:
      usage();
  }
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exit(1);
}
