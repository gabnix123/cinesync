import React, { useState, useEffect } from 'react';
import Hero from './components/Hero';
import SearchForm from './components/SearchForm';
import Recommendation from './components/Recommendation';
import AuthForm from './components/AuthForm';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Account from './pages/Account';

/**
 * App.jsx — root component for CineSync.
 *
 * SECURITY: This file contains ZERO references to the TMDB API key.
 * All TMDb communication goes through our Express backend server at /api/*.
 * The backend proxies requests to TMDb using the server-side-only key.
 *
 * State:
 *   genres:         genre list from /api/genres (for the dropdown)
 *   recommendation: the movie result object (or null)
 *   loading:        true while a search is in progress
 *   heroMovies:     popular movies for the scrolling poster marquee
 *   user:           logged-in user object (or null)
 *   authLoading:    true while checking authentication status
 *   apiError:       error message from API calls
 *   showTerms:      whether to show the Terms page
 *   showPrivacy:    whether to show the Privacy page
 *   showAccount:    whether to show the Account page
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
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showAccount, setShowAccount] = useState(false);

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

  // ── Check authentication status on mount ──
  useEffect(() => {
    fetch(`${API}/api/user/me`, {
      credentials: 'include',
    })
      .then(res => {
        if (res.ok) {
          return res.json();
        }
        // If not ok (401 or other), treat as not authenticated
        return null;
      })
      .then(data => {
        setUser(data);
        setAuthLoading(false);
      })
      .catch(err => {
        console.error('Auth check failed:', err);
        setAuthLoading(false);
        setUser(null);
      });
  }, []);

  // ── Logout handler ──
  const handleLogout = async () => {
    try {
      await fetch('/api/user/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

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

  // If auth status is still loading, show a loading spinner
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // If not authenticated, show the auth form
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-indigo-100">
        <div className="max-w-md mx-auto mt-20">
          <AuthForm onAuthSuccess={() => {
            // Refetch user state after successful auth
            fetch(`${API}/api/user/me`, { credentials: 'include' })
              .then(res => res.json())
              .then(data => setUser(data))
              .catch(err => {
                console.error('Auth refresh failed:', err);
                setUser(null);
              });
          }} />
        </div>
      </div>
    );
  }

  // If showing Terms, Privacy, or Account page, show that page with a back button
  if (showTerms || showPrivacy || showAccount) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-indigo-100">
        <header className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm rounded-b-lg shadow">
          <button
            onClick={() => {
              setShowTerms(false);
              setShowPrivacy(false);
              setShowAccount(false);
            }}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            ← Back
          </button>
          <h1 className="text-xl font-semibold text-center flex-1">
            {showTerms ? 'Terms of Service' : showPrivacy ? 'Privacy Policy' : 'Account Settings'}
          </h1>
          <div className="hidden"></div> {/* spacer to keep button left-aligned */}
        </header>
        <main className="max-w-md mx-auto mt-6">
          {showTerms && <Terms />}
          {showPrivacy && <Privacy />}
          {showAccount && <Account onBack={() => setShowAccount(false)} />}
        </main>
      </div>
    );
  }

  // If authenticated, show the main app
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-indigo-100">
      {/* Header with user info and logout */}
      <header className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm rounded-b-lg shadow">
        <div className="flex items-center space-x-3">
          <span className="font-semibold text-indigo-800">Hello, {user.email?.split('@')[0] || 'User'}!</span>
          <button
            onClick={handleLogout}
            className="text-sm text-indigo-600 hover:text-indigo-800 underline"
          >
            Sign out
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowTerms(true)}
            className="text-sm text-indigo-600 hover:text-indigo-800 underline"
          >
            Terms
          </button>
          <button
            onClick={() => setShowPrivacy(true)}
            className="text-sm text-indigo-600 hover:text-indigo-800 underline"
          >
            Privacy
          </button>
          <button
            onClick={() => setShowAccount(true)}
            className="text-sm text-indigo-600 hover:text-indigo-800 underline"
          >
            Account
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* API error */}
        {apiError && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-400 text-sm mb-6">
            {apiError}
          </div>
        )}

        {/* Hero section */}
        <Hero movies={heroMovies} recommendation={recommendation} />

        {/* Search form */}
        <SearchForm
          genres={genres}
          onSearch={handleSearch}
          loading={loading}
        />

        {/* Recommendation card — flush against form above */}
        {recommendation && (
          <Recommendation data={recommendation} />
        )}
      </main>
    </div>
  );
}

export default App;