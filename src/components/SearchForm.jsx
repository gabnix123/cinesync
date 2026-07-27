import React, { useState } from 'react';

/*
 * SearchForm.jsx — user input form with multi-genre, year range, and runtime.
 *
 * Props:
 *   genres:    array of { id, name } from TMDb
 *   onSearch:  callback fired on submit — receives (genreIds, maxRuntime, currentTime, yearFrom, yearTo)
 *   loading:   boolean that disables the button while searching
 */

function SearchForm({ genres, onSearch, loading }) {
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [maxRuntime, setMaxRuntime] = useState('180');
  const [yearFrom, setYearFrom] = useState('2000');
  const [yearTo, setYearTo] = useState('2025');
  const [currentTime, setCurrentTime] = useState(() => {
    return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  });

  function toggleGenre(id) {
    setSelectedGenres(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  }

  function handleSubmit(e) {
    e.preventDefault();
    const time = currentTime || new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const genreStr = selectedGenres.join(',');
    onSearch(genreStr, maxRuntime, time, yearFrom, yearTo);
  }

  return (
    <form onSubmit={handleSubmit} className="fade-up bg-[#121218] border border-[#222233] rounded-xl px-6 pt-6 pb-4">

      {/* ── Genre pills ── */}
      <div className="mb-5">
        <label className="block text-xs text-[#7a7a90] font-medium mb-2 tracking-wide uppercase">
          Genre {selectedGenres.length > 0 && <span className="text-[#e63946]">({selectedGenres.length} selected)</span>}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {genres.map(g => (
            <button
              key={g.id}
              type="button"
              onClick={() => toggleGenre(g.id)}
              className={`genre-pill text-xs px-3 py-1.5 rounded-full border ${
                selectedGenres.includes(g.id)
                  ? 'border-[#e63946] bg-[rgba(230,57,70,0.15)] text-[#e63946]'
                  : 'border-[#222233] bg-[#0a0a0f] text-[#7a7a90]'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Filters row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {/* Max runtime */}
        <div>
          <label className="block text-xs text-[#7a7a90] font-medium mb-1 tracking-wide uppercase">Max Runtime</label>
          <input
            type="number" min="10" max="360" value={maxRuntime}
            onChange={e => setMaxRuntime(e.target.value)}
            className="w-full bg-[#0a0a0f] border border-[#222233] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-[#e63946] transition-colors"
          />
        </div>
        {/* Year from */}
        <div>
          <label className="block text-xs text-[#7a7a90] font-medium mb-1 tracking-wide uppercase">Year From</label>
          <input
            type="number" min="1900" max="2030" value={yearFrom}
            onChange={e => setYearFrom(e.target.value)}
            className="w-full bg-[#0a0a0f] border border-[#222233] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-[#e63946] transition-colors"
          />
        </div>
        {/* Year to */}
        <div>
          <label className="block text-xs text-[#7a7a90] font-medium mb-1 tracking-wide uppercase">Year To</label>
          <input
            type="number" min="1900" max="2030" value={yearTo}
            onChange={e => setYearTo(e.target.value)}
            className="w-full bg-[#0a0a0f] border border-[#222233] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-[#e63946] transition-colors"
          />
        </div>
        {/* Current time */}
        <div>
          <label className="block text-xs text-[#7a7a90] font-medium mb-1 tracking-wide uppercase">Current Time</label>
          <input
            type="time" value={currentTime}
            onChange={e => setCurrentTime(e.target.value)}
            className="w-full bg-[#0a0a0f] border border-[#222233] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-[#e63946] transition-colors"
          />
        </div>
      </div>

      {/* ── Submit ── */}
      <button type="submit" disabled={loading}
        className="w-full bg-[#e63946] hover:bg-[#ff4a57] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors text-sm tracking-wide">
        {loading ? 'Finding your movie...' : 'Find a Movie'}
      </button>
    </form>
  );
}

export default SearchForm;
