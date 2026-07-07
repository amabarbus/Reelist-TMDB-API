import { useEffect, useState } from "react";
import { X } from "lucide-react";
import SwipeDeck from "./SwipeDeck";

function DiscoverSwipe({ items, onSave, tracked, tmdb }) {
  const [recItems, setRecItems] = useState([]);
  const [recConfig, setRecConfig] = useState(null);
  const [recSeed, setRecSeed] = useState(null);
  const [activeDeck, setActiveDeck] = useState(null);

  useEffect(() => {
    if (activeDeck === 'foryou') return;

    const trackedArray = Object.values(tracked).sort((a, b) => b.addedAt - a.addedAt);
    if (trackedArray.length === 0) return;

    const seed = trackedArray[0];

    setRecSeed(prevSeed => {
      if (prevSeed && prevSeed.id === seed.id) return prevSeed;
      return seed;
    });
  }, [tracked, activeDeck]);

  useEffect(() => {
    if (!recSeed) return;

    const endpoint = `/${recSeed.media_type}/${recSeed.id}/recommendations`;
    setRecConfig({ endpoint, mediaType: recSeed.media_type });

    tmdb(endpoint).then(data => {
      let results = (data.results || []).map(r => ({ ...r, media_type: recSeed.media_type }));

      if (results.length === 0) {
        tmdb(`/${recSeed.media_type}/popular`).then(fallbackData => {
          const fallbackResults = (fallbackData.results || []).map(r => ({ ...r, media_type: recSeed.media_type }));
          setRecItems(fallbackResults);
          setRecConfig({ endpoint: `/${recSeed.media_type}/popular`, mediaType: recSeed.media_type });
        }).catch(() => setRecItems([]));
      } else {
        setRecItems(results);
      }
    }).catch(() => {
      setRecItems([]);
    });
  }, [recSeed, tmdb]);

  return (
    <section className="rl-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', margin: '0 0 14px 0' }}>
        <h2 style={{ marginBottom: 0 }}>Discover</h2>
      </div>

      <div className="rl-discover-buttons">
        <button className="rl-discover-btn" onClick={() => setActiveDeck('trending')}>
          <h3>🔥 Trending Globally</h3>
          <p>Swipe through this week's most popular titles</p>
        </button>

        <button className="rl-discover-btn" onClick={() => setActiveDeck('foryou')}>
          <h3>✨ For You</h3>
          <p>{"Personalized picks based on your watches"}</p>
        </button>
      </div>

      {activeDeck && (
        <div
          className="rl-modal-backdrop"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setActiveDeck(null);
          }}
        >
          <div className="rl-modal rl-swipe-modal">
            <button className="rl-modal-close" style={{ color: 'var(--rl-text)' }} onClick={() => setActiveDeck(null)} aria-label="Close">
              <X size={18} />
            </button>

            <div style={{ padding: '24px' }}>
              {activeDeck === 'trending' ? (
                <SwipeDeck
                  title="Trending Globally"
                  items={items}
                  onSave={onSave}
                  tracked={tracked}
                  tmdb={tmdb}
                  fetchConfig={{ endpoint: "/trending/all/week" }}
                  emptyMessage="You've swiped through all trending titles!"
                />
              ) : (
                <SwipeDeck
                  title={"For You"}
                  items={recItems}
                  onSave={onSave}
                  tracked={tracked}
                  tmdb={tmdb}
                  fetchConfig={recConfig}
                  emptyMessage={recSeed ? "We couldn't find any more recommendations right now." : "Track movies or shows to get personalized recommendations!"}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------------- views ---------------- */

export default DiscoverSwipe;
