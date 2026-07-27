import React, { useState, useEffect } from 'react';
import Hero from './components/Hero';
import SearchForm from './components/SearchForm';
import Recommendation from './components/Recommendation';

/**
 * App.jsx — root component for CineSync.
 *
 * SECURITY: This file contains ZERO references to the TMDb API key.
 * All TMDb communication goes through our Express backend server at /api/*.
 * The backend proxies requests to TMDb using the server-side-only key.
 *
 * State:
 *   genres:         genre list from /api/genres (for the dropdown)
 *   recommendation: the movie result object (or null)
 *   loading:        true while a search is in progress
 *   heroMovies:     popular movies for the scrolling poster marquee
 */

// API base URL:
//   - Empty string on localhost (Vite proxy handles it in dev)
//   - Full Vercel URL everywhere else (deployed site + APK)
const API = (window.location.hostname === 'localhost' && window.location.port === '5173')
  ? ''
  : 'https://cinesync-git-main-gnix.vercel.app';

function App() {
  const [genres, setGenres] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [heroMovies, setHeroMovies] = useState([]);
  const [apiError, setApiError] = useState('');

  // ── Fetch genres + popular movies on mount (via backend proxy) ──
  useEffect(() => {
    // Fetch genres from our backend
    fetch(`${API}/api/genres`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setGenres(data.genres || []);
      })
      .catch(err => {
        console.error('Failed to load genres:', err);
        setApiError('Could not connect to the API server. Is the backend running?');
      });

    // Fetch popular movies from our backend
    fetch(`${API}/api/popular`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setHeroMovies(data.results || []);
      })
      .catch(err => console.error('Failed to load hero movies:', err));
  }, []);

  // ── Search handler — queries our backend, not TMDb directly ──
  async function handleSearch(genreIds, maxRuntime, currentTime, yearFrom, yearTo) {
    setLoading(true);
    setRecommendation(null);
    setApiError('');

    try {
      // Build query params for our backend
      const params = new URLSearchParams();
      if (genreIds) params.set('genreId', genreIds);
      if (maxRuntime) params.set('maxRuntime', maxRuntime);
      if (yearFrom) params.set('yearFrom', yearFrom);
      if (yearTo) params.set('yearTo', yearTo);

      // Fetch matching movies from our backend
      const resp = await fetch(`${API}/api/discover?${params}`);
      const data = await resp.json();

      if (data.error) throw new Error(data.error);

      const results = data.results || [];

      if (results.length === 0) {
        setRecommendation({ error: 'No movies found matching your criteria.' });
        setLoading(false);
        return;
      }

      // Pick a random movie from the top 10 results
      const pick = results[Math.floor(Math.random() * Math.min(results.length, 10))];

      // Fetch full details from our backend (to get the runtime)
      const detailResp = await fetch(`${API}/api/movie/${pick.id}`);
      const detail = await detailResp.json();

      if (detail.error) throw new Error(detail.error);

      // Calculate finish time by adding runtime to the user's current time
      const runtime = detail.runtime || 120;
      const [hours, minutes] = currentTime.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + runtime;
      const endH = Math.floor(endMinutes / 60) % 24;
      const endM = endMinutes % 60;
      const finishTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

      // Convert runtime to hours and minutes string
      const runtimeH = Math.floor(runtime / 60);
      const runtimeM = runtime % 60;
      const runtimeStr = runtimeH > 0
        ? `${runtimeH}h ${runtimeM}m`
        : `${runtimeM}m`;

      setRecommendation({
        id: detail.id,
        title: detail.title,
        year: detail.release_date ? detail.release_date.substring(0, 4) : 'Unknown',
        runtime: runtimeStr,
        runtimeMinutes: runtime,
        finishTime,
        poster: detail.poster_path ? `https://image.tmdb.org/t/p/w500${detail.poster_path}` : null,
        backdrop: detail.backdrop_path ? `https://image.tmdb.org/t/p/w1280${detail.backdrop_path}` : null,
        overview: detail.overview || '',
        rating: detail.vote_average,
        genres: (detail.genres || []).map(g => g.name),
      });
    } catch (err) {
      console.error('Search failed:', err);
      setRecommendation({ error: err.message || 'Something went wrong. Please try again.' });
    }

    setLoading(false);
  }

  return (
    <div className="flex flex-col items-center">
      {/* Hero section with scrolling poster marquee */}
      <Hero movies={heroMovies} recommendation={recommendation} />

      {/* Main content: search form + result */}
      <div className="max-w-3xl mx-auto px-4 pt-4 pb-10">
        {/* Show API connection error if backend is down */}
        {apiError && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6 text-red-400 text-sm">
            {apiError}
          </div>
        )}

        <SearchForm
          genres={genres}
          onSearch={handleSearch}
          loading={loading}
        />

        {recommendation && (
          <Recommendation data={recommendation} />
        )}
      </div>
    </div>
  );
}

export default App;