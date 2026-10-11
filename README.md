# CineSync

A privacy-first, server-side TMDB API proxy for movie apps—designed to keep your API key secure and prevent client-side exposure.

## 🔒 Core Principles
- **API key never touches the client** (loaded server-side only)
- **Strict rate limiting** (30 req/min/IP in dev, 60/min/IP on Vercel)
- **Locked-down CORS** (only trusted dev origins allowed)
- **Security headers** (CSP, X-Frame-Options, etc. via Vercel)
- **No user data stored** (pure proxy; zero logs/storage of requests/responses)
- **Minimal dependencies** (Express + Vercel only)

## 🎬 Features
- Proxy for TMDB endpoints: `/genres`, `/popular`, `/discover`, `/movie/:id`, `/movie/:id/trailer`, `/movie/:id/similar`
- Proper HTTP status codes (e.g., `404` for missing movies, not `200` + error body)
- Development server (`npm run dev:server`) + Vercel serverless deployment
- Security-first by design: API key redacted from logs, errors genericized

## 🛠️ Tech Stack
- Node.js / Express
- Vercel (serverless deployment)
- TMDB API
- `express-rate-limit`, `cors`, `helmet`, `dotenv`

## ▶️ Getting Started
### Prerequisites
- Node.js 16+
- Git
- TMDB API key (get from [themoviedb.org](https://www.themoviedb.org/))

### Installation
```bash
git clone <your-cinesync-repo-url>
cd cineSync
npm install
