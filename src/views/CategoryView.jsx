import { useEffect, useState } from "react";
import { Home, Loader2 } from "lucide-react";
import PosterCard from "../components/PosterCard.jsx";
import { keyFor } from "../lib/format.js";

function CategoryView({ config, tmdb, tracked, onOpen, onBack, favourites, onToggleFavourite }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    tmdb(config.endpoint, { page }).then((data) => {
      const newItems = (data.results || [])
        .filter((r) => r.media_type !== "person")
        .map((r) => config.mediaType ? { ...r, media_type: config.mediaType } : r)
        .slice(0, 18);

      setItems((prev) => {
        const existingIds = new Set(prev.map(p => keyFor(p)));
        const uniqueNew = newItems.filter(n => !existingIds.has(keyFor(n)));
        return [...prev, ...uniqueNew];
      });
      setLoading(false);
    });
  }, [config, page, tmdb]);

  return (
    <div>
      <button className="rl-btn rl-btn-ghost" onClick={onBack} style={{ marginBottom: '24px' }}>
        &larr; Back to Home
      </button>
      <h2 style={{ marginBottom: '20px' }}>{config.title}</h2>

      <div className="rl-grid">
        {items.map((item) => (<PosterCard
          key={keyFor(item)}
          item={item}
          tracked={tracked}
          onOpen={onOpen}
          onToggleFavourite={onToggleFavourite}
          isFavourite={favourites?.some(f => keyFor(f) === keyFor(item))}
        />))}
      </div>

      <div style={{ textAlign: 'center', marginTop: '40px', marginBottom: '20px' }}>
        <button
          className="rl-btn rl-btn-primary"
          onClick={() => setPage(p => p + 1)}
          disabled={loading}
        >
          {loading ? <><Loader2 className="rl-spin" size={16} /> Loading...</> : "Load More"}
        </button>
      </div>
    </div>
  );
}

export default CategoryView;
