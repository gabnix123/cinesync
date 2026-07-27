import React from 'react';

function Hero({ movies, recommendation }) {
  const [clock, setClock] = React.useState('');

  React.useEffect(() => {
    function tick() {
      const now = new Date();
      setClock(now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const posters = movies
    .filter(m => m.poster_path)
    .map(m => `https://image.tmdb.org/t/p/w200${m.poster_path}`);

  const heroBg = recommendation?.backdrop;

  return (
    <div className="relative">
      {heroBg && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${heroBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
            opacity: 0.12,
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 30%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 30%, transparent 100%)',
          }}
        />
      )}

      <div className="relative z-10 flex flex-col items-center justify-center pt-14 pb-6 px-4 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-white mb-3">
          Cine<span className="text-[#e63946]">Sync</span>
        </h1>
        {clock && (
          <div className="text-[#e63946] text-2xl font-mono font-bold tracking-widest mb-2">
            {clock}
          </div>
        )}
        <p className="text-[#7a7a90] text-sm tracking-wide max-w-md">
          Tell us what you're in the mood for. We'll find the perfect film and tell you when it ends.
        </p>
      </div>

      {posters.length > 0 && (
        <div className="relative z-10 overflow-hidden py-3" style={{ borderTop: '1px solid #1a1a22', borderBottom: '1px solid #1a1a22' }}>
          <div className="marquee-track flex gap-2" style={{ width: 'max-content' }}>
            {[...posters, ...posters].map((url, i) => (
              <img key={i} src={url} alt="" className="w-[90px] h-[130px] object-cover rounded-md flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity" loading="lazy" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Hero;