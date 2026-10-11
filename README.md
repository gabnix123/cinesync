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

Configuration

1. Create .env in root:
env
TMDB_API_KEY=your_tmdb_api_key_here
PORT=3003  # optional; defaults to 3003
2. Never commit .env—it’s ignored by .gitignore.

▶️ Development

# Start local Express server (for full API testing)
npm run dev:server

# Start Vercel dev server (for serverless function testing)
vercel dev

☁️ Deployment

1. Push to GitHub → Vercel auto-deploys (if connected via Vercel GUI)
2. Or deploy manually: vercel --prod

📜 License

MIT License — see LICENSE for details.

🛡️ Security

- API key only loaded from server-side environment variables (never bundled in client)
- All TMDb errors mapped to generic client-safe messages (e.g., "Service unavailable")
- Rate blocking returns 429 with Retry-After header
- CSP restricts resources to self + TMDB image domain
- No tracking, no telemetry, no ads

🤝 Contributing

See CONTRIBUTING.md for guidelines.

🔐 Reporting Security Issues

Please see SECURITY.md for details.

#### 📝 **CONTRIBUTING.md** (new file)
```markdown
# Contributing to CineSync

Thank you for helping improve CineSync! We follow a lightweight, security-first process.

## 🐞 Reporting Issues
- Use the [GitHub Issues](https://github.com/your-username/cineSync/issues) tab
- Include:
  - Steps to reproduce
  - Expected vs. actual behavior
  - Logs/screenshots (if safe to share)
  - Environment (local/dev/Vercel)

## 💡 Suggesting Features
- Open an issue labeled `enhancement`
- Describe:
  - The use case
  - Why it aligns with CineSync’s privacy-first goals
  - Any potential security trade-offs (we’ll evaluate together)

## ✨ Pull Request Workflow
1. Fork the repo
2. Create a branch: `git checkout -b feature/your-idea`
3. Make changes (follow [coding standards](#-coding-standards))
4. Test locally: `npm run dev:server` + `vercel dev`
5. Commit: `git commit -m "feat: your concise description"`
6. Push: `git push origin feature/your-idea`
7. Open a PR against `main`

### 📏 Coding Standards
- **JavaScript**: StandardJS (no semicolons, 2-space indent)
- **Strings**: Single quotes (`'`) unless interpolation needed
- **Error handling**:
  - Never expose raw TMDb errors to client
  - Server errors → `500` + generic message
  - Client errors → `4xx` + helpful message
- **Security**:
  - API key **must** stay in `process.env` (never hardcoded/logged)
  - Rate limits **must** remain per-IP
  - CORS **must** stay origin-restricted
- **Docs**:
  - Update README if changing features/usage
  - Add JSDoc for new helpers
  - Keep comments minimal but precise

### 🧪 Testing
- Manual testing is sufficient for this small proxy
- Verify:
  - Local server logs **never** show API key status
  - `/api/movie/999999` returns `404` (not `200`)
  - Rate limiting triggers after threshold
  - CORS blocks unauthorized origins

### 📦 Dependencies
- Prefer `npm ci` for clean installs
- Audit with `npm audit` before adding new deps
- Never add deps that expose API key to build/client

## 📜 License
By contributing, you agree your work is licensed under MIT. See [LICENSE](LICENSE).

## 🔐 Security Note
If you find a security issue, **do not** open a public issue.
See [SECURITY.md](SECURITY.md) for private reporting.

📝 SECURITY.md (new file)

# Security Policy

## 🔒 Supported Versions
We provide security updates for:
| Version | Supported |
|---------|-----------|
| 1.0.x   | ✅        |
| < 1.0   | ❌        |

## 🚨 Reporting a Vulnerability
**Do not** use public issues for security reports.
Instead:
1. Email security@cinesync.example (placeholder—use your project’s contact)
2. **OR** use GitHub’s private vulnerability reporting:
   - Go to `https://github.com/your-username/cineSync/security/advisories`
   - Click "Report a vulnerability"
3. Include:
   - How to reproduce (with minimal payload)
   - Affected components/versions
   - Potential impact
   - Any mitigations you’ve tried

We aim to:
- Acknowledge within 24 hours
- Provide preliminary assessment within 72 hours
- Coordinate fixes via private fork before public disclosure

## 🛡️ CineSync-Specific Security Practices
### API Key Protection
- **Never** in client-side code, bundles, or logs
- Loaded **only** from server-side environment variables (`process.env.TMDB_API_KEY`)
- Rotate immediately if accidentally exposed

### Data Handling
- **Zero storage** of requests/responses, user data, or TMDB responses
- Pure proxy: bytes in = bytes out (with status/error mapping)
- No databases, caches, or logs beyond stdout/stderr (dev only)

### Network Security
- Rate limiting: **per-IP**, not global (prevents one user from blocking others)
- CORS: **Strict origin whitelist** (no wildcards)
- Security headers: CSP, X-Frame-Options, etc. enforced via Vercel
- Errors: **Genericized** (e.g., "Service unavailable" instead of "Invalid API key")

### Dependency Safety
- `npm audit` run before all deploys
- No deps with known high-severity vulns in `package.json`
- Lockfile (`package-lock.json`) committed for reproducibility

## 🙏 Acknowledgments
Thanks to the open-source community for building TMDB API and security tools that make projects like CineSync possible.