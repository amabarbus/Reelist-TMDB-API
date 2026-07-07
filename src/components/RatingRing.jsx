function RatingRing({ value }) {
  const v = value || 0;
  const pct = Math.max(0, Math.min(1, v / 10));
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" className="rl-ring" style={{ background: "rgba(0, 0, 0, 0.4)", border: "none", borderRadius: "50%", opacity: 0.9 }} >
      < circle cx="18" cy="18" r={r} fill="none" strokeWidth="3" color="rgba(0, 0, 0, 0.4)" />
      <circle
        cx="18" cy="18" r={r} fill="none" stroke="#C97352" strokeWidth="3"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
        strokeLinecap="round" transform="rotate(-90 18 18)"
      />
      <text x="18" y="22" textAnchor="middle" fontSize="10.5" fontWeight="600" color="#FFFFFF" fill="#FFFFFF">
        {v ? v.toFixed(1) : "–"}
      </text>
    </svg >
  );
}

export default RatingRing;
