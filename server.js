/**
 * CineSync Backend Server (local development)
 *
 * Express server that proxies TMDb API calls.
 * The API key is read from .env (never exposed to the browser).
 *
 * Usage:
 *   npm run dev:server    → starts this server on port 3001
 *   npm run dev           → starts Vite frontend on port 5173
 *
 * The Vite dev server proxies /api/* to this Express server.
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';

config();

const app = express();
const PORT = process.env.PORT || 3003;
const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';

if (!TMDB_KEY) {
  console.error('FATAL: TMDB_API_KEY is not set in .env');
  process.exit(1);
}

// ── Middleware ──
app.use(helmet());
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'], methods: ['GET'] }));
app.use(express.json());
app.use('/api', rateLimit({ windowMs: 60000, max: 30, standardHeaders: true, legacyHeaders: false }));

// ── TMDb proxy helper ──
async function fetchTMDB(endpoint, params = {}) {
  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.searchParams.set('api_key', TMDB_KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
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

// ── Routes ──
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/genres', async (req, res) => {
  try {
    const data = await fetchTMDB('/genre/movie/list', { language: 'en-US' });
    res.json({ genres: data.genres || [] });
  } catch (err) {
    // Handle different TMDb error codes
    if (err.status === 401 || err.status === 403) {
      res.status(500).json({ error: 'Service unavailable. Please try again later.' });
    } else if (err.status === 429) {
      res.status(429).json({ error: 'Too many requests. Please try again later.' });
    } else if (err.status >= 500) {
      res.status(502).json({ error: 'Service unavailable. Please try again later.' });
    } else {
      res.status(502).json({ error: 'Failed to fetch genres.' });
    }
  }
});

app.get('/api/popular', async (req, res) => {
  try {
    const data = await fetchTMDB('/movie/popular', { language: 'en-US', page: '1' });
    res.json({ results: data.results || [] });
  } catch (err) {
    // Handle different TMDb error codes
    if (err.status === 401 || err.status === 403) {
      res.status(500).json({ error: 'Service unavailable. Please try again later.' });
    } else if (err.status === 429) {
      res.status(429).json({ error: 'Too many requests. Please try again later.' });
    } else if (err.status >= 500) {
      res.status(502).json({ error: 'Service unavailable. Please try again later.' });
    } else {
      res.status(502).json({ error: 'Failed to fetch popular movies.' });
    }
  }
});

app.get('/api/movie/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid movie ID.' });
  try {
    const data = await fetchTMDB(`/movie/${id}`, { language: 'en-US' });
    res.json(data);
  } catch (err) {
    // Handle different TMDb error codes appropriately
    if (err.status === 404) {
      // Movie not found
      res.status(404).json({ error: 'Movie not found.' });
    } else if (err.status === 401 || err.status === 403) {
      // API key issues
      res.status(500).json({ error: 'Service unavailable. Please try again later.' });
    } else if (err.status === 429) {
      // Rate limited by TMDb
      res.status(429).json({ error: 'Too many requests. Please try again later.' });
    } else if (err.status >= 500) {
      // TMDb server error
      res.status(502).json({ error: 'Service unavailable. Please try again later.' });
    } else {
      // Other errors
      res.status(502).json({ error: 'Failed to fetch movie details.' });
    }
  }
});

app.get('/api/discover', async (req, res) => {
  const { genreId, maxRuntime, yearFrom, yearTo } = req.query;
  if (genreId && !/^\d+(,\d+)*$/.test(genreId)) return res.status(400).json({ error: 'Invalid genre ID.' });
  if (maxRuntime && (!/^\d+$/.test(maxRuntime) || Number(maxRuntime) < 10 || Number(maxRuntime) > 360))
    return res.status(400).json({ error: 'Runtime must be between 10 and 360.' });

  const params = { include_adult: 'false', include_video: 'false', language: 'en-US', page: '1', sort_by: 'popularity.desc' };
  if (genreId) params.with_genres = genreId;
  if (maxRuntime) params['with_runtime.lte'] = maxRuntime;
  if (yearFrom) params['primary_release_date.gte'] = `${yearFrom}-01-01`;
  if (yearTo) params['primary_release_date.lte'] = `${yearTo}-12-31`;

  try {
    const data = await fetchTMDB('/discover/movie', params);
    res.json({ results: data.results || [] });
  } catch (err) {
    // Handle different TMDb error codes
    if (err.status === 401 || err.status === 403) {
      res.status(500).json({ error: 'Service unavailable. Please try again later.' });
    } else if (err.status === 429) {
      res.status(429).json({ error: 'Too many requests. Please try again later.' });
    } else if (err.status >= 500) {
      res.status(502).json({ error: 'Service unavailable. Please try again later.' });
    } else {
      res.status(502).json({ error: 'Failed to discover movies.' });
    }
  }
});

// ── GET /api/movie/:id/trailer — fetches YouTube trailer key ──
app.get('/api/movie/:id/trailer', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid movie ID.' });
  try {
    const data = await fetchTMDB(`/movie/${id}/videos`, { language: 'en-US' });
    const trailers = (data.results || []).filter(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
    const video = trailers[0] || (data.results || []).find(v => v.site === 'YouTube');
    res.json({ key: video ? video.key : null });
  } catch (err) {
    // Handle different TMDb error codes
    if (err.status === 401 || err.status === 403) {
      res.status(500).json({ error: 'Service unavailable. Please try again later.' });
    } else if (err.status === 429) {
      res.status(429).json({ error: 'Too many requests. Please try again later.' });
    } else if (err.status >= 500) {
      res.status(502).json({ error: 'Service unavailable. Please try again later.' });
    } else {
      res.status(502).json({ error: 'Failed to fetch trailer.' });
    }
  }
});

// ── GET /api/movie/:id/similar — fetches similar movies ──
app.get('/api/movie/:id/similar', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid movie ID.' });
  try {
    const data = await fetchTMDB(`/movie/${id}/similar`, { language: 'en-US', page: '1' });
    const results = (data.results || []).slice(0, 6);
    res.json({ results });
  } catch (err) {
    // Handle different TMDb error codes
    if (err.status === 401 || err.status === 403) {
      res.status(500).json({ error: 'Service unavailable. Please try again later.' });
    } else if (err.status === 429) {
      res.status(429).json({ error: 'Too many requests. Please try again later.' });
    } else if (err.status >= 500) {
      res.status(502).json({ error: 'Service unavailable. Please try again later.' });
    } else {
      res.status(502).json({ error: 'Failed to fetch similar movies.' });
    }
  }
});

// ── Start ──
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n  CineSync API running at http://localhost:${PORT}\n  API key: ${TMDB_KEY ? 'loaded' : 'MISSING'}\n`);
  });
}

export default app;