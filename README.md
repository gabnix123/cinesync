# CineSync — Secure Movie Recommendation Engine

A React + Vite web app that recommends movies from TMDb based on your preferences.
All TMDb API calls go through a secure backend proxy — the API key is never exposed to the browser.

## Architecture

```
Browser (React)  ──HTTP──▶  Express Backend  ──HTTPS──▶  TMDb API
                              │
                         .env (API key)
                         rate limiting
                         input validation
```

The browser only talks to `/api/*` routes on the Express server. The server holds the TMDb API key in an environment variable and forwards validated requests to TMDb. The key never appears in any client-side code, network response, or browser dev tools.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the backend server (port 3001)
npm run dev:server

# 3. In a second terminal, start the frontend (port 5173)
npm run dev
```

Open `http://localhost:5173` — the frontend proxies `/api/*` to the backend automatically.

## Available Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev:server` | Starts the Express backend on :3001 |
| `npm run dev` | Starts the Vite dev server on :5173 |
| `npm run build` | Builds the frontend for production |
| `npm start` | Runs the backend in production mode |

## Environment Variables

All variables live in `.env` at the project root. They are **server-side only** — never imported by frontend code.

| Variable | Required | Purpose |
|----------|----------|---------|
| `TMDB_API_KEY` | Yes | TMDb v3 API key for movie data |
| `PORT` | No | Backend port (default: 3001) |

**Security note:** Vite only exposes variables prefixed with `VITE_` to the browser. Our `.env` does NOT use this prefix, so the API key stays on the server.

## Security Features

### 1. Backend API Proxy
All TMDb calls are routed through Express. The browser never sees the API key.

### 2. Input Validation
Every endpoint validates and sanitizes user input:
- `genreId` — must be a positive integer or empty
- `maxRuntime` — must be an integer between 10 and 360
- `movie/:id` — must be a positive integer
- All string inputs are stripped of `<>"';\` characters

### 3. Rate Limiting
Express middleware limits each IP to 30 requests per 60 seconds on all `/api` routes.

### 4. Security Headers
Helmet sets HTTP security headers (X-Content-Type-Options, X-Frame-Options, etc.).

### 5. CORS Restriction
The backend only accepts requests from localhost origins during development.

## Project Structure

```
cinesync/
├── server.js              # Express backend (proxy, validation, rate limiting)
├── .env                   # API key — SERVER-SIDE ONLY
├── package.json
├── vite.config.js         # Frontend config + /api proxy
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── README.md
└── src/
    ├── main.jsx           # React entry point
    ├── index.css          # Tailwind + animations
    ├── App.jsx            # Root component (talks to /api/* only)
    └── components/
        ├── Hero.jsx       # Scrolling poster marquee + clock
        ├── SearchForm.jsx # Genre, runtime, time inputs
        └── Recommendation.jsx  # Movie result card
```

## Production Deployment

For deployment, you need to:
1. Build the frontend: `npm run build`
2. Serve `dist/` as static files (Nginx, Vercel, Netlify)
3. Run `node server.js` as your API server
4. Point your static host to proxy `/api/*` to your server

On Vercel/Netlify, you can deploy the Express backend as a serverless function or use their own serverless proxies.
