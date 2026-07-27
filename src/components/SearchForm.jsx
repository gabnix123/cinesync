import React, { useState } from 'react';

/*
 * SearchForm.jsx — user input form for movie recommendations.
 *
 * Props:
 *   genres:    array of { id, name } from TMDb — used to populate the dropdown
 *   onSearch:  callback fired on submit — receives (genreId, maxRuntime, currentTime)
 *   loading:   boolean that disables the button while searching
 *
 * The form has three inputs:
 *   1. Genre: a dropdown select populated from TMDb
 *   2. Max Runtime: a number input (minutes)
 *   3. Current Time: a time input (HH:MM)
 *   4. Submit button
 */

function SearchForm({ genres, onSearch, loading }) {
  const [genreId, setGenreId] = useState('');
  const [maxRuntime, setMaxRuntime] = useState('180');
  const [currentTime, setCurrentTime] = useState(() => {
    return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  });

  function handleSubmit(e) {
    e.preventDefault();
    // Use the current time as default if the user left it blank
    const time = currentTime || new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    onSearch(genreId, maxRuntime, time);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="fade-up bg-[#121218] border border-[#222233] rounded-xl p-6 mb-8"
    >
      {/* ── Form row: three inputs side by side ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">

        {/* ── Genre dropdown ── */}
        <div>
          <label className="block text-xs text-[#7a7a90] font-medium mb-1.5 tracking-wide uppercase">
            Genre
          </label>
          <select
            value={genreId}
            onChange={e => setGenreId(e.target.value)}
            className="w-full bg-[#0a0a0f] border border-[#222233] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-[#e63946] transition-colors cursor-pointer appearance-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%237a7a90'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
            }}
          >
            <option value="">All Genres</option>
            {genres.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        {/* ── Max runtime ── */}
        <div>
          <label className="block text-xs text-[#7a7a90] font-medium mb-1.5 tracking-wide uppercase">
            Max Runtime (min)
          </label>
          <input
            type="number"
            min="10"
            max="360"
            value={maxRuntime}
            onChange={e => setMaxRuntime(e.target.value)}
            placeholder="e.g. 180"
            className="w-full bg-[#0a0a0f] border border-[#222233] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-[#e63946] transition-colors"
          />
        </div>

        {/* ── Current time ── */}
        <div>
          <label className="block text-xs text-[#7a7a90] font-medium mb-1.5 tracking-wide uppercase">
            Current Time
          </label>
          <input
            type="time"
            value={currentTime}
            onChange={e => setCurrentTime(e.target.value)}
            className="w-full bg-[#0a0a0f] border border-[#222233] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-[#e63946] transition-colors"
          />
        </div>

      </div>

      {/* ── Submit button ── */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#e63946] hover:bg-[#ff4a57] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors text-sm tracking-wide"
      >
        {loading ? 'Finding your movie...' : 'Find a Movie'}
      </button>

    </form>
  );
}

export default SearchForm;
