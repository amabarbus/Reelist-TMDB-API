import { useMemo } from "react";
import { AlertCircle, Film, Loader2, Play, Star, Tv } from "lucide-react";
import Section from "../components/Section";
import DiscoverSwipe from "../components/DiscoverSwipe";
import { keyFor } from "../lib/format";
import { img } from "../lib/constants.js";

function HomeView({ trending, popMovies, popTv, loading, error, onRetry, tracked, onOpen, onSeeAll, onSave, tmdb, onToggleFavourite, favourites }) {
  const continueWatching = useMemo(() => {
    return Object.values(tracked)
      .filter(t => t.status === "watching")
      .sort((a, b) => b.addedAt - a.addedAt)
      .slice(0, 9);
  }, [tracked]);

  if (loading) return <div className="rl-loading"><Loader2 className="rl-spin" size={22} /> Loading what's trending…</div>;
  if (error) return (
    <div className="rl-error-block">
      <AlertCircle size={18} /> {error}
      <button className="rl-btn rl-btn-ghost" onClick={onRetry}>Try again</button>
    </div>
  );

  return (
    <div>
      <DiscoverSwipe items={trending} onSave={onSave} tracked={tracked} tmdb={tmdb} />

      {continueWatching.length > 0 && (
        <section className="rl-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '14px' }}>
            <h2 style={{ marginBottom: 0 }}>Continue Watching</h2>
          </div>

          <div className="rl-grid">
            {continueWatching.map((item) => {
              let sub1 = item.media_type === "tv" ? "TV Series" : "Movie";
              let sub2 = "";

              if (item.media_type === "tv" && item.watchedEpisodes?.length > 0) {
                let maxS = 0, maxE = 0;
                item.watchedEpisodes.forEach(ep => {
                  const [s, e] = ep.split('-').map(Number);
                  if (s > maxS) {
                    maxS = s;
                    maxE = e;
                  } else if (s === maxS && e > maxE) {
                    maxE = e;
                  }
                });
                sub1 = `Season ${maxS}`;
                sub2 = `Episode ${maxE}`;
              }
              const isFavourite = favourites?.some(f => keyFor(f) === keyFor(item));

              return (
                <div key={keyFor(item)} className="rl-card" onClick={() => onOpen(item)}>
                  <div className="rl-poster-wrap">
                    {onToggleFavourite && (
                      <button
                        className="rl-heart-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavourite(item);
                        }}
                      >
                        <Star size={16} fill={isFavourite ? "#C97352" : "none"} stroke={isFavourite ? "#C97352" : "#FFFFFF"} />
                      </button>
                    )}
                    {item.poster_path ? (
                      <img src={img(item.poster_path)} alt={item.title} className="rl-poster" loading="lazy" />
                    ) : (
                      <div className="rl-poster rl-poster-empty">
                        {item.media_type === "tv" ? <Tv size={26} /> : <Film size={26} />}
                      </div>
                    )}
                    <div className="rl-card-badge">
                      <Play size={12} />
                    </div>
                  </div>

                  <div style={{ marginTop: '6px' }}>
                    <div className="rl-card-title">{item.title}</div>
                    <div className="rl-card-meta">
                      {sub1} {sub2 && <>· {sub2}</>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <Section
        title="Trending this week"
        items={trending}
        tracked={tracked}
        onOpen={onOpen}
        onSeeAll={() => onSeeAll("Trending this week", "/trending/all/week")}
        onToggleFavourite={onToggleFavourite}
        favourites={favourites}
      />
      <Section
        title="Popular movies"
        items={popMovies}
        tracked={tracked}
        onOpen={onOpen}
        onSeeAll={() => onSeeAll("Popular movies", "/movie/popular", "movie")}
        onToggleFavourite={onToggleFavourite}
        favourites={favourites}
      />
      <Section
        title="Popular TV shows"
        items={popTv}
        tracked={tracked}
        onOpen={onOpen}
        onSeeAll={() => onSeeAll("Popular TV shows", "/tv/popular", "tv")}
        onToggleFavourite={onToggleFavourite}
        favourites={favourites}
      />
    </div>
  );
}

export default HomeView;
