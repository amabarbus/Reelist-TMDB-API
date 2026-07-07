import { useEffect, useState } from "react";
import { Calendar, Check, Clock, List, Loader2, Star, Trash2, Tv, User, X } from "lucide-react";
import RatingRing from "./RatingRing";
import StarRating from "./StarRating";
import Section from "./Section";
import { STATUS_LABELS, STATUS_ORDER } from "../lib/constants";
import { keyFor, titleOf, yearOf } from "../lib/format";
import { img } from "../lib/constants.js";

function DetailPanel({ selected, detail, loading, tracked, onClose, onStatus, onRate, onNote, onRemove, onToggleEpisode, onBulkMark, tmdb, onEpisodeUpdate, customLists, toggleItemInList, addList }) {
  const [activeSeason, setActiveSeason] = useState(1);
  const [bulkPrompt, setBulkPrompt] = useState(null);

  const [viewMode, setViewMode] = useState("info");

  const handleClose = () => {
    setBulkPrompt(null);
    onClose();
  };

  const [seasonData, setSeasonData] = useState(null);
  const [seasonLoading, setSeasonLoading] = useState(false);

  const [listPrompt, setListPrompt] = useState(false);
  const [listName, setListName] = useState("");

  useEffect(() => {
    setViewMode("info");
    if (detail && detail.media_type === "tv") {
      const firstSeason = detail.seasons?.find(s => s.season_number > 0)?.season_number || 1;
      setActiveSeason(firstSeason);
    }
  }, [detail]);

  useEffect(() => {
    if (!detail || detail.media_type !== "tv") return;
    let isMounted = true;
    setSeasonLoading(true);

    tmdb(`/tv/${detail.id}/season/${activeSeason}`, { append_to_response: "credits" }).then(data => {
      if (isMounted) {
        setSeasonData(data);
        setSeasonLoading(false);
      }
    }).catch(() => {
      if (isMounted) setSeasonLoading(false);
    });

    return () => { isMounted = false };
  }, [detail, activeSeason, tmdb]);

  const isTv = selected?.media_type === "tv";
  const entry = selected ? tracked[keyFor(selected)] : null;

  const favList = Object.values(customLists).find(l => l.name === "Favourites");
  const isFavourite = selected && favList?.items.some(i => keyFor(i) === keyFor(selected));

  useEffect(() => {
    if (detail && !detail.error && isTv && entry?.status === "uptodate") {
      const watchedCount = entry.watchedEpisodes?.length || 0;
      if (detail.number_of_episodes > watchedCount) {
        onStatus(detail, "watching");
      }
    }
  }, [detail, entry?.status, entry?.watchedEpisodes?.length, isTv, onStatus]);

  if (!selected) return null;
  return (
    <div className="rl-modal-backdrop" onClick={handleClose}>
      <div className="rl-modal" onClick={(e) => e.stopPropagation()}>
        <button className="rl-modal-close" style={{ color: 'var(--rl-text)' }} onClick={handleClose} aria-label="Close"><X size={18} /></button>
        {/* Favourite Button (Left) */}
        <button
          className="rl-modal-close"
          style={{ right: 'auto', left: '14px', color: 'var(--rl-text)', zIndex: 10 }}
          onClick={(e) => {
            e.stopPropagation();
            if (favList) toggleItemInList(favList.id, selected);
          }}
          aria-label="Toggle Favourite"
        >
          <Star
            size={18}
            fill={isFavourite ? "var(--rl-terracotta)" : "none"}
            stroke={isFavourite ? "var(--rl-terracotta)" : "currentColor"}
          />
        </button>
        {loading && <div className="rl-modal-loading"><Loader2 className="rl-spin" size={26} /></div>}
        {!loading && detail && !detail.error && (
          <>
            {detail.backdrop_path && (
              <div className="rl-modal-backdrop-img" style={{ backgroundImage: `url(${img(detail.backdrop_path, "w1280")})` }} />
            )}
            <div className="rl-modal-body">
              <div className="rl-modal-header">
                {detail.poster_path && <img className="rl-modal-poster" src={img(detail.poster_path)} alt="" />}
                <div>
                  <h2>{titleOf(detail)}</h2>
                  {detail.tagline && <p className="rl-tagline">{detail.tagline}</p>}
                  <div className="rl-pill-row">
                    {(detail.genres || []).slice(0, 4).map((g) => <span key={g.id} className="rl-pill">{g.name}</span>)}
                  </div>
                  <div className="rl-meta-row">
                    <span><Calendar size={13} /> {yearOf(detail)}</span>
                    {isTv ? (
                      <span><Tv size={13} /> {detail.number_of_seasons} season{detail.number_of_seasons === 1 ? "" : "s"}</span>
                    ) : (
                      <span><Clock size={13} /> {detail.runtime ? `${detail.runtime} min` : "—"}</span>
                    )}
                    <RatingRing value={detail.vote_average} />
                  </div>
                </div>
              </div>

              <div className="rl-status-row">
                {STATUS_ORDER.map((s) => {
                  if (s === "uptodate") return null;

                  let isBtnActive = entry?.status === s;
                  let btnLabel = STATUS_LABELS[s];

                  if (s === "completed" && entry?.status === "uptodate") {
                    isBtnActive = true;
                    btnLabel = "Up to Date";
                  }

                  return (
                    <button key={s} className={`rl-status-btn ${isBtnActive ? "rl-status-btn-active" : ""}`} onClick={() => onStatus(detail, s)}>
                      {btnLabel}
                    </button>

                  )
                })}
                {entry && <button className="rl-status-btn rl-status-remove" onClick={() => onRemove(detail)} aria-label="Remove"><Trash2 size={14} /></button>}
              </div>

              <div className="rl-rate-row">
                <span>Your rating</span>
                <StarRating value={entry?.rating} onChange={(r) => onRate(detail, r)} />
              </div>

              {/* Clean Navigation Tabs for TV Shows */}
              {isTv && (
                <div style={{ display: "flex", gap: "24px", borderBottom: "1px solid var(--rl-border)", marginBottom: "20px" }}>
                  <button
                    style={{ background: "none", border: "none", fontSize: "14px", fontWeight: "600", color: viewMode === "info" ? "var(--rl-text)" : "#8a7d6f", padding: "0 0 10px 0", cursor: "pointer", borderBottom: viewMode === "info" ? "2px solid var(--rl-burnt)" : "2px solid transparent", marginBottom: "-1px", transition: "all 0.2s" }}
                    onClick={() => setViewMode("info")}
                  >
                    Overview
                  </button>
                  <button
                    style={{ background: "none", border: "none", fontSize: "14px", fontWeight: "600", color: viewMode === "episodes" ? "var(--rl-text)" : "#8a7d6f", padding: "0 0 10px 0", cursor: "pointer", borderBottom: viewMode === "episodes" ? "2px solid var(--rl-burnt)" : "2px solid transparent", marginBottom: "-1px", transition: "all 0.2s" }}
                    onClick={() => setViewMode("episodes")}
                  >
                    Episodes
                  </button>
                </div>
              )}

              {/* DETAILS VIEW */}
              {(!isTv || viewMode === "info") && (
                <>
                  <p className="rl-overview">{detail.overview || "No overview available."}</p>

                  {detail.credits?.cast?.length > 0 && (
                    <div className="rl-cast">
                      <h3>Cast {!isTv && <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--rl-text)' }}>(Click to vote)</span>}</h3>
                      <div className="rl-cast-row">
                        {detail.credits.cast.slice(0, 8).map((c) => {
                          const isSelected = !isTv && entry?.favCharacters?.[detail.id] === c.name;

                          return (
                            <div
                              key={c.id}
                              className={`rl-cast-item ${isSelected ? 'rl-cast-selected' : ''}`}
                              style={{
                                cursor: !isTv ? 'pointer' : 'default',
                                opacity: isSelected ? 1 : 0.6,
                                transition: 'all 0.2s'
                              }}
                              onClick={() => {
                                if (!isTv) {
                                  const newValue = isSelected ? "" : c.name;
                                  onEpisodeUpdate(detail, detail.id, { favCharacter: newValue });
                                }
                              }}
                            >
                              {c.profile_path ? (
                                <img src={img(c.profile_path, "w185")} alt={c.name} />
                              ) : (
                                <div className="rl-cast-empty"><User size={20} /></div>
                              )}
                              <div className="rl-cast-name">{c.name}</div>
                              <div className="rl-cast-role">{c.character}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: '16px', padding: '16px', background: 'var(--rl-beige)', borderRadius: '12px' }}>
                    <h4 style={{ fontSize: '13px', marginBottom: '10px', marginTop: '0' }}>Add to a custom list</h4>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {Object.values(customLists)
                        .filter(list => (list.name !== "Favourites" && list.name !== "On Hold"))
                        .map(list => {
                          const inList = list.items.some(i => keyFor(i) === keyFor(selected));
                          return (
                            <button key={list.id} className={`rl-pill ${inList ? 'rl-status-btn-active' : ''}`} onClick={() => toggleItemInList(list.id, selected)}>
                              {list.name}
                            </button>
                          );
                        })}
                      <button className="rl-btn rl-btn-ghost" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => setListPrompt(true)}>+</button>
                    </div>
                  </div>

                  <div className="rl-note-block">
                    <span>Your notes</span>
                    <textarea
                      className="rl-textarea"
                      placeholder="Private notes or a quick review…"
                      defaultValue={entry?.note || ""}
                      onBlur={(e) => onNote(detail, e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* EPISODES VIEW */}
              {(isTv && viewMode === "episodes") && (
                <div className="rl-tv-panel" style={{ position: "relative", marginBottom: "0" }}>
                  <div className="rl-season-tabs">
                    {(detail.seasons || []).filter(s => s.season_number > 0).map((s) => (
                      <button
                        key={s.id}
                        className={`rl-season-tab ${activeSeason === s.season_number ? "rl-season-tab-active" : ""}`}
                        onClick={() => setActiveSeason(s.season_number)}
                      >
                        Season {s.season_number}
                      </button>
                    ))}
                  </div>

                  <div className="rl-episode-list">
                    {seasonLoading ? (
                      <div style={{ padding: "20px", textAlign: "center", color: "#8a7d6f" }}>
                        <Loader2 className="rl-spin" size={20} style={{ margin: "0 auto" }} />
                      </div>
                    ) : seasonData?.episodes ? (
                      seasonData.episodes.map((ep) => {
                        const epKey = `${activeSeason}-${ep.episode_number}`;
                        const isWatched = (entry?.watchedEpisodes || []).includes(epKey);
                        return (
                          <div
                            key={ep.id}
                            className={`rl-ep-card ${isWatched ? "rl-ep-watched" : ""}`}
                          >
                            {/* Left side: Content (Click this to open info) */}
                            <div className="rl-ep-content" onClick={() => setBulkPrompt({ type: 'info', ep })}>
                              <div className="rl-ep-img-wrap">
                                {ep.still_path ? (
                                  <img src={img(ep.still_path, "w300")} alt={ep.name} className="rl-ep-img" loading="lazy" />
                                ) : (
                                  <div className="rl-ep-img-fallback"><Tv size={24} strokeWidth={1.5} /></div>
                                )}
                              </div>
                              <div className="rl-ep-info">
                                <div className="rl-ep-header">
                                  <span className="rl-ep-num">{ep.episode_number}</span>
                                  <span className="rl-ep-title">{ep.name}</span>
                                </div>
                                <div className="rl-ep-meta">{ep.runtime ? `${ep.runtime}m` : "—"}</div>
                              </div>
                            </div>

                            {/* Right side: Checkbox */}
                            <div className={`rl-ep-check-right ${isWatched ? "rl-checked" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();

                                if (!isWatched) {
                                  const hasUnwatchedPrevious = (detail.seasons || []).some(season => {
                                    if (activeSeason === 1 && ep.episode_number === 1) {
                                      onToggleEpisode(detail, activeSeason, ep.episode_number, true);
                                      return;
                                    }

                                    if (season.season_number > activeSeason) return false;

                                    const isCurrentSeason = season.season_number === activeSeason;

                                    for (let i = 1; i <= season.episode_count; i++) {
                                      if (isCurrentSeason && i >= ep.episode_number) break;

                                      const epKey = `${season.season_number}-${i}`;
                                      if (!(entry?.watchedEpisodes || []).includes(epKey)) {
                                        return true;
                                      }
                                    }
                                    return false;
                                  });

                                  if (hasUnwatchedPrevious) {
                                    setBulkPrompt({ type: 'mark', season: activeSeason, episode: ep.episode_number });
                                  } else {
                                    onToggleEpisode(detail, activeSeason, ep.episode_number, true);
                                  }
                                } else {
                                  onToggleEpisode(detail, activeSeason, ep.episode_number, false);
                                }
                              }}>
                              {isWatched && <Check size={16} strokeWidth={3} />}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rl-empty">No episodes found.</div>
                    )}
                  </div>

                  {/* Bulk Mark Prompt */}
                  {bulkPrompt?.type === 'mark' && (
                    <div className="rl-bulk-overlay">
                      <div className="rl-bulk-box">
                        <h4 style={{ margin: "0 0 8px 0", fontSize: "15px", color: "var(--rl-text)" }}>Mark previous episodes?</h4>
                        <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#6a5f55", lineHeight: "1.4" }}>
                          You are checking off <strong>Season {bulkPrompt.season}, Episode {bulkPrompt.episode}</strong>. Do you want to mark all preceding episodes in this series as watched too?
                        </p>
                        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                          <button className="rl-btn rl-btn-ghost" style={{ padding: "8px 14px", fontSize: "13px" }} onClick={() => {
                            onToggleEpisode(detail, bulkPrompt.season, bulkPrompt.episode, true);
                            setBulkPrompt(null);
                          }}>Just this one</button>
                          <button className="rl-btn rl-btn-primary" style={{ padding: "8px 14px", fontSize: "13px" }} onClick={() => {
                            onBulkMark(detail, bulkPrompt.season, bulkPrompt.episode);
                            setBulkPrompt(null);
                          }}>Mark all previous</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Episode Info & Rating Prompt */}
                  {bulkPrompt?.type === 'info' && (
                    <div className="rl-modal-backdrop" onClick={() => setBulkPrompt(null)}>
                      <div className="rl-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <button className="rl-modal-close" style={{ color: 'var(--rl-text)' }} onClick={() => setBulkPrompt(null)}><X size={18} /></button>

                        {/* Banner */}
                        {bulkPrompt.ep.still_path && (
                          <div className="rl-modal-backdrop-img" style={{ backgroundImage: `url(${img(bulkPrompt.ep.still_path, "w1280")})` }} />
                        )}

                        <div className="rl-modal-body">
                          <h3>{bulkPrompt.ep.name}</h3>
                          <p style={{ margin: '16px 0', fontSize: '14px', lineHeight: '1.6' }}>{bulkPrompt.ep.overview || "No description."}</p>

                          {/* Rating Section */}
                          <div className="rl-rate-row" style={{ marginTop: '20px' }}>
                            <span>Episode Rating</span>
                            <StarRating
                              value={entry?.episodeRatings?.[bulkPrompt.ep.id] || 0}
                              onChange={(r) => {
                                onEpisodeUpdate(detail, bulkPrompt.ep.id, { rating: r });
                                setBulkPrompt(prev => ({ ...prev }));
                              }}
                            />
                          </div>

                          {/* Visual Favorite Character Section */}
                          <div className="rl-note-block" style={{ marginTop: '24px' }}>
                            <h3>Cast <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(rl--text)' }}>(Click to vote)</span></h3>

                            {(bulkPrompt.ep.guest_stars?.length > 0 || seasonData?.credits?.cast?.length > 0) ? (
                              <div className="rl-cast-row" style={{ paddingTop: '10px', paddingBottom: '16px' }}>
                                {Array.from(new Map([...(seasonData?.credits?.cast || []), ...(bulkPrompt.ep.guest_stars || [])].map(c => [c.id, c])).values())
                                  .slice(0, 12)
                                  .map((c) => {
                                    const isSelected = entry?.favCharacters?.[bulkPrompt.ep.id] === c.name;
                                    return (
                                      <div
                                        key={c.id}
                                        className={`rl-cast-item ${isSelected ? 'rl-cast-selected' : ''}`}
                                        style={{ cursor: 'pointer', opacity: isSelected ? 1 : 0.6, transition: 'all 0.2s' }}
                                        onClick={() => {
                                          const newValue = isSelected ? "" : c.name;
                                          onEpisodeUpdate(detail, bulkPrompt.ep.id, { favCharacter: newValue });
                                          setBulkPrompt(prev => ({ ...prev }));
                                        }}
                                      >
                                        <div style={{ position: 'relative', display: 'inline-block' }}>
                                          {c.profile_path ? (
                                            <img src={img(c.profile_path, "w185")} alt={c.name} />
                                          ) : (
                                            <div className="rl-cast-empty"><User size={20} /></div>
                                          )}
                                        </div>
                                        <div className="rl-cast-name">{c.name}</div>
                                        <div className="rl-cast-role">{c.character}</div>
                                      </div>
                                    );
                                  })
                                }
                              </div>
                            ) : (
                              <div className="rl-empty" style={{ padding: '20px 0' }}>No cast data available for this episode.</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
        {!loading && (!detail || detail.error) && <div className="rl-modal-loading">Couldn't load details. Please try again.</div>}
      </div>

      {listPrompt && (
        <div
          className="rl-bulk-overlay"
          style={{ position: 'fixed', zIndex: 60 }}
          onClick={(e) => {
            e.stopPropagation();
            setListPrompt(false);
            setListName("");
          }}
        >
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
              placeholder="List name..."
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
      )}
    </div >
  );
}

export default DetailPanel;
