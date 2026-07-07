import { keyFor } from "../lib/format";
import PosterCard from "./PosterCard";

function Section({ title, items, tracked, onOpen, onSeeAll, onToggleFavourite, favourites }) {
  if (!items || items.length === 0) return null;
  return (
    <section className="rl-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '14px' }}>
        <h2 style={{ marginBottom: 0 }}>{title}</h2>
        {onSeeAll && (
          <button className="rl-btn rl-btn-ghost" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={onSeeAll}>
            See All &rarr;
          </button>
        )}
      </div>
      <div className="rl-grid">
        {items.map((item) => (
          <PosterCard
            key={keyFor(item)}
            item={item}
            tracked={tracked}
            onOpen={onOpen}
            onToggleFavourite={onToggleFavourite}
            isFavourite={favourites?.some(f => keyFor(f) === keyFor(item))}
          />
        ))}
      </div>
    </section>
  );
}

/* ---------------- setup ---------------- */

export default Section;
