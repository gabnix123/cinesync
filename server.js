/**
 * CineSync Backend Server (local development)
 *
 * Express server that proxies TMDb API calls and handles user accounts.
 * The API key is read from .env (never exposed to the browser).
 *
 * Usage:
 *   npm run dev:server    → starts this server on port 3003
 *   npm run dev           → starts Vite frontend on port 5173
 *
 * The Vite dev server proxies /api/* to this Express server.
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import { config } from 'dotenv';
import { getUserByEmail, createUser, getUserById, updateUser } from './store.js';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { promises as fs } from 'fs';
import path from 'path';

config();

const app = express();
const PORT = process.env.PORT || 3003;
const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-in-production';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

if (!TMDB_KEY) {
  console.error('FATAL: TMDB_API_KEY is not set in .env');
  process.exit(1);
}

// ── Middleware ──
app.use(helmet());
// Enable trust proxy if behind a reverse proxy (Vercel, etc.)
app.set('trust proxy', 1);
// Session middleware
app.use(
  session({
    name: 'phoenix.sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS in production
      sameSite: 'lax', // adjust to strict if needed
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);
// CORS - allow frontend origin
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());
// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);
// Stricter limits on auth routes
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
});

// Helper: generate random token and hash it
async function generateToken() {
  const raw = crypto.randomBytes(32).toString('hex');
  const hashed = await bcrypt.hash(raw, 10);
  return { raw, hashed };
}
// Helper: verify token against stored hash
async function verifyToken(token, hashed) {
  if (!token || !hashed) return false;
  return await bcrypt.compare(token, hashed);
}

// Middleware: ensure user is authenticated
function ensureAuth(req, res, next) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// ── Routes ──
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ── Auth Routes ──
// Signup
app.post('/api/user/signup', authLimiter, async (req, res) => {
  try {
    const {
      email,
      password,
      confirmPassword,
      termsAccepted,
      termsVersion,
      marketingOptIn,
      ageConfirmed,
    } = req.body;
    // Basic validation
    if (!email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Email, password, and confirmation are required' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }
    if (!termsAccepted) {
      return res.status(400).json({ error: 'You must accept the Terms of Service' });
    }
    if (!ageConfirmed) {
      return res.status(400).json({ error: 'You must confirm you meet the age requirement' });
    }
    // Check if user already exists (generic error to avoid enumeration)
    const existing = await getUserByEmail(email);
    if (existing) {
      // Do not reveal that email exists
      return res.status(200).json({ message: 'If the email is not registered, you will receive a verification email.' });
    }
    // Create user
    const user = await createUser({
      email,
      password,
      termsAccepted,
      termsVersion,
      marketingOptIn,
      ageConfirmed,
    });
    // Generate email verification token
    const { raw: verifyTokenRaw, hashed: verifyTokenHashed } = await generateToken();
    // Update user with verification token and expiry (1 hour)
    const verifyExpires = new Date(Date.now() + 60 * 60 * 1000);
    await updateUser(user.id, {
      email_verification_token: verifyTokenHashed,
      email_verification_expires: verifyExpires,
    });
    // In a real app, send email with verification link
    // For now, we'll log the token (in dev only) or just note it
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] Verification token for ${email}: ${verifyTokenRaw}`);
    }
    // Respond with generic message
    res.status(201).json({ message: 'If the email is not registered, you will receive a verification email.' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
app.post('/api/user/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user = await getUserByEmail(email);
    if (!user) {
      // Do not reveal whether email exists
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    // Compare password
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    // Set session
    req.session.userId = user.id;
    // Optionally, mark email as verified if needed
    res.status(200).json({ id: user.id, email: user.email });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout
app.post('/api/user/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Failed to log out' });
    }
    res.clearCookie('phoenix.sid');
    res.status(200).json({ message: 'Logged out' });
  });
});

// Verify email
app.post('/api/user/verify-email', authLimiter, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });
    const user = await getUserById(req.session.userId);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (!user.email_verification_token) {
      return res.status(400).json({ error: 'No verification requested' });
    }
    const isValid = await verifyToken(token, user.email_verification_token);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    // Check expiry
    const expires = new Date(user.email_verification_expires || 0);
    if (expires < new Date()) {
      return res.status(400).json({ error: 'Verification token has expired' });
    }
    // Mark email as verified and clear token
    await updateUser(req.session.userId, {
      email_verified_at: new Date(),
      email_verification_token: null,
      email_verification_expires: null,
    });
    res.status(200).json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error('Email verification error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Password reset request
app.post('/api/user/password-reset-request', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const user = await getUserByEmail(email);
    // Always return same message to avoid user enumeration
    res.status(200).json({ message: 'If the email is registered, you will receive a password reset email.' });
    if (!user) return; // Do not proceed if user doesn't exist (but we already responded)
    // Generate reset token
    const { raw: resetTokenRaw, hashed: resetTokenHashed } = await generateToken();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await updateUser(user.id, {
      password_reset_token: resetTokenHashed,
      password_reset_expires: resetExpires,
    });
    // In dev, log token
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] Password reset token for ${email}: ${resetTokenRaw}`);
    }
    // In production, send email with reset link
  } catch (err) {
    console.error('Password reset request error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Password reset confirm
app.post('/api/user/password-reset', authLimiter, async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;
    if (!token || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Token, password, and confirmation are required' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }
    // Find user by token hash (we need to iterate; for simplicity, we'll fetch all users and compare)
    // Since we expect few users, we can do this.
    const usersData = await fs.readFile(USERS_FILE, 'utf8');
    const parsed = JSON.parse(usersData);
    let found = null;
    for (const u of parsed) {
      if (u.password_reset_token && await bcrypt.compare(token, u.password_reset_token)) {
        found = u;
        break;
      }
    }
    if (!found) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    const expires = new Date(found.password_reset_expires || 0);
    if (expires < new Date()) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }
    // Hash new password
    const newHash = await bcrypt.hash(password, 10);
    // Update user: set new password hash, clear reset token
    await updateUser(found.id, {
      password_hash: newHash,
      password_reset_token: null,
      password_reset_expires: null,
    });
    res.status(200).json({ message: 'Password has been reset' });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user (protected)
app.get('/api/user/me', ensureAuth, async (req, res) => {
  try {
    const user = await getUserById(req.session.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    // Return safe data
    const { password_hash, email_verification_token, email_verification_expires, password_reset_token, password_reset_expires, ...safeUser } = user;
    res.status(200).json(safeUser);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update consent / settings (example)
app.post('/api/user/settings', ensureAuth, async (req, res) => {
  try {
    const { marketingOptIn, termsAccepted, termsVersion } = req.body;
    const updates = {};
    if (marketingOptIn !== undefined) updates.marketing_opt_in = marketingOptIn;
    if (termsAccepted !== undefined) {
      updates.terms_accepted_at = new Date();
      if (termsVersion !== undefined) updates.terms_version = termsVersion;
    }
    await updateUser(req.session.userId, updates);
    res.status(200).json({ message: 'Settings updated' });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// NEW: Export user data
app.get('/api/user/export-data', ensureAuth, async (req, res) => {
  try {
    const user = await getUserById(req.session.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    // Return a safe copy of the user data (excluding sensitive fields)
    const { password_hash, email_verification_token, email_verification_expires, password_reset_token, password_reset_expires, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    console.error('Export data error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// NEW: Delete account
app.delete('/api/user/delete-account', ensureAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    // Read all users
    const usersData = await fs.readFile(USERS_FILE, 'utf8');
    let users = JSON.parse(usersData);
    // Remove the user with the matching id
    const initialLength = users.length;
    users = users.filter(u => u.id !== userId);
    if (users.length === initialLength) {
      // User not found (should not happen)
      return res.status(404).json({ error: 'User not found' });
    }
    // Write back the updated users array
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
    // Destroy session
    req.session.destroy(err => {
      if (err) {
        console.error('Session destroy error on account deletion:', err);
      }
      res.clearCookie('phoenix.sid');
      res.status(200).json({ message: 'Account deleted successfully' });
    });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── TMDb proxy helper (unchanged) ──
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

// ── Routes ── (TMDb proxy)
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
      res.status(500).json({ error: 'Service unavailable. Please try again later.' );
    } else if (err.status === 429) {
      res.status(429).json({ error: 'Too many requests. Please try again later.' );
    } else if (err.status >= 500) {
      res.status(502).json({ error: 'Service unavailable. Please try again later.' );
    } else {
      res.status(502).json({ error: 'Failed to fetch popular movies.' );
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
      res.status(404).json({ error: 'Movie not found.' );
    } else if (err.status === 401 || err.status === 403) {
      // API key issues
      res.status(500).json({ error: 'Service unavailable. Please try again later.' );
    } else if (err.status === 429) {
      // Rate limited by TMDb
      res.status(429).json({ error: 'Too many requests. Please try again later.' );
    } else if (err.status >= 500) {
      // TMDb server error
      res.status(502).json({ error: 'Service unavailable. Please try again later.' );
    } else {
      // Other errors
      res.status(502).json({ error: 'Failed to fetch movie details.' );
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
      res.status(500).json({ error: 'Service unavailable. Please try again later.' );
    } else if (err.status === 429) {
      res.status(429).json({ error: 'Too many requests. Please try again later.' );
    } else if (err.status >= 500) {
      res.status(502).json({ error: 'Service unavailable. Please try again later.' );
    } else {
      res.status(502).json({ error: 'Failed to discover movies.' );
    }
  }
});

// ── GET /api/movie/:id/trailer — fetches YouTube trailer key ──
app.get('/api/movie/:id/trailer', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid movie ID.' );
  try {
    const data = await fetchTMDB(`/movie/${id}/videos`, { language: 'en-US' });
    const trailers = (data.results || []).filter(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
    const video = trailers[0] || (data.results || []).find(v => v.site === 'YouTube');
    res.json({ key: video ? video.key : null });
  } catch (err) {
    // Handle different TMDb error codes
    if (err.status === 401 || err.status === 403) {
      res.status(500).json({ error: 'Service unavailable. Please try again later.' );
    } else if (err.status === 429) {
      res.status(429).json({ error: 'Too many requests. Please try again later.' );
    } else if (err.status >= 500) {
      res.status(502).json({ error: 'Service unavailable. Please try again later.' );
    } else {
      res.status(502).json({ error: 'Failed to fetch trailer.' );
    }
  }
});

// ── GET /api/movie/:id/similar — fetches similar movies ──
app.get('/api/movie/:id/similar', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid movie ID.' );
  try {
    const data = await fetchTMDB(`/movie/${id}/similar`, { language: 'en-US', page: '1' });
    const results = (data.results || []).slice(0, 6);
    res.json({ results });
  } catch (err) {
    // Handle different TMDb error codes
    if (err.status === 401 || err.status === 403) {
      res.status(500).json({ error: 'Service unavailable. Please try again later.' );
    } else if (err.status === 429) {
      res.status(429).json({ error: 'Too many requests. Please try again later.' );
    } else if (err.status >= 500) {
      res.status(502).json({ error: 'Service unavailable. Please try again later.' );
    } else {
      res.status(502).json({ error: 'Failed to fetch similar movies.' );
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