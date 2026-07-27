import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite configuration for CineSync.
 *
 * The proxy setting routes /api/* requests to the Express backend
 * running on port 3001. This means the frontend never needs to know
 * the TMDb API key — it just calls /api/popular, /api/discover, etc.
 * and the backend handles the real TMDb calls with the server-side key.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
