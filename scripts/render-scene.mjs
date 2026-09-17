#!/usr/bin/env node
/**
 * Renders a scene from scenes/<id>/scene.json through Cloudflare Workers AI.
 *
 *   node scripts/render-scene.mjs uae-railway --dry-run
 *   node scripts/render-scene.mjs uae-railway --framing wide --count 4
 *
 * The prompt lives in the scene file, not in here and not in a chat log, so the
 * same wording can be re-rendered, diffed, and argued about later. --dry-run
 * prints exactly what would be sent and calls nothing, which is also how the
 * prompt gets pasted into Midjourney or Firefly by hand.
 *
 * Needs CLOUDFLARE_ACCOUNT_ID and a token with "Workers AI: Read". That is a
 * different permission from the Pages deploy token, so it reads
 * CLOUDFLARE_AI_TOKEN first and only falls back to CLOUDFLARE_API_TOKEN —
 * the deploy token stays scoped to Pages and nothing more.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const API = 'https://api.cloudflare.com/client/v4';

const argv = process.argv.slice(2);
const sceneId = argv.find((arg) => !arg.startsWith('-'));

if (!sceneId || argv.includes('--help')) {
  console.error('usage: node scripts/render-scene.mjs <scene> [--framing <name>] [--model <id>] [--count <n>] [--seed <n>] [--dry-run]');
  process.exit(sceneId ? 0 : 1);
}

/** Bad input here is a typo, not a bug worth a stack trace. */
function die(message) {
  console.error(message);
  process.exit(1);
}

/** Reads `--flag value`, returning undefined when the flag is absent. */
function flag(name) {
  const at = argv.indexOf(`--${name}`);
  if (at === -1) return undefined;
  const value = argv[at + 1];
  if (value === undefined || value.startsWith('--')) die(`--${name} needs a value`);
  return value;
}

const dryRun = argv.includes('--dry-run');
const count = Number(flag('count') ?? 1);
if (!Number.isInteger(count) || count < 1 || count > 20) {
  die('--count must be a whole number between 1 and 20');
}

const sceneDir = path.join(ROOT, 'scenes', sceneId);
if (!existsSync(path.join(sceneDir, 'scene.json'))) {
  die(`no scene at scenes/${sceneId}/scene.json`);
}
const scene = JSON.parse(await readFile(path.join(sceneDir, 'scene.json'), 'utf8'));

const framingName = flag('framing') ?? scene.defaultFraming;
const framing = scene.framings?.[framingName];
if (!framing) {
  const names = Object.keys(scene.framings ?? {}).join(', ') || 'none defined';
  die(`unknown framing "${framingName}" — this scene has: ${names}`);
}

const modelId = flag('model') ?? scene.defaultModel;
// An unlisted model still renders; it just gets no per-model params, because
// Cloudflare's catalogue moves faster than this file does.
const model = scene.models?.[modelId] ?? { params: {}, supports: {} };
const supports = model.supports ?? {};

// Framing first: it is the instruction most models weight hardest, and it is
// the one thing that changes between renders of the same scene.
const prompt = `${framing} ${scene.prompt}`;

const input = { prompt, ...(model.params ?? {}) };
if (supports.negativePrompt !== false && scene.negativePrompt) {
  input.negative_prompt = scene.negativePrompt;
}
const seed = flag('seed');
if (seed !== undefined) {
  if (supports.seed === false) die(`${modelId} does not take a seed`);
  input.seed = Number(seed);
}

if (dryRun) {
  console.log(`scene:   ${scene.id} — ${scene.title}`);
  console.log(`model:   ${modelId}`);
  console.log(`framing: ${framingName}`);
  console.log(`renders: ${count}`);
  console.log(`\nprompt:\n${prompt}`);
  if (input.negative_prompt) console.log(`\nnegative prompt:\n${input.negative_prompt}`);
  else if (scene.negativePrompt) console.log(`\nnegative prompt: not sent — ${modelId} does not accept one`);
  const params = Object.fromEntries(
    Object.entries(input).filter(([key]) => key !== 'prompt' && key !== 'negative_prompt'),
  );
  console.log(`\nparameters: ${JSON.stringify(params)}`);
  process.exit(0);
}

/** Loads .env by hand; the repo carries no dotenv dependency. */
async function loadEnvFile() {
  const file = path.join(ROOT, '.env');
  if (!existsSync(file)) return;
  for (const line of (await readFile(file, 'utf8')).split(/\r?\n/)) {
    const pair = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!pair) continue;
    const value = pair[2].trim().replace(/^["'](.*)["']$/, '$1');
    if (value && !process.env[pair[1]]) process.env[pair[1]] = value;
  }
}

await loadEnvFile();
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_AI_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
if (!account || !token) {
  console.error('Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_TOKEN (Workers AI: Read) in .env,');
  console.error('or run with --dry-run to print the prompt and render it somewhere else.');
  process.exit(1);
}

/** PNG and JPEG both come back; the endpoint decides, so sniff the bytes. */
function extensionFor(bytes) {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'jpg';
  return 'bin';
}

async function render() {
  const response = await fetch(`${API}/accounts/${account}/ai/run/${modelId}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });

  const type = response.headers.get('content-type') ?? '';

  if (type.includes('application/json')) {
    const body = await response.json();
    if (!response.ok || body.success === false) {
      const why = (body.errors ?? []).map((error) => `${error.code}: ${error.message}`).join('; ');
      throw new Error(why || `Workers AI returned ${response.status}`);
    }
    // Some models answer with the image base64-encoded inside the envelope.
    const encoded = body.result?.image;
    if (!encoded) throw new Error('the response carried no image');
    return Buffer.from(encoded, 'base64');
  }

  if (!response.ok) throw new Error(`Workers AI returned ${response.status}: ${await response.text()}`);
  return Buffer.from(await response.arrayBuffer());
}

const outDir = path.join(ROOT, flag('out') ?? path.join('build', 'scenes'));
await mkdir(outDir, { recursive: true });

for (let n = 1; n <= count; n += 1) {
  let bytes;
  try {
    bytes = await render();
  } catch (error) {
    die(`render ${n} of ${count} failed — ${error.message}`);
  }
  const file = path.join(outDir, `${scene.id}-${framingName}-${String(n).padStart(2, '0')}.${extensionFor(bytes)}`);
  await writeFile(file, bytes);
  console.log(`${path.relative(ROOT, file)}  ${(bytes.length / 1024).toFixed(0)} KB`);
}

console.log(`\n${count} render${count === 1 ? '' : 's'} of "${scene.title}".`);
console.log('Check each one against the review list in scenes/' + scene.id + '/BRIEF.md before using it.');
