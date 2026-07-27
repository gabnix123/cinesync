import React from 'react';

/*
 * Hero.jsx — the top section of CineSync.
 *
 * This component renders:
 *   1. A continuous horizontal scrolling row of movie poster thumbnails
 *      (the "marquee"). Two copies of the array are placed side by side
 *      so the animation loops seamlessly.
 *   2. A dark gradient overlay so text on top is readable.
 *   3. The "CineSync" title and a brief tagline overlaid on top.
 *   4. If a movie has been recommended, its backdrop shows as the hero image.
 */

function Hero({ movies, recommendation }) {
  const [clock, setClock] = React.useState('');

  // Live clock updated every second
  React.useEffect(() => {
    function tick() {
      const now = new Date();
      setClock(
        now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Build an array of poster URLs from the movie data
  // We use w200 thumbnails for the marquee (small = fast loading)
  const posters = movies
    .filter(m => m.poster_path)
    .map(m => `https://image.tmdb.org/t/p/w200${m.poster_path}`);

  // If the user has a recommendation, use its backdrop as the hero background
  const heroBg = recommendation?.backdrop;

  return (
    <div className="relative overflow-hidden" style={{ minHeight: '420px' }}>

      {/* ── Background: movie backdrop or dark fallback ── */}
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{
          backgroundImage: heroBg ? `url(${heroBg})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          opacity: heroBg ? 0.35 : 0,
        }}
      />

      {/* ── Scrolling poster marquee ── */}
      <div className="absolute inset-0 flex items-center overflow-hidden opacity-45">
        {posters.length > 0 && (
          <div className="marquee-track flex gap-3" style={{ width: 'max-content' }}>
            {/* Two copies side by side for seamless loop */}
            {[...posters, ...posters].map((url, i) => (
              <img
                key={i}
                src={url}
                alt=""
                className="w-[100px] h-[150px] object-cover rounded-md flex-shrink-0"
                loading="lazy"
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Gradient overlay (darkens the marquee for readability) ── */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, rgba(10,10,15,0.4) 0%, rgba(10,10,15,0.85) 70%, rgba(10,10,15,1) 100%)',
        }}
      />

      {/* ── Title, clock, and tagline (on top of everything) ── */}
      <div className="relative z-10 flex flex-col items-center justify-center pt-16 pb-24 px-4 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-white mb-3 fade-up">
          Cine<span className="text-[#e63946]">Sync</span>
        </h1>
        {clock && (
          <div className="text-[#e63946] text-2xl font-mono font-bold tracking-widest mb-2 fade-up">
            {clock}
          </div>
        )}
        <p className="text-[#7a7a90] text-sm tracking-wide max-w-md fade-up-delay">
          Tell us what you're in the mood for. We'll find the perfect film and tell you when it ends.
        </p>
      </div>
    </div>
  );
}

export default Hero;
