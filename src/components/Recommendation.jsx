import React from 'react';

/*
 * Recommendation.jsx — displays the recommended movie result.
 *
 * Props:
 *   data: object with:
 *     error:          string (if search failed, show this instead)
 *     title:          movie title
 *     year:           release year (YYYY)
 *     runtime:        formatted string like "1h 42m"
 *     runtimeMinutes: total minutes (used for display)
 *     finishTime:     computed end time string (HH:MM)
 *     poster:         URL to poster image (or null)
 *     overview:       plot synopsis
 *     rating:         TMDb vote average (0-10)
 *     genres:         array of genre name strings
 */

function Recommendation({ data }) {
  // If there's an error message, display it and stop
  if (data.error) {
    return (
      <div className="bg-[#121218] border border-[#222233] rounded-xl p-6 text-center fade-up">
        <p className="text-[#7a7a90] text-sm">{data.error}</p>
      </div>
    );
  }

  return (
    <div className="bg-[#121218] border border-[#222233] rounded-xl overflow-hidden fade-up">
      <div className="flex flex-col sm:flex-row">

        {/* ── Movie poster (left side) ── */}
        {data.poster && (
          <div className="sm:w-48 flex-shrink-0">
            <img
              src={data.poster}
              alt={data.title}
              className="w-full h-64 sm:h-full object-cover"
            />
          </div>
        )}

        {/* ── Movie details (right side) ── */}
        <div className="flex-1 p-6">

          {/* Title and year */}
          <h2 className="text-xl font-bold text-white mb-1">
            {data.title}
            <span className="text-[#7a7a90] font-normal text-base ml-2">
              ({data.year})
            </span>
          </h2>

          {/* Genre tags */}
          {data.genres && data.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {data.genres.map((g, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-0.5 bg-[#1a1a24] border border-[#222233] rounded-full text-[#7a7a90]"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* ── Key stats row ── */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {/* Rating */}
            <div className="bg-[#0a0a0f] rounded-lg p-3 text-center">
              <div className="text-xs text-[#7a7a90] uppercase tracking-wider mb-1">Rating</div>
              <div className="text-lg font-bold text-white">
                {data.rating ? data.rating.toFixed(1) : '--'}
                <span className="text-xs text-[#7a7a90] font-normal">/10</span>
              </div>
            </div>

            {/* Runtime */}
            <div className="bg-[#0a0a0f] rounded-lg p-3 text-center">
              <div className="text-xs text-[#7a7a90] uppercase tracking-wider mb-1">Runtime</div>
              <div className="text-lg font-bold text-white">{data.runtime}</div>
            </div>

            {/* Finish time */}
            <div className="bg-[#0a0a0f] rounded-lg p-3 text-center">
              <div className="text-xs text-[#7a7a90] uppercase tracking-wider mb-1">Finishes At</div>
              <div className="text-lg font-bold text-[#e63946]">{data.finishTime}</div>
            </div>
          </div>

          {/* Overview */}
          {data.overview && (
            <p className="text-sm text-[#7a7a90] leading-relaxed line-clamp-3">
              {data.overview}
            </p>
          )}

        </div>
      </div>
    </div>
  );
}

export default Recommendation;
