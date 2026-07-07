import { useEffect, useMemo } from "react";
import { Loader2, Search as SearchIcon, X } from "lucide-react";
import PosterCard from "../components/PosterCard";
import { keyFor } from "../lib/format";

function ExploreView({ query, setQuery, onSearch, results, loading, typeFilter, setTypeFilter, tracked, onOpen, recentSearches, removeRecentSearch, favourites, onToggleFavourite, favListId, toggleItemInList }) {

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      onSearch(query, false);
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [query]);

  const submitSearch = () => {
    if (query.trim()) {
      onSearch(query, true);
    }
  };

  const filtered = useMemo(() => {
    if (!results) return null;
    if (typeFilter === "all") return results;
    return results.filter((r) => r.media_type === typeFilter);
  }, [results, typeFilter]);

  return (
    <div>
      <div className="rl-search-row">
        <div className="rl-search-input-wrap">
          <SearchIcon size={16} />
          <input
            className="rl-search-input"
            placeholder="Search movies, TV shows…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitSearch(); }}
          />

          {/* Clear Search Button */}
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{
                background: "none",
                border: "none",
                color: 'var(--rl-text)',
                cursor: "pointer",
                padding: "0",
                display: "flex",
                alignItems: "center"
              }}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <button className="rl-btn rl-btn-primary" onClick={submitSearch}>Search</button>
      </div>
      <div className="rl-filter-row">
        {["all", "movie", "tv"].map((t) => (
          <button key={t} className={`rl-filter-btn ${typeFilter === t ? "rl-filter-btn-active" : ""}`} onClick={() => setTypeFilter(t)}>
            {t === "all" ? "All" : t === "movie" ? "Movies" : "TV Shows"}
          </button>
        ))}
      </div>

      {loading && <div className="rl-loading"><Loader2 className="rl-spin" size={20} /> Searching…</div>}

      {/* Recent Searches Panel */}
      {!loading && !query.trim() && recentSearches && recentSearches.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <h3 style={{ fontSize: "14px", color: "#8a7d6f", marginBottom: "12px", fontWeight: "600" }}>Recent Searches</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {recentSearches.map((rs) => (
              <div key={rs} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--rl-cream)", border: "1px solid var(--rl-border)", borderRadius: "12px" }}>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, cursor: "pointer", fontSize: "14px", fontWeight: "500" }}
                  onClick={() => { setQuery(rs); onSearch(rs, true); }}
                >
                  <SearchIcon size={14} color="#8a7d6f" />
                  {rs}
                </div>
                <button
                  style={{ background: "none", border: "none", color: "#a8452b", cursor: "pointer", display: "flex", alignItems: "center", padding: "4px" }}
                  onClick={() => removeRecentSearch(rs)}
                  aria-label="Remove search"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && filtered && filtered.length === 0 && query.trim() && <div className="rl-empty">No results for "{query}". Try another title.</div>}

      {!loading && filtered && filtered.length > 0 && (
        <div className="rl-grid">
          {filtered.map((item) => (
            <PosterCard
              key={keyFor(item)}
              item={item}
              tracked={tracked}
              onOpen={onOpen}
              onToggleFavourite={onToggleFavourite}
              isFavourite={favourites.some(f => keyFor(f) === keyFor(item))}
            />
          ))}
        </div>
      )}

      {!results && !loading && (!recentSearches || recentSearches.length === 0) && (
        <div className="rl-empty">Search for a title to get started.</div>
      )}
    </div>
  );
}

export default ExploreView;
