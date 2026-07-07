import { useState } from "react";
import { Star } from "lucide-react";

function StarRating({ value, onChange, size = 18 }) {
  const [hover, setHover] = useState(0);

  const filledCount = hover > 0 ? hover : Math.round((value || 0) / 2);

  return (
    <div className="rl-stars" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i} type="button" className="rl-star-btn"
          onMouseEnter={() => setHover(i)}
          onClick={() => onChange(i * 2)}
          aria-label={`Rate ${i * 2} out of 10`}
        >
          <Star size={size} fill={filledCount >= i ? "#B65E3C" : "none"} stroke="#B65E3C" strokeWidth={1.8} />
        </button>
      ))}
    </div>
  );
}

export default StarRating;
