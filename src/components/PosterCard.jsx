import { Bookmark, Check, Film, Pause, Play, Star, Tv } from "lucide-react";
import RatingRing from "./RatingRing";
import { keyFor, titleOf, yearOf } from "../lib/format";
import { img } from "../lib/constants.js";

function PosterCard({ item, tracked, onOpen, hideText, isFavourite, onToggleFavourite }) {
  const entry = tracked[keyFor(item)];
  return (
    <div className="rl-card">
      <div className="rl-poster-wrap" onClick={() => onOpen(item)} style={{ cursor: "pointer" }}>
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
          <img src={img(item.poster_path)} alt={titleOf(item)} className="rl-poster" loading="lazy" />
        ) : (
          <div className="rl-poster rl-poster-empty">
            {item.media_type === "tv" ? <Tv size={26} /> : <Film size={26} />}
          </div>
        )}
        {item.vote_average > 0 && <div className="rl-card-ring"><RatingRing value={item.vote_average} /></div>}
        {entry && entry.status !== "ignored" && (
          <div className="rl-card-badge">
            {entry.status === "completed" || entry.status === "uptodate" ? <Check size={12} />
              : entry.status === "watching" ? <Play size={12} />
                : entry.status === "onhold" ? <Pause size={12} />
                  : <Bookmark size={12} />}
          </div>
        )}
      </div>

      {!hideText && (
        <div onClick={() => onOpen(item)} style={{ cursor: "pointer" }}>
          <div className="rl-card-title">{titleOf(item)}</div>
          <div className="rl-card-meta">{item.media_type === "tv" ? "TV Series" : "Movie"} · {yearOf(item)}</div>
        </div>
      )}
    </div>
  );
}

export default PosterCard;
