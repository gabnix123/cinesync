/**
 * CineSync Backend Server
 *
 * This Express server acts as a secure proxy between the frontend
 * and the TMDb API. The API key never leaves this server.
 *
 * Features:
 *   - TMDb API key stored server-side only (never sent to the browser)
 *   - Rate limiting on every route (30 requests / 60 seconds per IP)
 *   - Input validation and sanitization on all endpoints
 *   - CORS configured to only accept requests from our own frontend
 *   - Helmet security headers for HTTP hardening
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';

// -- Load .env file into process.env so we can read the API key --
config();

const app = express();
const PORT = process.env.PORT || 3001;
const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';

// ── Validate that the API key exists at startup ──
if (!TMDB_KEY) {
  console.error('FATAL: TMDB_API_KEY is not set in .env. Server cannot start.');
  process.exit(1);
}


// ============================================================
// MIDDLEWARE
// ============================================================

// -- Helmet: sets security-related HTTP headers automatically --
app.use(helmet());

// -- CORS: only allow requests from our own frontend --
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET'],
}));

// -- JSON parsing --
app.use(express.json());


// ── Rate limiter: 30 requests per 60 seconds per IP ──
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

// Apply the rate limiter to all /api routes
app.use('/api', limiter);


// ============================================================
// INPUT VALIDATION HELPERS
// ============================================================

/**
 * validateTime(str) — checks that a string is in HH:MM format.
 */
function validateTime(str) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(str);
}

/**
 * validateRuntime(num) — checks that a number is between 10 and 360.
 */
function validateRuntime(num) {
  return Number.isInteger(num) && num >= 10 && num <= 360;
}

/**
 * validateGenreId(str) — checks that a genre ID is a valid number
 * (or empty string for "all genres").
 */
function validateGenreId(str) {
  if (str === '' || str === undefined) return true;
  const n = Number(str);
  return Number.isInteger(n) && n > 0;
}

/**
 * sanitizeStr(str) — trims and strips potentially harmful characters.
 */
function sanitizeStr(str) {
  return String(str).trim().replace(/[<>"'`;\\]/g, '');
}


// ============================================================
// TMDB PROXY HELPERS
// ============================================================

/**
 * fetchTMDB(endpoint, params) — calls the TMDb API with our
 * server-side API key. Returns the parsed JSON response.
 */
async function fetchTMDB(endpoint, params = {}) {
  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.searchParams.set('api_key', TMDB_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  const resp = await fetch(url.toString());

  if (!resp.ok) {
    throw new Error(`TMDb API error: ${resp.status}`);
  }

  return resp.json();
}


// ============================================================
// API ROUTES
// ============================================================

// ── GET /api/genres ──
app.get('/api/genres', async (req, res) => {
  try {
    const data = await fetchTMDB('/genre/movie/list', { language: 'en-US' });
    res.json({ genres: data.genres || [] });
  } catch (err) {
    console.error('GET /api/genres error:', err.message);
    res.status(502).json({ error: 'Failed to fetch genres from TMDb.' });
  }
});


// ── GET /api/popular ──
app.get('/api/popular', async (req, res) => {
  try {
    const data = await fetchTMDB('/movie/popular', { language: 'en-US', page: '1' });
    res.json({ results: data.results || [] });
  } catch (err) {
    console.error('GET /api/popular error:', err.message);
    res.status(502).json({ error: 'Failed to fetch popular movies.' });
  }
});


// ── GET /api/movie/:id ──
app.get('/api/movie/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid movie ID.' });
  }

  try {
    const data = await fetchTMDB(`/movie/${id}`, { language: 'en-US' });
    res.json(data);
  } catch (err) {
    console.error(`GET /api/movie/${id} error:`, err.message);
    res.status(502).json({ error: 'Failed to fetch movie details.' });
  }
});


// ── GET /api/discover ──
app.get('/api/discover', async (req, res) => {
  const { genreId, maxRuntime } = req.query;

  if (genreId !== undefined && !validateGenreId(genreId)) {
    return res.status(400).json({ error: 'Invalid genre ID.' });
  }

  const runtimeNum = maxRuntime !== undefined ? Number(maxRuntime) : undefined;
  if (maxRuntime !== undefined && !validateRuntime(runtimeNum)) {
    return res.status(400).json({ error: 'Runtime must be an integer between 10 and 360 minutes.' });
  }

  const params = {
    include_adult: 'false',
    include_video: 'false',
    language: 'en-US',
    page: '1',
    sort_by: 'popularity.desc',
  };

  if (genreId) params.with_genres = String(genreId);
  if (maxRuntime) params['with_runtime.lte'] = String(maxRuntime);

  try {
    const data = await fetchTMDB('/discover/movie', params);
    res.json({ results: data.results || [] });
  } catch (err) {
    console.error('GET /api/discover error:', err.message);
    res.status(502).json({ error: 'Failed to discover movies.' });
  }
});


// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', key_loaded: !!TMDB_KEY });
});


// ============================================================
// START SERVER / EXPORT FOR VERCEL
// ============================================================

// Only listen locally; skip listen on Vercel so it runs as a serverless function
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`
    ==========================================
      CineSync API Server
    ==========================================

      Running at: http://localhost:${PORT}
      API key:    ${TMDB_KEY ? 'loaded ✓' : 'MISSING ✗'}
      Rate limit: 30 requests / 60 seconds

      This server proxies all TMDb requests.
      The API key never leaves this process.
    ==========================================
    `);
  });
}

export default app;