// Javis — Worker entry point
//
// Serves:
//   - GET  /api/comments?pageId=<path>     list comments for a page
//   - POST /api/comments                   add a new comment
//                                          body: { pageId, name, comment, turnstileToken }
//   - anything else                        falls through to static ASSETS binding
//
// Storage: KV namespace `COMMENTS_KV`, key = `comment:<pageId>:<ISO timestamp>-<rand>`
// Spam: Cloudflare Turnstile (server-side siteverify with env.TURNSTILE_SECRET)
//
// All comments are auto-published. For moderation, query KV directly via dashboard
// or add a future `/api/admin/...` endpoint.

const MAX_NAME = 50;
const MAX_BODY = 5000;
const TURNSTILE_VERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    if (url.pathname === '/api/comments') {
      if (request.method === 'GET') return listComments(url, env);
      if (request.method === 'POST') return postComment(request, env);
      return jsonResponse({ error: 'method not allowed' }, 405);
    }

    // Fall through to static asset binding for everything else.
    return env.ASSETS.fetch(request);
  },
};

// --------------------------------------------------------------------------

async function listComments(url, env) {
  const pageId = url.searchParams.get('pageId');
  if (!pageId) return jsonResponse({ error: 'pageId required' }, 400);

  const prefix = `comment:${normalize(pageId)}:`;
  const list = await env.COMMENTS_KV.list({ prefix, limit: 1000 });
  const items = await Promise.all(
    list.keys.map((k) => env.COMMENTS_KV.get(k.name, { type: 'json' }))
  );
  const comments = items
    .filter(Boolean)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return jsonResponse({ comments });
}

async function postComment(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'invalid json' }, 400);
  }

  const { pageId, name, comment, turnstileToken } = body || {};
  if (!pageId || !name || !comment || !turnstileToken) {
    return jsonResponse({ error: 'missing required fields' }, 400);
  }
  if (typeof name !== 'string' || typeof comment !== 'string') {
    return jsonResponse({ error: 'invalid types' }, 400);
  }
  if (name.length > MAX_NAME) {
    return jsonResponse({ error: `name too long (max ${MAX_NAME})` }, 400);
  }
  if (comment.length > MAX_BODY) {
    return jsonResponse({ error: `comment too long (max ${MAX_BODY})` }, 400);
  }

  const ip = request.headers.get('CF-Connecting-IP') || '';
  if (env.TURNSTILE_SECRET) {
    const ok = await verifyTurnstile(turnstileToken, ip, env);
    if (!ok) {
      return jsonResponse({ error: 'captcha verification failed' }, 403);
    }
  }

  const createdAt = new Date().toISOString();
  const rand = crypto.randomUUID().slice(0, 8);
  const key = `comment:${normalize(pageId)}:${createdAt}-${rand}`;

  const record = {
    name: sanitize(name).slice(0, MAX_NAME),
    comment: sanitize(comment).slice(0, MAX_BODY),
    createdAt,
    ip: anonymizeIp(ip),
  };

  await env.COMMENTS_KV.put(key, JSON.stringify(record));
  return jsonResponse({ ok: true, createdAt });
}

// --------------------------------------------------------------------------

async function verifyTurnstile(token, ip, env) {
  if (!env.TURNSTILE_SECRET) return false;
  try {
    const resp = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: env.TURNSTILE_SECRET,
        response: token,
        remoteip: ip,
      }),
    });
    const data = await resp.json();
    return data && data.success === true;
  } catch {
    return false;
  }
}

// --------------------------------------------------------------------------

function normalize(pageId) {
  // Restrict pageId to printable URL pathname chars; strip query/fragment.
  return String(pageId)
    .replace(/[?#].*/, '')
    .replace(/[^A-Za-z0-9._/\-]/g, '_')
    .slice(0, 200);
}

function sanitize(s) {
  // Strip control chars (except CR/LF/tab) and trim.
  return String(s)
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
    .trim();
}

function anonymizeIp(ip) {
  // Coarse anonymization — keep /24 for IPv4, /64 for IPv6.
  if (!ip) return '';
  if (ip.includes(':')) {
    return ip.split(':').slice(0, 4).join(':') + '::/64';
  }
  const parts = ip.split('.');
  if (parts.length === 4) return parts.slice(0, 3).join('.') + '.0/24';
  return '';
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(),
    },
  });
}
