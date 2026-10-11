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