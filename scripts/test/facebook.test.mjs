import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  loadConfig,
  buildPost,
  parseSchedule,
  appSecretProof,
  createClient,
  GraphError,
} from '../lib/facebook.mjs';

const NOW = Date.parse('2026-09-23T12:00:00Z');

function fakeFetch(responses) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url: new URL(url), init });
    const next = responses.shift() ?? { status: 200, body: {} };
    return new Response(JSON.stringify(next.body), { status: next.status ?? 200 });
  };
  return { impl, calls };
}

const config = loadConfig({ FB_PAGE_ID: '123', FB_PAGE_ACCESS_TOKEN: 'page-token' });

describe('loadConfig', () => {
  it('names every missing variable', () => {
    assert.throws(() => loadConfig({}), /FB_PAGE_ID, FB_PAGE_ACCESS_TOKEN/);
  });
  it('does not need a Page to list Pages', () => {
    assert.equal(loadConfig({ FB_USER_ACCESS_TOKEN: 'u' }, { requirePage: false }).userToken, 'u');
  });
});

describe('buildPost', () => {
  it('sends text to the feed', () => {
    assert.deepEqual(buildPost({ message: ' Hello ' }), { edge: 'feed', fields: { message: 'Hello' }, imageFile: null });
  });
  it('attaches a link to a feed post', () => {
    assert.deepEqual(buildPost({ message: 'Read', link: 'https://example.com' }).fields, {
      message: 'Read',
      link: 'https://example.com',
    });
  });
  it('sends an image URL to photos', () => {
    const post = buildPost({ message: 'Look', image: 'https://example.com/a.jpg' });
    assert.equal(post.edge, 'photos');
    assert.deepEqual(post.fields, { url: 'https://example.com/a.jpg', message: 'Look' });
  });
  it('sends a local image as an upload', () => {
    const post = buildPost({ image: 'pics/a.PNG' });
    assert.equal(post.imageFile, 'pics/a.PNG');
    assert.deepEqual(post.fields, {});
  });
  it('marks scheduled posts unpublished', () => {
    assert.deepEqual(buildPost({ message: 'Later', scheduleAt: 1790000000 }).fields, {
      message: 'Later',
      published: 'false',
      scheduled_publish_time: '1790000000',
    });
  });
  it('refuses empty, link+image, bad links, and odd image types', () => {
    assert.throws(() => buildPost({ message: '  ' }), /needs a message/);
    assert.throws(() => buildPost({ link: 'https://a.b', image: 'x.jpg' }), /link and a photo/);
    assert.throws(() => buildPost({ link: 'example.com' }), /http\(s\) URL/);
    assert.throws(() => buildPost({ image: 'clip.mp4' }), /Unsupported image/);
  });
});

describe('parseSchedule', () => {
  it('accepts ISO times and Unix seconds inside the window', () => {
    assert.equal(parseSchedule('2026-09-24T12:00:00Z', NOW), Date.parse('2026-09-24T12:00:00Z') / 1000);
    assert.equal(parseSchedule(String(NOW / 1000 + 3600), NOW), NOW / 1000 + 3600);
  });
  it('refuses times Facebook would refuse', () => {
    assert.throws(() => parseSchedule('2026-09-23T12:05:00Z', NOW), /10 minutes/);
    assert.throws(() => parseSchedule('2026-11-30T12:00:00Z', NOW), /30 days/);
    assert.throws(() => parseSchedule('next tuesday', NOW), /Cannot read/);
  });
});

describe('client', () => {
  it('publishes a text post with the Page token', async () => {
    const { impl, calls } = fakeFetch([{ body: { id: '123_456' } }]);
    const result = await createClient(config, { fetchImpl: impl }).publish({ message: 'Hi' });
    assert.equal(result.id, '123_456');
    assert.equal(calls[0].url.pathname, '/v23.0/123/feed');
    assert.equal(calls[0].init.method, 'POST');
    assert.equal(calls[0].init.headers.Authorization, 'Bearer page-token');
    assert.equal(calls[0].init.body.get('message'), 'Hi');
    assert.equal(calls[0].url.searchParams.has('appsecret_proof'), false);
  });

  it('uploads a local photo as multipart', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'fb-'));
    const file = path.join(dir, 'p.jpg');
    await writeFile(file, Buffer.from([0xff, 0xd8, 0xff]));
    const { impl, calls } = fakeFetch([{ body: { id: '9', post_id: '123_9' } }]);
    await createClient(config, { fetchImpl: impl }).publish({ message: 'Pic', image: file });
    const form = calls[0].init.body;
    assert.equal(calls[0].url.pathname, '/v23.0/123/photos');
    assert.ok(form instanceof FormData);
    assert.equal(form.get('message'), 'Pic');
    assert.equal(form.get('source').type, 'image/jpeg');
    assert.equal(form.get('source').size, 3);
  });

  it('adds appsecret_proof when an app secret is configured', async () => {
    const withSecret = loadConfig({ FB_PAGE_ID: '123', FB_PAGE_ACCESS_TOKEN: 'page-token', FB_APP_SECRET: 's' });
    const { impl, calls } = fakeFetch([{ body: { id: '123', name: 'P' } }]);
    await createClient(withSecret, { fetchImpl: impl }).whoami();
    assert.equal(calls[0].url.searchParams.get('appsecret_proof'), appSecretProof('page-token', 's'));
  });

  it('follows paging when listing Pages', async () => {
    const userConfig = loadConfig({ FB_USER_ACCESS_TOKEN: 'user' }, { requirePage: false });
    const { impl, calls } = fakeFetch([
      { body: { data: [{ id: '1' }], paging: { cursors: { after: 'c1' }, next: 'https://…' } } },
      { body: { data: [{ id: '2' }], paging: { cursors: { after: 'c2' } } } },
    ]);
    const pages = await createClient(userConfig, { fetchImpl: impl }).listPages();
    assert.deepEqual(pages.map((p) => p.id), ['1', '2']);
    assert.equal(calls[1].url.searchParams.get('after'), 'c1');
  });

  it('explains an expired token', async () => {
    const { impl } = fakeFetch([{ status: 400, body: { error: { message: 'Session has expired', code: 190 } } }]);
    await assert.rejects(createClient(config, { fetchImpl: impl }).whoami(), (error) => {
      assert.ok(error instanceof GraphError);
      assert.equal(error.code, 190);
      assert.match(error.message, /invalid or expired/);
      return true;
    });
  });
});
