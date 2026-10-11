import React, { useState, useEffect } from 'react';

/*
 * Recommendation.jsx — displays the recommended movie with:
 *   1. Card flip animation on initial load
 *   2. Embedded YouTube trailer
 *   3. "If you liked this, try..." similar movies row
 */

function Recommendation({ data }) {
  const [flipped, setFlipped] = useState(false);
  const [trailerKey, setTrailerKey] = useState(null);
  const [similar, setSimilar] = useState([]);

  // ── Trigger the flip animation when new data arrives ──
  useEffect(() => {
    if (data && !data.error) {
      setFlipped(false);
      // Small delay so the card renders on the front, then flips to back
      const t = setTimeout(() => setFlipped(true), 100);
      return () => clearTimeout(t);
    }
  }, [data?.id]);

  // ── Fetch trailer and similar movies when a new movie is recommended ──
  useEffect(() => {
    if (!data || data.error || !data.id) return;

    // Fetch trailer
    fetch(`/api/movie/${data.id}/trailer`)
      .then(r => r.json())
      .then(d => setTrailerKey(d.key || null))
      .catch(() => setTrailerKey(null));

    // Fetch similar movies
    fetch(`/api/movie/${data.id}/similar`)
      .then(r => r.json())
      .then(d => setSimilar(d.results || []))
      .catch(() => setSimilar([]));
  }, [data?.id]);

  if (data.error) {
    return (
      <div className="bg-[#121218] border border-[#222233] rounded-xl p-6 text-center fade-up">
        <p className="text-[#7a7a90] text-sm">{data.error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* ── Main card with flip animation ── */}
      <div className="flip-card">
        <div className={`flip-card-inner ${flipped ? 'flipped' : ''}`}>
          {/* Front face: loading state */}
          <div className="flip-card-front bg-[#121218] border border-[#222233] rounded-xl p-6 min-h-[200px] flex items-center justify-center">
            <div className="spinner" style={{ width: 32, height: 32, border: '3px solid #222233', borderTopColor: '#e63946', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>

          {/* Back face: actual movie details */}
          <div className="flip-card-back bg-[#121218] border border-[#222233] rounded-xl overflow-hidden">
            <div className="flex flex-col sm:flex-row">
              {/* Poster */}
              {data.poster && (
                <div className="sm:w-48 flex-shrink-0">
                  <img src={data.poster} alt={data.title} className="w-full h-64 sm:h-full object-cover" />
                </div>
              )}

              {/* Details */}
              <div className="flex-1 p-6">
                <h2 className="text-xl font-bold text-white mb-1">
                  {data.title}
                  <span className="text-[#7a7a90] font-normal text-base ml-2">({data.year})</span>
                </h2>

                {data.genres && data.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {data.genres.map((g, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-[#1a1a24] border border-[#222233] rounded-full text-[#7a7a90]">{g}</span>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="bg-[#0a0a0f] rounded-lg p-3 text-center">
                    <div className="text-xs text-[#7a7a90] uppercase tracking-wider mb-1">Rating</div>
                    <div className="text-lg font-bold text-white">{data.rating ? data.rating.toFixed(1) : '--'}<span className="text-xs text-[#7a7a90] font-normal">/10</span></div>
                  </div>
                  <div className="bg-[#0a0a0f] rounded-lg p-3 text-center">
                    <div className="text-xs text-[#7a7a90] uppercase tracking-wider mb-1">Runtime</div>
                    <div className="text-lg font-bold text-white">{data.runtime}</div>
                  </div>
                  <div className="bg-[#0a0a0f] rounded-lg p-3 text-center">
                    <div className="text-xs text-[#7a7a90] uppercase tracking-wider mb-1">Finishes At</div>
                    <div className="text-lg font-bold text-[#e63946]">{data.finishTime}</div>
                  </div>
                </div>

                {data.overview && (
                  <p className="text-sm text-[#7a7a90] leading-relaxed line-clamp-3">{data.overview}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Trailer ── */}
      {trailerKey && (
        <div className="mt-6 bg-[#121218] border border-[#222233] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-[#7a7a90] uppercase tracking-wider mb-3">Trailer</h3>
          <div className="trailer-wrap">
            <iframe
              src={`https://www.youtube.com/embed/${trailerKey}`}
              title={`${data.title} trailer`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* ── Similar movies ── */}
      {similar.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-[#7a7a90] uppercase tracking-wider mb-3">If you liked this, try...</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {similar.map(m => (
              <div key={m.id} className="similar-card bg-[#121218] border border-[#222233] rounded-lg overflow-hidden cursor-pointer">
                {m.poster_path ? (
                  <img src={`https://image.tmdb.org/t/p/w200${m.poster_path}`} alt={m.title} className="w-full h-36 object-cover" />
                ) : (
                  <div className="w-full h-36 bg-[#0a0a0f] flex items-center justify-center text-[#444] text-xs">No poster</div>
                )}
                <div className="p-2">
                  <div className="text-xs font-medium text-white truncate">{m.title}</div>
                  <div className="text-[10px] text-[#7a7a90]">{m.release_date?.substring(0, 4) || '—'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Recommendation;
