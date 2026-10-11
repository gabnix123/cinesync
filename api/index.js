/**
 * CineSync Vercel Serverless API
 *
 * This file handles ALL /api/* routes on Vercel.
 * No Express needed â€” just raw Node.js req/res.
 * The TMDB_API_KEY is read from environment variables (set in Vercel dashboard).
 * No API key is ever exposed to the browser.
 *
 * Routes:
 *   GET /api/health    â€” health check
 *   GET /api/genres    â€” list of movie genres
 *   GET /api/popular   â€” popular movies for the hero marquee
 *   GET /api/discover  â€” discover movies by genre + runtime
 *   GET /api/movie/:id â€” full details for a single movie
 */

const TMDB_BASE = 'https://api.themoviedb.org/3';

// â”€â”€ CORS headers (restrict to specific origins) â”€â”€
// Allow the frontend origin and common localhost origins for development
const ALLOWED_ORIGINS = [
  'https://cinesync-virid.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];

function getCORSHeaders(origin) {
  // Check if the origin is in our allowed list
  const isAllowed = ALLOWED_ORIGINS.includes(origin);
  const allowedOrigin = isAllowed ? origin : ALLOWED_ORIGINS[0]; // Default to first allowed origin

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
}

// â”€â”€ Helper: fetch TMDb with the server-side API key â”€â”€
async function fetchTMDB(endpoint, params = {}) {
  const url = new URL(`${TMDB_BASE}${endpoint}`);
  // Read the key from Vercel environment variables
  url.searchParams.set('api_key', process.env.TMDB_API_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  const resp = await fetch(url.toString());

  // Handle different TMDb response codes appropriately
  if (!resp.ok) {
    // Create an error with the status code for better handling
    const error = new Error(`TMDb API error: ${resp.status}`);
    error.status = resp.status;
    throw error;
  }
  return resp.json();
}

// â”€â”€ Helper: parse pathname from request â”€â”€
function getPath(req) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  return url.pathname;
}

// â”€â”€ Rate limiting storage (in-memory, per instance) â”€â”€
// Note: This is a simple implementation that works within a single function instance.
// For production across multiple instances, consider using Vercel KV or Upstash Redis.
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60; // 60 requests per minute

function isRateLimited(ip) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  // Clean up old entries
  for (const [key, timestamps] of rateLimitStore.entries()) {
    const validTimestamps = timestamps.filter(t => t > windowStart);
    if (validTimestamps.length === 0) {
      rateLimitStore.delete(key);
    } else {
      rateLimitStore.set(key, validTimestamps);
    }
  }

  // Check current IP
  const timestamps = rateLimitStore.get(ip) || [];
  const recentRequests = timestamps.filter(t => t > windowStart);

  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  // Add current request
  timestamps.push(now);
  rateLimitStore.set(ip, timestamps);
  return false;
}

