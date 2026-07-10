import { useState, useEffect, useMemo } from "react";
import { Loader2, Search as SearchIcon, X, User } from "lucide-react";

import PosterCard from "../components/PosterCard";

import { keyFor } from "../lib/format";

function ExploreView({ query, setQuery, onSearch, results, loading, typeFilter, setTypeFilter, tracked, onOpen, recentSearches, removeRecentSearch, favourites, onToggleFavourite, favListId, toggleItemInList, onViewProfile }) {

  const [userResults, setUserResults] = useState(null);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (typeFilter === "users") {
        searchLocalUsers(query);
      } else {
        onSearch(query, false);
      }
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [query, typeFilter]);

  const searchLocalUsers = async (searchQuery) => {
    if (!searchQuery.trim()) {
      setUserResults(null);
      return;
    }

    setIsSearchingUsers(true);
    try {
      const res = await fetch(`http://localhost:3000/api/users/search?q=${searchQuery}`);
      if (res.ok) {
        const data = await res.json();
        setUserResults(data);
      }
    } catch (err) {
      setUserResults([]);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const submitSearch = () => {
    if (query.trim()) {
      if (typeFilter === "users") {
        searchLocalUsers(query);
      } else {
        onSearch(query, true);
      }
    }
  };

  const filtered = useMemo(() => {
    if (!results) return null;
    if (typeFilter === "all") return results;
    return results.filter((r) => r.media_type === typeFilter);
  }, [results, typeFilter]);

  const isLoading = typeFilter === "users" ? isSearchingUsers : loading;

  return (
    <div>
      <div className="rl-search-row">
        <div className="rl-search-input-wrap">
          <SearchIcon size={16} />
          <input
            className="rl-search-input"
            placeholder={typeFilter === "users" ? "Search for users..." : "Search movies, TV shows…"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitSearch(); }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{ background: "none", border: "none", color: 'var(--rl-text)', cursor: "pointer", padding: "0", display: "flex", alignItems: "center" }}
            >
              <X size={16} />
            </button>
          )}
        </div>
        <button className="rl-btn rl-btn-primary" onClick={submitSearch}>Search</button>
      </div>

      <div className="rl-filter-row">
        {["all", "movie", "tv", "users"].map((t) => (
          <button key={t} className={`rl-filter-btn ${typeFilter === t ? "rl-filter-btn-active" : ""}`} onClick={() => setTypeFilter(t)}>
            {t === "all" ? "All" : t === "movie" ? "Movies" : t === "tv" ? "TV Shows" : "Users"}
          </button>
        ))}
      </div>

      {isLoading && <div className="rl-loading"><Loader2 className="rl-spin" size={20} /> Searching…</div>}

      {/* TMDB MEDIA RESULTS */}
      {typeFilter !== "users" && (
        <>
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
        </>
      )}

      {/* USER SEARCH RESULTS */}
      {typeFilter === "users" && (
        <>
          {!isSearchingUsers && userResults && userResults.length === 0 && query.trim() && (
            <div className="rl-empty">No users found matching "{query}".</div>
          )}

          {!isSearchingUsers && userResults && userResults.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {userResults.map((user) => (
                <div
                  key={user.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '16px', padding: '16px',
                    background: 'var(--rl-cream)', border: '1px solid var(--rl-border)',
                    borderRadius: '16px', cursor: 'pointer', transition: 'transform 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                  onClick={() => onViewProfile && onViewProfile(user.username)}
                >
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--rl-beige)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    {user.avatar ? <img src={user.avatar} alt={user.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={24} color="#8a7d6f" />}
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>@{user.username}</h3>
                    {user.bio && <p style={{ margin: 0, fontSize: '13px', color: '#8a7d6f', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{user.bio}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* RECENT SEARCHES */}
      {typeFilter !== "users" && !loading && !query.trim() && recentSearches && recentSearches.length > 0 && (
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
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!results && !loading && typeFilter !== "users" && (!recentSearches || recentSearches.length === 0) && (
        <div className="rl-empty">Search for a title to get started.</div>
      )}
    </div>
  );
}

export default ExploreView;