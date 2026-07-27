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

// â”€â”€ CORS headers (allow any origin so the frontend can read responses) â”€â”€
const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

// â”€â”€ Helper: fetch TMDb with the server-side API key â”€â”€
async function fetchTMDB(endpoint, params = {}) {
  const url = new URL(`${TMDB_BASE}${endpoint}`);
  // Read the key from Vercel environment variables
  url.searchParams.set('api_key', process.env.TMDB_API_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  const resp = await fetch(url.toString());
  if (!resp.ok) throw new Error(`TMDb API error: ${resp.status}`);
  return resp.json();
}

// â”€â”€ Helper: parse pathname from request â”€â”€
function getPath(req) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  return url.pathname;
}

// â”€â”€ Main entry point (Vercel calls this on each request) â”€â”€
export default async function handler(req, res) {
  // â”€â”€ CORS preflight â”€â”€
  if (req.method === 'OPTIONS') {
    res.writeHead(204, HEADERS);
    res.end();
    return;
  }

  // â”€â”€ Only GET requests â”€â”€
  if (req.method !== 'GET') {
    res.writeHead(405, HEADERS);
    res.end(JSON.stringify({ error: 'Method not allowed.' }));
    return;
  }

  const path = getPath(req);
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const query = Object.fromEntries(url.searchParams.entries());

  try {
    // â”€â”€ Health check â”€â”€
    if (path === '/api/health') {
      return ok(res, { status: 'ok', key_loaded: !!process.env.TMDB_API_KEY });
    }

    // â”€â”€ Genres â”€â”€
    if (path === '/api/genres') {
      const data = await fetchTMDB('/genre/movie/list', { language: 'en-US' });
      return ok(res, { genres: data.genres || [] });
    }

    // â”€â”€ Popular movies â”€â”€
    if (path === '/api/popular') {
      const data = await fetchTMDB('/movie/popular', { language: 'en-US', page: '1' });
      return ok(res, { results: data.results || [] });
    }

    // â”€â”€ Discover movies â”€â”€
    if (path === '/api/discover') {
      // Validate genreId
      if (query.genreId && (!/^\d+$/.test(query.genreId) || Number(query.genreId) <= 0)) {
        return bad(res, 'Invalid genre ID.');
      }
      // Validate maxRuntime
      if (query.maxRuntime) {
        if (!/^\d+$/.test(query.maxRuntime)) {
          return bad(res, 'Runtime must be a number.');
        }
        const rt = Number(query.maxRuntime);
        if (rt < 10 || rt > 360) {
          return bad(res, 'Runtime must be between 10 and 360.');
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

      const data = await fetchTMDB('/discover/movie', params);
      return ok(res, { results: data.results || [] });
    }

    // â”€â”€ Single movie details (matches /api/movie/123) â”€â”€
    const movieMatch = path.match(/^\/api\/movie\/(\d+)$/);
    if (movieMatch) {
      const movieId = parseInt(movieMatch[1], 10);
      if (movieId <= 0) return bad(res, 'Invalid movie ID.');
      const data = await fetchTMDB(`/movie/${movieId}`, { language: 'en-US' });
      return ok(res, data);
    }

    // â”€â”€ 404 for unknown routes â”€â”€
    res.writeHead(404, HEADERS);
    res.end(JSON.stringify({ error: 'API route not found.' }));

  } catch (err) {
    console.error('CineSync API error:', err.message);
    res.writeHead(502, HEADERS);
    res.end(JSON.stringify({ error: 'Failed to fetch from TMDb.' }));
  }
}

// â”€â”€ Convenience helpers â”€â”€
function ok(res, data) {
  res.writeHead(200, HEADERS);
  res.end(JSON.stringify(data));
}

function bad(res, msg) {
  res.writeHead(400, HEADERS);
  res.end(JSON.stringify({ error: msg }));
}
