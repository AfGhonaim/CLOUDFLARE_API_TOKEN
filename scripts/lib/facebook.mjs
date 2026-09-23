/**
 * Everything that speaks the Facebook Pages dialect of the Graph API: listing
 * the Pages a user token manages, checking a Page token, and publishing text,
 * link, and photo posts — now or on a schedule.
 *
 * No dependencies: Node's own fetch, FormData, Blob and crypto are enough.
 */

import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const DEFAULT_GRAPH_API_VERSION = 'v23.0';

/** Facebook refuses a scheduled post less than 10 minutes out... */
export const MIN_SCHEDULE_SECONDS = 10 * 60;
/** ...or more than 30 days out. */
export const MAX_SCHEDULE_SECONDS = 30 * 24 * 60 * 60;

const REQUIRED_ENV = ['FB_PAGE_ID', 'FB_PAGE_ACCESS_TOKEN'];

export function loadConfig(env, { requirePage = true } = {}) {
  if (requirePage) {
    const missing = REQUIRED_ENV.filter((name) => !env[name]);
    if (missing.length > 0) {
      throw new Error(`Missing required variable(s): ${missing.join(', ')}. See docs/FACEBOOK.md.`);
    }
  }
  return Object.freeze({
    pageId: env.FB_PAGE_ID ?? null,
    pageToken: env.FB_PAGE_ACCESS_TOKEN ?? null,
    userToken: env.FB_USER_ACCESS_TOKEN ?? null,
    appSecret: env.FB_APP_SECRET ?? null,
    graphApiVersion: env.GRAPH_API_VERSION || DEFAULT_GRAPH_API_VERSION,
  });
}

/**
 * HMAC of the token keyed by the app secret. Only sent when FB_APP_SECRET is
 * set; apps with "Require App Secret" switched on reject calls without it.
 */
export function appSecretProof(token, appSecret) {
  return createHmac('sha256', appSecret).update(token).digest('hex');
}

/**
 * Turn `--schedule` input into the Unix timestamp Facebook wants, refusing
 * anything outside the window it accepts so the mistake surfaces locally.
 */
export function parseSchedule(value, now = Date.now()) {
  const trimmed = String(value ?? '').trim();
  const ms = /^\d+$/.test(trimmed) ? Number(trimmed) * 1000 : Date.parse(trimmed);
  if (!Number.isFinite(ms)) {
    throw new Error(`Cannot read "${value}" as a time. Use ISO 8601 with a zone, e.g. 2026-10-01T09:00:00+03:00.`);
  }
  const seconds = Math.floor(ms / 1000);
  const ahead = seconds - Math.floor(now / 1000);
  if (ahead < MIN_SCHEDULE_SECONDS) throw new Error('A scheduled post must be at least 10 minutes in the future.');
  if (ahead > MAX_SCHEDULE_SECONDS) throw new Error('A scheduled post must be at most 30 days in the future.');
  return seconds;
}

const IMAGE_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
};

export function isUrl(value) {
  return /^https?:\/\//i.test(String(value ?? ''));
}

/**
 * Decide which edge a post goes to and what it carries. Pure, so the shape of
 * every request can be tested without the network.
 *
 * @param {{message?: string, link?: string, image?: string, scheduleAt?: number}} post
 * @returns {{edge: 'feed'|'photos', fields: Record<string, string>, imageFile: string|null}}
 */
export function buildPost({ message, link, image, scheduleAt } = {}) {
  const text = String(message ?? '').trim();
  if (!text && !link && !image) throw new Error('A post needs a message, a link, or an image.');
  if (link && !isUrl(link)) throw new Error(`--link must be an http(s) URL, got "${link}".`);
  if (link && image) {
    throw new Error('Facebook cannot attach a link and a photo to one post. Put the link in the message instead.');
  }

  const fields = {};
  let edge = 'feed';
  let imageFile = null;

  if (image) {
    edge = 'photos';
    if (isUrl(image)) {
      fields.url = image;
    } else {
      const type = IMAGE_TYPES[path.extname(image).toLowerCase()];
      if (!type) throw new Error(`Unsupported image type "${path.extname(image)}". Use JPEG, PNG, GIF, BMP or TIFF.`);
      imageFile = image;
    }
    if (text) fields.message = text;
  } else {
    if (text) fields.message = text;
    if (link) fields.link = link;
  }

  if (scheduleAt) {
    fields.published = 'false';
    fields.scheduled_publish_time = String(scheduleAt);
  }

  return { edge, fields, imageFile };
}

export class GraphError extends Error {
  constructor(status, body) {
    const detail = body?.error;
    const hint = detail?.code === 190
      ? ' The access token is invalid or expired — generate a new one (docs/FACEBOOK.md).'
      : detail?.code === 200 || detail?.code === 10
        ? ' The token lacks a permission: it needs pages_manage_posts and pages_read_engagement, and must be a Page token.'
        : '';
    const message = (detail?.message ?? JSON.stringify(body).slice(0, 500)).replace(/\.?$/, '.');
    super(`Graph API ${status}: ${message}${hint}`);
    this.status = status;
    this.code = detail?.code ?? null;
  }
}

export function createClient(config, { fetchImpl = globalThis.fetch } = {}) {
  const base = `https://graph.facebook.com/${config.graphApiVersion}`;

  async function call(method, pathname, { token, query = {}, body } = {}) {
    const url = new URL(`${base}/${pathname}`);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
    if (config.appSecret) url.searchParams.set('appsecret_proof', appSecretProof(token, config.appSecret));

    const response = await fetchImpl(url, {
      method,
      headers: { Authorization: `Bearer ${token}` },
      body,
    });
    const text = await response.text();
    let parsed;
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = { error: { message: text.slice(0, 500) } };
    }
    if (!response.ok || parsed.error) throw new GraphError(response.status, parsed);
    return parsed;
  }

  return {
    /** Pages the user token manages, each with its own Page access token. */
    async listPages() {
      if (!config.userToken) throw new Error('Listing Pages needs FB_USER_ACCESS_TOKEN.');
      const pages = [];
      let after = null;
      do {
        const query = { fields: 'id,name,access_token,tasks', limit: '100' };
        if (after) query.after = after;
        const page = await call('GET', 'me/accounts', { token: config.userToken, query });
        pages.push(...(page.data ?? []));
        after = page.paging?.next ? page.paging?.cursors?.after : null;
      } while (after);
      return pages;
    },

    /** Confirms the Page token works and names the Page it belongs to. */
    async whoami() {
      return call('GET', config.pageId, {
        token: config.pageToken,
        query: { fields: 'id,name,link,fan_count' },
      });
    },

    /** Publish (or schedule) a post. Returns the Graph response, which carries the new id. */
    async publish(post) {
      const { edge, fields, imageFile } = buildPost(post);
      let body;
      if (imageFile) {
        const form = new FormData();
        for (const [key, value] of Object.entries(fields)) form.set(key, value);
        const bytes = await readFile(imageFile);
        const type = IMAGE_TYPES[path.extname(imageFile).toLowerCase()];
        form.set('source', new Blob([bytes], { type }), path.basename(imageFile));
        body = form;
      } else {
        body = new URLSearchParams(fields);
      }
      return call('POST', `${config.pageId}/${edge}`, { token: config.pageToken, body });
    },

    /** Posts waiting to go out, soonest first. */
    async listScheduled() {
      const result = await call('GET', `${config.pageId}/scheduled_posts`, {
        token: config.pageToken,
        query: { fields: 'id,message,scheduled_publish_time,permalink_url' },
      });
      return result.data ?? [];
    },
  };
}
