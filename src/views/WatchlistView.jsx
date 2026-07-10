import { useEffect, useMemo, useState } from "react";
import { LayoutGrid, List, Star, Trash2, Tv } from "lucide-react";

import PosterCard from "../components/PosterCard";

import { STATUS_LABELS, STATUS_ORDER } from "../lib/constants";
import { keyFor, titleOf } from "../lib/format";
import { img } from "../lib/constants.js";

function WatchlistView({ groups, tab, setTab, onOpen, tmdb, onSilentUpdate, layout, setLayout, customLists, tracked, addList, removeList, onToggleFavourite, favourites, notifications }) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [showLists, setShowLists] = useState(false);
  const [activeListId, setActiveListId] = useState(null);
  const [showSort, setShowSort] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'addedAt', direction: 'desc' });

  const [listPrompt, setListPrompt] = useState(false);
  const [listName, setListName] = useState("");
  const [deletePrompt, setDeletePrompt] = useState(null);

  useEffect(() => {
    const itemsToRepair = Object.values(groups).flat().filter(t =>
      (t.media_type === 'tv' && !t.number_of_episodes) ||
      (!t.release_date && !t.first_air_date)
    );

    itemsToRepair.forEach(t => {
      tmdb(`/${t.media_type}/${t.id}`).then(data => {
        if (data.number_of_episodes > t.number_of_episodes) {

          const isDuplicate = notifications.some(n =>
            n.title === t.title && n.message === "A new episode has been released!"
          );

          if (!isDuplicate) {
            addNotification(t.title, "A new episode has been released!");
          }

          onSilentUpdate(t, {
            number_of_episodes: data.number_of_episodes,
            release_date: data.release_date,
            first_air_date: data.first_air_date
          });
        }
      }).catch(() => { });
    });
  }, [groups, tmdb, onSilentUpdate, notifications]);

  const items = activeListId
    ? customLists[activeListId]?.items || []
    : groups[tab] || [];

  const allTrackedItems = useMemo(() => Object.values(groups).flat(), [groups]);

  const filteredItems = useMemo(() => {
    let listItems = activeListId
      ? (customLists[activeListId]?.items || []).filter(item => {
        const entry = tracked[keyFor(item)];
        return entry && entry.status === tab;
      })
      : (groups[tab] || []);

    if (typeFilter === "favourites") {
      listItems = listItems.filter(t =>
        Array.isArray(favourites) && favourites.some(f => keyFor(f) === keyFor(t))
      );
    } else if (typeFilter !== "all") {
      listItems = listItems.filter(t => t.media_type === typeFilter);
    }

    return [...listItems].sort((a, b) => {
      const entryA = tracked[keyFor(a)] || {};
      const entryB = tracked[keyFor(b)] || {};

      let valA, valB;

      if (sortConfig.key === 'title') {
        valA = titleOf(a).toLowerCase();
        valB = titleOf(b).toLowerCase();
      } else if (sortConfig.key === 'release') {
        const dateA = a.release_date || a.first_air_date;
        const dateB = b.release_date || b.first_air_date;
        valA = dateA ? new Date(dateA).getTime() : 0;
        valB = dateB ? new Date(dateB).getTime() : 0;
      } else {
        valA = entryA.addedAt || 0;
        valB = entryB.addedAt || 0;
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [items, typeFilter, activeListId, tab, customLists, tracked, groups, sortConfig, favourites]);

  const getCountForStatus = (status) => {
    const sourceItems = activeListId
      ? customLists[activeListId].items.filter(item => {
        const entry = tracked[keyFor(item)];
        return entry && entry.status === status;
      })
      : (groups[status] || []);

    if (typeFilter === "favourites") {
      return sourceItems.filter(item => favourites.some(f => keyFor(f) === keyFor(item))).length;
    }

    return typeFilter === "all"
      ? sourceItems.length
      : sourceItems.filter(item => item.media_type === typeFilter).length;
  };

  return (
    <div>
      <div className="rl-filter-row" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          {STATUS_ORDER.map((s) => {
            const sourceItems = activeListId
              ? customLists[activeListId].items.filter(item => {
                const entry = tracked[keyFor(item)];
                return entry && entry.status === s;
              })
              : (groups[s] || []);
            const count = typeFilter === "all"
              ? sourceItems.length
              : sourceItems.filter(item => item.media_type === typeFilter).length;
            return (
              <button
                key={s}
                className={`rl-filter-btn ${tab === s ? "rl-filter-btn-active" : ""}`}
                onClick={() => setTab(s)}
              >
                {STATUS_LABELS[s]} ({getCountForStatus(s)})
              </button>
            );
          })}

          <div style={{ position: 'relative' }}>
            <button
              className={`rl-filter-btn ${showLists || activeListId ? "rl-filter-btn-active" : ""}`}
              onClick={() => setShowLists(!showLists)}
            >
              Custom Lists
            </button>

            {showLists && (
              <div style={{ position: 'absolute', top: '110%', left: 0, background: 'var(--rl-cream)', border: '1px solid var(--rl-border)', borderRadius: '12px', padding: '8px', zIndex: 100, minWidth: '150px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <button className="rl-filter-btn" style={{ width: '100%', marginBottom: '4px' }} onClick={() => { setActiveListId(null); setShowLists(false); }}>
                  All items
                </button>

                {Object.values(customLists)
                  .filter(list => (list.name !== "Favourites" && list.name !== "On Hold"))
                  .map(list => (
                    <div key={list.id} className="rl-list-item-hover" style={{ display: 'flex', alignItems: 'center', marginBottom: '4px', gap: '4px' }}>
                      <button
                        className={`rl-filter-item ${activeListId === list.id ? "rl-filter-item-active" : ""}`}
                        style={{ flex: 1, border: 'none', textAlign: 'left' }}
                        onClick={() => {
                          setActiveListId(list.id);
                          setShowLists(false);
                        }}
                      >
                        {list.name}
                      </button>

                      {/* The Delete Button */}
                      <button
                        style={{ background: 'none', border: 'none', color: '#a8452b', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                        onClick={() => {
                          setDeletePrompt(list);
                          setShowLists(false);
                        }}
                        aria-label="Delete list"
                        title="Delete list"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                {/* Divider and Add List Button */}
                <div style={{ height: '1px', background: 'var(--rl-border)', margin: '6px 0' }} />
                <button
                  className="rl-filter-btn"
                  style={{ width: '100%', border: 'none', textAlign: 'left', color: 'var(--rl-burnt)', fontWeight: '600' }}
                  onClick={() => {
                    setListPrompt(true);
                    setShowLists(false);
                  }}
                >
                  + Add new list
                </button>

              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          {["all", "movie", "tv"].map((t) => {
            const count = t === "all" ? allTrackedItems.length : allTrackedItems.filter(item => item.media_type === t).length;
            return (
              <button key={t} className={`rl-filter-btn ${typeFilter === t ? "rl-filter-btn-active" : ""}`} onClick={() => setTypeFilter(t)}>
                {t === "all" ? "All" : t === "movie" ? "Movies" : "TV Shows"} ({count})
              </button>
            );
          })}

          {/* Sort Dropdown */}
          <div style={{ position: 'relative' }}>
            <button className={`rl-filter-btn ${showSort ? "rl-filter-btn-active" : ""}`} onClick={() => setShowSort(!showSort)}>
              Sort
            </button>

            {showSort && (
              <div style={{ position: 'absolute', top: '110%', right: 0, background: 'var(--rl-cream)', border: '1px solid var(--rl-border)', borderRadius: '12px', padding: '8px', zIndex: 20, minWidth: '180px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                {[
                  { label: 'Date Added', key: 'addedAt' },
                  { label: 'Alphabetical', key: 'title' },
                  { label: 'Release Date', key: 'release' }
                ].map(opt => (
                  <div key={opt.key} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                    <button
                      className={`rl-filter-btn ${sortConfig.key === opt.key ? "rl-filter-btn-active" : ""}`}
                      style={{ flex: 1, border: 'none', textAlign: 'left', borderRadius: sortConfig.key === opt.key ? '8px 0 0 8px' : '8px' }}
                      onClick={() => {
                        if (sortConfig.key !== opt.key) {
                          setSortConfig({ key: opt.key, direction: opt.key === 'title' ? 'asc' : 'desc' });
                        }
                      }}
                    >
                      {opt.label}
                    </button>

                    {/* Toggle Direction Arrow */}
                    {sortConfig.key === opt.key && (
                      <button
                        className="rl-filter-btn rl-filter-btn-active"
                        style={{ border: 'none', borderRadius: '0 8px 8px 0', padding: '7px 10px', marginLeft: '1px', borderLeft: '1px solid rgba(255,255,255,0.2)' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSortConfig(prev => ({ ...prev, direction: prev.direction === 'asc' ? 'desc' : 'asc' }));
                        }}
                      >
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Favourites Button */}
          <button
            className={`rl-filter-btn ${typeFilter === "favourites" ? "rl-filter-btn-active" : ""}`}
            onClick={() => setTypeFilter("favourites")}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Star size={14} fill={typeFilter === "favourites" ? "#fff" : "none"} />
            Favourites ({favourites.length})
          </button>

          <div style={{ display: 'flex', border: '1px solid var(--rl-border)', borderRadius: '8px', overflow: 'hidden', marginLeft: '4px' }}>
            <button
              style={{ padding: '6px 10px', background: layout === 'grid' ? 'var(--rl-beige)' : 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              onClick={() => setLayout('grid')}
              title="Grid View"
            ><LayoutGrid size={15} color={layout === 'grid' ? 'var(--rl-burnt)' : '#8a7d6f'} /></button>
            <button
              style={{ padding: '6px 10px', background: layout === 'list' ? 'var(--rl-beige)' : 'transparent', border: 'none', cursor: 'pointer', borderLeft: '1px solid var(--rl-border)', display: 'flex', alignItems: 'center' }}
              onClick={() => setLayout('list')}
              title="List View"
            ><List size={15} color={layout === 'list' ? 'var(--rl-burnt)' : '#8a7d6f'} /></button>
          </div>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="rl-empty">
          {items.length === 0
            ? "Nothing here yet — open a title and set its status to add it."
            : `No ${typeFilter === "movie" ? "movies" : "TV shows"} in this list.`}
        </div>
      ) : layout === "grid" ? (
        <div className="rl-grid">
          {filteredItems.map((item) => (
            <PosterCard
              key={keyFor(item)}
              item={{ ...item, vote_average: item.rating || 0 }}
              tracked={tracked}
              onOpen={() => onOpen({ id: item.id, media_type: item.media_type })}
              hideText={true}
              onToggleFavourite={onToggleFavourite}
              isFavourite={favourites?.some(f => keyFor(f) === keyFor(item))}
            />
          ))}
        </div>
      ) : (
        <div className="rl-list">
          {filteredItems.map((t) => {
            const entry = tracked[keyFor(t)];
            const displayTitle = entry?.title || titleOf(t);
            const watchedCount = entry?.watchedEpisodes?.length || 0;
            const totalEps = parseInt(entry?.number_of_episodes || t.number_of_episodes) || 0;
            let progressPct = 0;
            if (entry?.status === "completed" || entry?.status === "uptodate") {
              progressPct = 100;
            } else if (entry?.status === "planned") {
              progressPct = 0;
            } else {
              progressPct = (t.media_type === "tv" && totalEps > 0) ? Math.min(100, (watchedCount / totalEps) * 100) : 0;
            }

            return (
              <button key={keyFor(t)} className="rl-list-card" onClick={() => onOpen({ id: t.id, media_type: t.media_type })}>
                {t.poster_path ? (
                  <img src={img(t.poster_path, "w185")} className="rl-list-poster" alt="" loading="lazy" />
                ) : (
                  <div className="rl-list-poster rl-poster-empty"><Tv size={20} /></div>
                )}
                <div className="rl-list-info">
                  <div className="rl-list-header">
                    <span className="rl-list-title">{displayTitle}</span>
                    {entry?.rating > 0 && <span className="rl-list-rating"><Star size={12} fill="var(--rl-burnt)" stroke="none" /> {entry.rating}/10</span>}
                  </div>
                  <div className="rl-list-meta">
                    {t.media_type === "tv" ? "TV Series" : "Movie"}
                  </div>
                  {/* Progress Bar */}
                  <div className="rl-list-progress-wrap">
                    <div className="rl-list-progress-bar">
                      <div className="rl-list-progress-fill" style={{ width: `${progressPct}%`, background: progressPct === 100 ? 'var(--rl-olive)' : 'var(--rl-burnt)' }} />
                    </div>
                    <span className="rl-list-progress-text">
                      {t.media_type === "tv" ? `${watchedCount} / ${totalEps > 0 ? totalEps : '...'}` : (entry?.status === "completed" ? "Watched" : "Movie")}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
      {/* Custom Add List Prompt */}
      {listPrompt && (
        <div className="rl-bulk-overlay" onClick={() => { setListPrompt(false); setListName(""); }}>
          <div className="rl-bulk-box" onClick={e => e.stopPropagation()}>
            <h4 style={{ margin: "0 0 8px 0", fontSize: "15px", color: "var(--rl-text)" }}>Create a new list</h4>
            <input
              autoFocus
              className="rl-input"
              style={{
                width: "100%",
                marginBottom: "16px",
                background: "var(--rl-beige)",
                border: "1px solid var(--rl-border)",
                borderRadius: "12px",
                padding: "12px 14px"
              }}
              placeholder="E.g., Comfort Movies, Sci-Fi..."
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && listName.trim()) {
                  addList(listName.trim());
                  setListName("");
                  setListPrompt(false);
                }
              }}
            />
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button className="rl-btn rl-btn-ghost" style={{ padding: "8px 14px", fontSize: "13px" }} onClick={() => { setListPrompt(false); setListName(""); }}>Cancel</button>
              <button className="rl-btn rl-btn-primary" style={{ padding: "8px 14px", fontSize: "13px" }} disabled={!listName.trim()} onClick={() => {
                addList(listName.trim());
                setListName("");
                setListPrompt(false);
              }}>Create</button>
            </div>
          </div>
        </div>
      )
      }

      {/* Custom Delete List Confirm */}
      {deletePrompt && (
        <div className="rl-bulk-overlay" onClick={() => setDeletePrompt(null)}>
          <div className="rl-bulk-box" onClick={e => e.stopPropagation()}>
            <h4 style={{ margin: "0 0 8px 0", fontSize: "15px", color: "var(--rl-text)" }}>Delete List</h4>
            <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#6a5f55", lineHeight: "1.4" }}>
              Are you sure you want to permanently delete your list <strong>"{deletePrompt.name}"</strong>?
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button className="rl-btn rl-btn-ghost" style={{ padding: "8px 14px", fontSize: "13px" }} onClick={() => setDeletePrompt(null)}>Cancel</button>
              <button className="rl-btn rl-btn-primary" style={{ padding: "8px 14px", fontSize: "13px", background: "#a8452b", borderColor: "#a8452b" }} onClick={() => {
                removeList(deletePrompt.id);
                if (activeListId === deletePrompt.id) setActiveListId(null);
                setDeletePrompt(null);
              }}>Yes, delete</button>
            </div>
          </div>
        </div>
      )
      }
    </div >
  );
}

export default WatchlistView;
