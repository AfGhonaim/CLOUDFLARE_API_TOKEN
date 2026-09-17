/**
 * Shared Chromium launch settings for every script that drives a browser.
 *
 * Two environment facts are handled here so no caller has to repeat them:
 *
 * 1. The sandbox ships a Chromium build that may not match the one this
 *    Playwright version expects, so whichever build is on disk is preferred
 *    over Playwright's pinned path.
 *
 * 2. The egress proxy re-terminates TLS with its own CA. curl and Node are
 *    configured to trust it; Chromium keeps its own root store and is not.
 *    Trust is pinned to that one CA's public key, so any chain without that
 *    exact key still fails — a genuinely bad certificate is still caught.
 *    `ignoreHTTPSErrors` would disable verification wholesale and must not be
 *    used in its place.
 *
 * Without (2), pages that load webfonts or any other external asset fail in
 * ways that look like page defects but are not.
 */

import { readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const PROXY_CA = '/root/.ccr/agent-proxy-ca.crt';

export function findChromium() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;

  const base = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!base) return undefined;

  try {
    const build = readdirSync(base)
      .filter((name) => /^chromium-\d+$/.test(name))
      .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]))[0];
    return build ? path.join(base, build, 'chrome-linux', 'chrome') : undefined;
  } catch {
    return undefined;
  }
}

export function proxyCaSpkiHash() {
  if (!existsSync(PROXY_CA)) return null;
  try {
    const pubkey = execFileSync('openssl', ['x509', '-in', PROXY_CA, '-pubkey', '-noout']);
    const der = execFileSync('openssl', ['pkey', '-pubin', '-outform', 'der'], { input: pubkey });
    return execFileSync('openssl', ['dgst', '-sha256', '-binary'], { input: der }).toString('base64');
  } catch {
    return null;
  }
}

/** Launch options for chromium.launch(). */
export function launchOptions() {
  const args = ['--no-sandbox'];
  const spki = proxyCaSpkiHash();
  if (spki) args.push(`--ignore-certificate-errors-spki-list=${spki}`);

  const executablePath = findChromium();
  return executablePath ? { executablePath, args } : { args };
}