// â”€â”€ Main entry point (Vercel calls this on each request) â”€â”€
export default async function handler(req, res) {
  // Get origin and IP for rate limiting and CORS
  const origin = req.headers.origin || '';
  const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket.remoteAddress || 'unknown';

  // â”€â”€ Rate limiting â”€â”€
  if (isRateLimited(ip)) {
    const headers = getCORSHeaders(origin);
    res.writeHead(429, {
      ...headers,
      'Retry-After': String(Math.ceil(RATE_LIMIT_WINDOW_MS / 1000))
    });
    res.end(JSON.stringify({ error: 'Too many requests. Please try again later.' }));
    return;
  }

  // â”€â”€ CORS preflight â”€â”€
  if (req.method === 'OPTIONS') {
    const headers = getCORSHeaders(origin);
    res.writeHead(204, headers);
    res.end();
    return;
  }

  // â”€â”€ Only GET requests â”€â”€
  if (req.method !== 'GET') {
    const headers = getCORSHeaders(origin);
    res.writeHead(405, headers);
    res.end(JSON.stringify({ error: 'Method not allowed.' }));
    return;
  }

  const path = getPath(req);
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const query = Object.fromEntries(url.searchParams.entries());

  try {
    // â”€â”€ Health check â”€â”€
    if (path === '/api/health') {
      const headers = getCORSHeaders(origin);
      return ok(res, { status: 'ok' }, headers);
    }

    // â”€â”€ Genres â”€â”€
    if (path === '/api/genres') {
      const data = await fetchTMDB('/genre/movie/list', { language: 'en-US' });
      const headers = getCORSHeaders(origin);
      return ok(res, { genres: data.genres || [] }, headers);
    }

    // â”€â”€ Popular movies â”€â”€
    if (path === '/api/popular') {
      const data = await fetchTMDB('/movie/popular', { language: 'en-US', page: '1' });
      const headers = getCORSHeaders(origin);
      return ok(res, { results: data.results || [] }, headers);
    }

    // â”€â”€ Discover movies â”€â”€
    if (path === '/api/discover') {
      // Validate genreId
      if (query.genreId && (!/^\d+$/.test(query.genreId) || Number(query.genreId) <= 0)) {
        const headers = getCORSHeaders(origin);
        return bad(res, 'Invalid genre ID.', headers);
      }
      // Validate maxRuntime
      if (query.maxRuntime) {
        if (!/^\d+$/.test(query.maxRuntime)) {
          const headers = getCORSHeaders(origin);
          return bad(res, 'Runtime must be a number.', headers);
        }
        const rt = Number(query.maxRuntime);
        if (rt < 10 || rt > 360) {
          const headers = getCORSHeaders(origin);
          return bad(res, 'Runtime must be between 10 and 360.', headers);
        }
      }

      const params = {
        include_adult: 'false',
        include_video: 'false',
        language: 'en-US',
        page: '1',
        sort_by: 'popularity.desc',
      };
      if (query.genreId) params.with_genres = query.genreId;
      if (query.maxRuntime) params['with_runtime.lte'] = query.maxRuntime;
      if (query.yearFrom) params['primary_release_date.gte'] = `${query.yearFrom}-01-01`;
      if (query.yearTo) params['primary_release_date.lte'] = `${query.yearTo}-12-31`;

      const data = await fetchTMDB('/discover/movie', params);
      const headers = getCORSHeaders(origin);
      return ok(res, { results: data.results || [] }, headers);
    }

    // -- Single movie details (matches /api/movie/123) --
    const movieMatch = path.match(/^\/api\/movie\/(\d+)$/);
    if (movieMatch) {
      const movieId = parseInt(movieMatch[1], 10);
      if (movieId <= 0) {
        const headers = getCORSHeaders(origin);
        return bad(res, 'Invalid movie ID.', headers);
      }
      try {
        const data = await fetchTMDB(`/movie/${movieId}`, { language: 'en-US' });
        const headers = getCORSHeaders(origin);
        return ok(res, data, headers);
      } catch (err) {
        // Handle different TMDb error codes appropriately
        const headers = getCORSHeaders(origin);
        if (err.status === 404) {
          // Movie not found
          return ok(res, { error: 'Movie not found.' }, headers);
        } else if (err.status === 401 || err.status === 403) {
          // API key issues
          return ok(res, { error: 'Service unavailable. Please try again later.' }, headers);
        } else if (err.status === 429) {
          // Rate limited by TMDb
          const retryAfter = err.headers ? err.headers.get('retry-after') : undefined;
          if (retryAfter) {
            res.writeHead(429, {
              ...headers,
              'Retry-After': retryAfter
            });
          } else {
            res.writeHead(429, headers);
          }
          res.end(JSON.stringify({ error: 'Too many requests. Please try again later.' }));
          return;
        } else if (err.status >= 500) {
          // TMDb server error
          return ok(res, { error: 'Service unavailable. Please try again later.' }, headers);
        } else {
          // Other errors
          return ok(res, { error: 'Failed to fetch from TMDb.' }, headers);
        }
      }
    }

    // -- Trailer (matches /api/movie/123/trailer) --
    const trailerMatch = path.match(/^\/api\/movie\/(\d+)\/trailer$/);
    if (trailerMatch) {
      const movieId = parseInt(trailerMatch[1], 10);
      if (movieId <= 0) {
        const headers = getCORSHeaders(origin);
        return bad(res, 'Invalid movie ID.', headers);
      }
      const data = await fetchTMDB(`/movie/${movieId}/videos`, { language: 'en-US' });
      const trailers = (data.results || []).filter(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
      const video = trailers[0] || (data.results || []).find(v => v.site === 'YouTube');
      const headers = getCORSHeaders(origin);
      return ok(res, { key: video ? video.key : null }, headers);
    }

    // -- Similar movies (matches /api/movie/123/similar) --
    const similarMatch = path.match(/^\/api\/movie\/(\d+)\/similar$/);
    if (similarMatch) {
      const movieId = parseInt(similarMatch[1], 10);
      if (movieId <= 0) {
        const headers = getCORSHeaders(origin);
        return bad(res, 'Invalid movie ID.', headers);
      }
      const data = await fetchTMDB(`/movie/${movieId}/similar`, { language: 'en-US', page: '1' });
      const headers = getCORSHeaders(origin);
      return ok(res, { results: (data.results || []).slice(0, 6) }, headers);
    }

    // -- 404 for unknown routes --
    const headers = getCORSHeaders(origin);
    res.writeHead(404, headers);
    res.end(JSON.stringify({ error: 'API route not found.' }));

  } catch (err) {
    console.error('CineSync API error:', err.message);
    const headers = getCORSHeaders(origin);

    // Handle network errors and unexpected errors
    if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
      return ok(res, { error: 'Service unavailable. Please try again later.' }, headers);
    }

    // For any other unexpected errors
    return ok(res, { error: 'Failed to fetch from TMDb.' }, headers);
  }
}

// â”€â”€ Convenience helpers â”€â”€
function ok(res, data, headers = {}) {
  res.writeHead(200, headers);
  res.end(JSON.stringify(data));
}

function bad(res, msg, headers = {}) {
  res.writeHead(400, headers);
  res.end(JSON.stringify({ error: msg }));
}