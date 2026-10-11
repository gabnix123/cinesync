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