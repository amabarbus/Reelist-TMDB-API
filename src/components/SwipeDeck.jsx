import { useEffect, useRef, useState } from "react";
import { Bookmark, Loader2, Star, X } from "lucide-react";
import { keyFor, titleOf, yearOf } from "../lib/format";
import { img } from "../lib/constants.js";

function SwipeDeck({ title, subtitle, items, onSave, tracked, tmdb, fetchConfig, emptyMessage }) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);

  const [page, setPage] = useState(1);
  const [extraItems, setExtraItems] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const allItems = [...(items || []), ...extraItems];

  const swipeableItems = allItems.filter(item => !tracked[keyFor(item)]);
  const currentItem = swipeableItems[0];
  const nextItem = swipeableItems[1];

  useEffect(() => {
    if (swipeableItems.length < 3 && fetchConfig?.endpoint && !loadingMore && hasMore) {
      setLoadingMore(true);
      const nextPage = page + 1;

      tmdb(fetchConfig.endpoint, { page: nextPage }).then(data => {
        const results = data.results || [];
        if (results.length === 0 || nextPage >= (data.total_pages || 1000)) {
          setHasMore(false);
        }

        const newItems = results
          .filter((r) => r.media_type !== "person")
          .map(r => ({ ...r, media_type: fetchConfig.mediaType || r.media_type }));

        setExtraItems(prev => {
          const existing = new Set(prev.map(p => keyFor(p)));
          return [...prev, ...newItems.filter(n => !existing.has(keyFor(n)))];
        });

        setPage(nextPage);
        setLoadingMore(false);
      }).catch(() => {
        setLoadingMore(false);
        setHasMore(false);
      });
    }
  }, [swipeableItems.length, fetchConfig?.endpoint, fetchConfig?.mediaType, loadingMore, hasMore, page, tmdb]);

  const swipeOut = (direction, status) => {
    setDragX(direction === "right" ? 400 : -400);
    setTimeout(() => {
      onSave(currentItem, status);
      setDragX(0);
    }, 200);
  };

  const handlePointerDown = (e) => {
    startX.current = e.clientX || (e.touches && e.touches[0].clientX);
    setIsDragging(true);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const x = e.clientX || (e.touches && e.touches[0].clientX);
    setDragX(x - startX.current);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (dragX > 100) {
      swipeOut("right", "planned");
    } else if (dragX < -100) {
      swipeOut("left", "ignored");
    } else {
      setDragX(0);
    }
  };

  return (
    <div className="rl-swipe-deck-container">
      {nextItem?.poster_path && (
        <img src={img(nextItem.poster_path, "w500")} style={{ display: 'none' }} alt="" />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '14px' }}>
        <h3 style={{ marginBottom: 0, fontSize: '15px' }}>{title}</h3>
        <span style={{ fontSize: '12px', color: '#8a7d6f' }}>{subtitle}</span>
      </div>

      <div className="rl-swipe-panel">
        {!currentItem ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '360px', background: 'var(--rl-cream)', borderRadius: '20px', border: '1px dashed var(--rl-border)', width: '100%' }}>
            {loadingMore ? (
              <div style={{ color: '#8a7d6f', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <Loader2 className="rl-spin" size={32} />
                <span>Finding more...</span>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px' }}>
                <p style={{ color: '#8a7d6f', marginBottom: '16px', fontSize: '14px', lineHeight: '1.5' }}>{emptyMessage}</p>
              </div>
            )}
          </div>
        ) : (
          <div style={{ width: "100%", perspective: "1000px" }}>
            <div
              className="rl-swipe-card"

              key="active-card"
              style={{
                transform: `translateX(${dragX}px) rotate(${dragX * 0.05}deg)`,
                transition: isDragging ? 'none' : 'transform 0.2s ease, background-image 0.3s ease',
                backgroundImage: `url(${img(currentItem.poster_path, "w500")})`
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              <div className="rl-swipe-overlay">
                <div className="rl-swipe-title">{titleOf(currentItem)}</div>
                <div className="rl-swipe-meta">
                  {currentItem.media_type === "tv" ? "TV Series" : "Movie"} · {yearOf(currentItem)}
                  <span style={{ marginLeft: "10px" }}>
                    <Star size={12} fill="#F7F3EC" stroke="none" style={{ display: "inline", marginBottom: "-2px", marginRight: "3px" }} />
                    {currentItem.vote_average?.toFixed(1) || "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="rl-swipe-controls">
              <button className="rl-swipe-btn rl-btn-nope" aria-label="Skip" onClick={() => swipeOut("left", "ignored")}>
                <X size={26} strokeWidth={3} />
              </button>
              <button className="rl-swipe-btn rl-btn-like" aria-label="Save" onClick={() => swipeOut("right", "planned")}>
                <Bookmark size={24} strokeWidth={3} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SwipeDeck;
