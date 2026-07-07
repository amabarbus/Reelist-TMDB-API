export function titleOf(item) {
  return item.title || item.name || "Untitled";
}

export function yearOf(item) {
  const d = item.release_date || item.first_air_date;
  return d ? d.slice(0, 4) : "—";
}

export function keyFor(item) {
  return `${item.media_type}-${item.id}`;
}
