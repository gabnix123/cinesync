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
  if (!resp.ok) throw new Error(`TMDb API error: ${resp.status}`);
  return resp.json();
}

// ── Routes ──
app.get('/api/health', (req, res) => res.json({ status: 'ok', key_loaded: !!TMDB_KEY }));

app.get('/api/genres', async (req, res) => {
  try {
    const data = await fetchTMDB('/genre/movie/list', { language: 'en-US' });
    res.json({ genres: data.genres || [] });
  } catch (err) { res.status(502).json({ error: 'Failed to fetch genres.' }); }
});

app.get('/api/popular', async (req, res) => {
  try {
    const data = await fetchTMDB('/movie/popular', { language: 'en-US', page: '1' });
    res.json({ results: data.results || [] });
  } catch (err) { res.status(502).json({ error: 'Failed to fetch popular movies.' }); }
});

app.get('/api/movie/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid movie ID.' });
  try {
    const data = await fetchTMDB(`/movie/${id}`, { language: 'en-US' });
    res.json(data);
  } catch (err) { res.status(502).json({ error: 'Failed to fetch movie details.' }); }
});

app.get('/api/discover', async (req, res) => {
  const { genreId, maxRuntime } = req.query;
  if (genreId && (!/^\d+$/.test(genreId) || Number(genreId) <= 0)) return res.status(400).json({ error: 'Invalid genre ID.' });
  if (maxRuntime && (!/^\d+$/.test(maxRuntime) || Number(maxRuntime) < 10 || Number(maxRuntime) > 360))
    return res.status(400).json({ error: 'Runtime must be between 10 and 360.' });

  const params = { include_adult: 'false', include_video: 'false', language: 'en-US', page: '1', sort_by: 'popularity.desc' };
  if (genreId) params.with_genres = genreId;
  if (maxRuntime) params['with_runtime.lte'] = maxRuntime;

  try {
    const data = await fetchTMDB('/discover/movie', params);
    res.json({ results: data.results || [] });
  } catch (err) { res.status(502).json({ error: 'Failed to discover movies.' }); }
});

// ── Start ──
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n  CineSync API running at http://localhost:${PORT}\n  API key: ${TMDB_KEY ? 'loaded' : 'MISSING'}\n`);
  });
}

export default app;
