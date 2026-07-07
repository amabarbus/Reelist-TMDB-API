import { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from "react";
import {
  Home, Compass, Bookmark, User, Search as SearchIcon, Star,
  X, Check, Film, Tv, Loader2, KeyRound, AlertCircle, Clock,
  Calendar, Trash2, Play, LayoutGrid, List,
  Pause, Bell
} from "lucide-react";

import "./lib/applyTheme.js";
import "./style.css";

import { TMDB, img, STATUS_LABELS, STATUS_ORDER, GENRE_PALETTE, APP_THEMES, getBadges } from "./lib/constants.js";
import { titleOf, keyFor, yearOf } from "./lib/format.js";

import HomeView from "./views/HomeView.jsx";
import ExploreView from "./views/ExploreView.jsx";
import WatchlistView from "./views/WatchlistView.jsx";
import ProfileView from "./views/ProfileView.jsx";
import CategoryView from "./views/CategoryView.jsx";
import DetailPanel from "./components/DetailPanel.jsx";
import EditProfileModal from "./components/EditProfileModal.jsx";

function ReelistApp() {

  const [showEditModal, setShowEditModal] = useState(false);

  const [apiKey, setApiKey] = useState(import.meta.env.VITE_TMDB_API_KEY);

  const [profile, setProfile] = useState(() => {
    try {
      const saved = window.localStorage.getItem("user-profile");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.username) parsed.username = "User";
        return parsed;
      }
    } catch (e) { }
    return {
      name: "Movie Enthusiast",
      username: "enthusiast123",
      bio: "Tracking my cinematic journey...",
      theme: "warm-cream",
      memberSince: new Date().toISOString()
    };
  });

  const updateProfile = (updates) => {
    const nextProfile = { ...profile, ...updates };
    setProfile(nextProfile);
    window.localStorage.setItem("user-profile", JSON.stringify(nextProfile));

    if (updates.theme) {
      document.documentElement.setAttribute('data-theme', updates.theme);
    }
  };

  const activeTheme = APP_THEMES[profile?.theme] || APP_THEMES['warm-cream'];

  const [tracked, setTracked] = useState(() => {
    const saved = window.localStorage.getItem("tracked-items");
    return saved ? JSON.parse(saved) : {};
  });

  const [activeDays, setActiveDays] = useState(() => {
    return JSON.parse(window.localStorage.getItem("rl-active-days") || "[]");
  });

  const recordActivity = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    setActiveDays(prev => {
      if (prev.includes(today)) return prev;
      const next = [...prev, today].sort();
      window.localStorage.setItem("rl-active-days", JSON.stringify(next));
      return next;
    });
  }, []);

  const [view, setView] = useState(() => {
    return window.localStorage.getItem("rl-app-view") || "home";
  });
  const [categoryConfig, setCategoryConfig] = useState(null);

  const [trending, setTrending] = useState([]);
  const [popMovies, setPopMovies] = useState([]);
  const [popTv, setPopTv] = useState([]);
  const [homeLoading, setHomeLoading] = useState(false);
  const [homeError, setHomeError] = useState("");

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [results, setResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);

  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [watchTab, setWatchTab] = useState("watching");

  const [watchlistLayout, setWatchlistLayout] = useState(() => {
    return window.localStorage.getItem("rl-watchlist-layout") || "grid";
  });

  const [customLists, setCustomLists] = useState(() => {
    const saved = window.localStorage.getItem("custom-lists");
    const parsed = saved ? JSON.parse(saved) : {};
    if (!Object.values(parsed).some(l => l.name === "Favourites")) {
      const favId = Date.now().toString();
      parsed[favId] = { id: favId, name: "Favourites", items: [] };
    }
    return parsed;
  });

  useEffect(() => {
    window.localStorage.setItem("rl-app-view", view);
  }, [view]);

  useEffect(() => {
    const hasFavs = Object.values(customLists).some(l => l.name === "Favourites");
    if (!hasFavs) {
      addList("Favourites");
    }
  }, []);

  const favList = useMemo(() => {
    const lists = customLists || {};
    return Object.values(lists).find(l => l.name === "Favourites") || { items: [] };
  }, [customLists]);
  const favListId = favList.id;

  function addList(name) {
    const newListId = Date.now().toString();
    const nextLists = { ...customLists, [newListId]: { id: newListId, name, items: [] } };
    setCustomLists(nextLists);
    window.localStorage.setItem("custom-lists", JSON.stringify(nextLists));
  }

  function removeList(listId) {
    setCustomLists(prev => {
      const next = { ...prev };
      delete next[listId];
      window.localStorage.setItem("custom-lists", JSON.stringify(next));
      return next;
    });
  }

  function toggleItemInList(listId, item) {

    const targetListId = listId || Object.values(customLists).find(l => l.name === "Favourites")?.id;

    if (!targetListId) {
      console.error("Favourites list not found!");
      return;
    }

    const k = keyFor(item);

    const list = customLists[listId] || { items: [] };
    const itemExists = list.items.some(i => keyFor(i) === k);

    const newItems = itemExists
      ? list.items.filter(i => keyFor(i) !== k)
      : [...list.items, item];

    const nextLists = { ...customLists, [listId]: { ...list, items: newItems } };
    setCustomLists(nextLists);
    window.localStorage.setItem("custom-lists", JSON.stringify(nextLists));

    if (!itemExists && !tracked[k]) {
      handleStatus(item, "planned");
    }
  }

  useEffect(() => {
    window.localStorage.setItem("tracked-items", JSON.stringify(tracked));
  }, [tracked]);

  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = window.localStorage.getItem("rl-notifications");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    window.localStorage.setItem("rl-notifications", JSON.stringify(notifications));
  }, [notifications]);

  const [showNotifs, setShowNotifs] = useState(false);

  const addNotification = useCallback((title, message) => {
    setNotifications(prev => {
      const exists = prev.some(n => n.title === title && n.message === message);
      if (exists) return prev;

      const newId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      return [{ id: newId, title, message, read: false }, ...prev].slice(0, 20);
    });
  }, []);

  const [notifiedBadges, setNotifiedBadges] = useState(() => {
    return JSON.parse(window.localStorage.getItem("rl-notified-badges") || "[]");
  });

  const tmdb = useCallback(async (path, params = {}) => {
    const url = new URL(TMDB + path);
    url.searchParams.set("api_key", apiKey);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(res.status === 401 ? "INVALID_KEY" : "REQUEST_FAILED");
    return res.json();
  }, [apiKey]);

  const loadHome = useCallback(async () => {
    setHomeLoading(true);
    setHomeError("");
    try {
      const [tr, pm, pt] = await Promise.all([
        tmdb("/trending/all/week"),
        tmdb("/movie/popular"),
        tmdb("/tv/popular"),
      ]);
      setTrending((tr.results || []).filter((r) => r.media_type !== "person").slice(0, 18));
      setPopMovies((pm.results || []).map((r) => ({ ...r, media_type: "movie" })).slice(0, 18));
      setPopTv((pt.results || []).map((r) => ({ ...r, media_type: "tv" })).slice(0, 18));
    } catch (e) {
      if (e.message === "INVALID_KEY") {
        setHomeError("Your API key was rejected. Please reconnect.");
        window.localStorage.removeItem("tmdb-api-key");
        setApiKey(null);
      } else {
        setHomeError("Couldn't load trending titles right now.");
      }
    } finally {
      setHomeLoading(false);
    }
  }, [tmdb]);

  useEffect(() => { if (apiKey) loadHome(); }, [apiKey, loadHome]);

  async function runSearch(q, saveHistory = false) {
    if (!q.trim()) { setResults(null); return; }
    setSearchLoading(true);
    try {
      const data = await tmdb("/search/multi", { query: q });
      setResults((data.results || []).filter((r) => r.media_type === "movie" || r.media_type === "tv"));

      if (saveHistory) {
        setRecentSearches(prev => {
          const cleaned = prev.filter(item => item.toLowerCase() !== q.trim().toLowerCase());
          const next = [q.trim(), ...cleaned].slice(0, 8);
          try { window.localStorage.setItem("recent-searches", JSON.stringify(next)); } catch (e) { }
          return next;
        });
      }
    } catch (e) {
      setResults([]);
    } finally {
      setSearchLoading(false);
    }
  }

  function removeRecentSearch(q) {
    setRecentSearches(prev => {
      const next = prev.filter(item => item !== q);
      try { window.localStorage.setItem("recent-searches", JSON.stringify(next)); } catch (e) { }
      return next;
    });
  }

  function handleSeeAll(title, endpoint, mediaType) {
    setCategoryConfig({ title, endpoint, mediaType });
    setView("category");
    window.scrollTo(0, 0);
  }

  async function openDetail(item) {
    setSelected(item);
    setDetail(null);
    setDetailLoading(true);
    try {
      const data = await tmdb(`/${item.media_type}/${item.id}`, { append_to_response: "credits" });
      setDetail({ ...data, media_type: item.media_type });
    } catch (e) {
      setDetail({ error: true });
    } finally {
      setDetailLoading(false);
    }
  }

  function persistTracked(next) {
    setTracked(next);
    try { window.localStorage.setItem("tracked-items", JSON.stringify(next)); } catch (e) { }
  }

  function handleSilentUpdate(item, updates) {
    const k = keyFor(item);

    setTracked(prevTracked => {
      if (!prevTracked[k]) return prevTracked;

      const nextState = {
        ...prevTracked,
        [k]: { ...prevTracked[k], ...updates }
      };

      try { window.localStorage.setItem("tracked-items", JSON.stringify(nextState)); } catch (e) { }

      return nextState;
    });
  }

  function handleStatus(item, status) {
    const k = keyFor(item);
    const existing = tracked[k];

    let newWatchedEps = existing?.watchedEpisodes || [];

    let targetStatus = status;
    if (targetStatus === "completed" && item.media_type === "tv") {
      if (item.status !== "Ended" && item.status !== "Canceled") {
        targetStatus = "uptodate";
      }
    }

    if ((targetStatus === "completed" || targetStatus === "uptodate") && item.media_type === "tv" && item.seasons) {
      const eps = new Set(newWatchedEps);
      item.seasons.forEach(season => {
        if (season.season_number > 0) {
          for (let e = 1; e <= season.episode_count; e++) {
            eps.add(`${season.season_number}-${e}`);
          }
        }
      });
      newWatchedEps = Array.from(eps);
    }

    const nextEntry = {
      id: item.id,
      media_type: item.media_type,
      title: titleOf(item),
      poster_path: item.poster_path,
      genres: (item.genres || []).map((g) => g.name),
      status: targetStatus,
      rating: existing?.rating ?? null,
      note: existing?.note ?? "",
      addedAt: existing?.addedAt || Date.now(),
      watchedEpisodes: newWatchedEps,
      number_of_episodes: item.number_of_episodes,
      release_date: item.release_date,
      first_air_date: item.first_air_date
    };

    recordActivity();
    persistTracked({ ...tracked, [k]: nextEntry });
  }

  useEffect(() => {
    const hasOnHold = Object.values(customLists).some(l => l.name === "On Hold");
    if (!hasOnHold) {
      addList("On Hold");
    }
  }, []);

  function handleRemove(item) {
    const k = keyFor(item);
    const next = { ...tracked };
    delete next[k];
    persistTracked(next);
  }

  function handleRate(item, rating) {
    const k = keyFor(item);
    const existing = tracked[k];
    const base = existing || {
      id: item.id, media_type: item.media_type, title: titleOf(item),
      poster_path: item.poster_path, genres: (item.genres || []).map((g) => g.name),
      status: "completed", note: "", addedAt: Date.now(),
    };
    persistTracked({ ...tracked, [k]: { ...base, rating, ratedAt: Date.now() } });
  }

  function handleNote(item, note) {
    const k = keyFor(item);
    if (!tracked[k]) return;
    persistTracked({ ...tracked, [k]: { ...tracked[k], note } });
  }

  function handleToggleEpisode(item, seasonNum, episodeNum, isWatched) {
    const k = keyFor(item);
    const existing = tracked[k];

    const base = existing || {
      id: item.id, media_type: item.media_type, title: titleOf(item),
      poster_path: item.poster_path, genres: (item.genres || []).map((g) => g.name),
      status: "planned",
      note: "", addedAt: Date.now(), watchedEpisodes: [],
      number_of_episodes: item.number_of_episodes,
    };

    const eps = new Set(base.watchedEpisodes || []);
    const epKey = `${seasonNum}-${episodeNum}`;
    if (isWatched) eps.add(epKey);
    else eps.delete(epKey);

    let newStatus = base.status;
    if (isWatched) {
      newStatus = "watching";
    }

    if (item.media_type === "tv" && item.number_of_episodes && eps.size >= item.number_of_episodes) {
      newStatus = (item.status === "Ended" || item.status === "Canceled") ? "completed" : "uptodate";
    }

    const updatedEntry = {
      ...base,
      status: newStatus,
      watchedEpisodes: Array.from(eps),
      number_of_episodes: item.number_of_episodes,
    };

    if (isWatched) recordActivity();
    persistTracked({ ...tracked, [k]: updatedEntry });
  }

  function handleBulkMarkEpisodes(item, upToSeason, upToEpisode) {
    const k = keyFor(item);
    const existing = tracked[k];
    const base = existing || {
      id: item.id, media_type: item.media_type, title: titleOf(item),
      poster_path: item.poster_path, genres: (item.genres || []).map((g) => g.name),
      status: "planned", note: "", addedAt: Date.now(), watchedEpisodes: [],
      number_of_episodes: item.number_of_episodes,
    };

    const eps = new Set(base.watchedEpisodes || []);

    (item.seasons || []).filter(s => s.season_number > 0 && s.season_number <= upToSeason).forEach(season => {
      const maxEp = season.season_number === upToSeason ? upToEpisode : season.episode_count;
      for (let e = 1; e <= maxEp; e++) {
        eps.add(`${season.season_number}-${e}`);
      }
    });

    let newStatus = "watching";

    if (item.media_type === "tv" && item.number_of_episodes) {
      if (eps.size >= item.number_of_episodes) {
        newStatus = (item.status === "Ended" || item.status === "Canceled") ? "completed" : "uptodate";
      }
    }

    recordActivity();
    persistTracked({ ...tracked, [k]: { ...base, watchedEpisodes: Array.from(eps), status: newStatus, number_of_episodes: item.number_of_episodes } });
  }

  function handleEpisodeUpdate(item, epId, updates) {
    const k = keyFor(item);
    const existing = tracked[k];

    const base = existing || {
      id: item.id, media_type: item.media_type, title: titleOf(item),
      poster_path: item.poster_path, genres: (item.genres || []).map((g) => g.name),
      status: "watching", note: "", addedAt: Date.now(), watchedEpisodes: []
    };

    const updatedEntry = { ...base };

    if (updates.rating !== undefined) {
      updatedEntry.episodeRatings = { ...(base.episodeRatings || {}), [epId]: updates.rating };
    }
    if (updates.favCharacter !== undefined) {
      updatedEntry.favCharacters = { ...(base.favCharacters || {}), [epId]: updates.favCharacter };
    }

    persistTracked({ ...tracked, [k]: updatedEntry });
  }

  const trackedList = useMemo(() => Object.values(tracked).sort((a, b) => b.addedAt - a.addedAt), [tracked]);
  const watchlistGroups = useMemo(() => {
    const g = { watching: [], uptodate: [], planned: [], completed: [] };
    trackedList.forEach((t) => { (g[t.status] || (g[t.status] = [])).push(t); });
    return g;
  }, [trackedList]);

  const stats = useMemo(() => {
    const completed = trackedList.filter((t) => t.status === "completed" || t.status === "uptodate");
    const movies = completed.filter((t) => t.media_type === "movie");
    const shows = completed.filter((t) => t.media_type === "tv");


    const movieMinutes = movies.reduce((sum, m) => sum + (m.runtime || 120), 0);

    let totalEpisodes = 0;
    const showMinutes = trackedList.reduce((sum, t) => {
      if (t.media_type !== "tv" || !t.watchedEpisodes) return sum;
      totalEpisodes += t.watchedEpisodes.length;
      return sum + (t.watchedEpisodes.length * 42);
    }, 0);

    const rated = trackedList.filter((t) => t.rating);
    const avg = rated.length ? rated.reduce((s, t) => s + t.rating, 0) / rated.length : 0;

    const genreCount = {};
    completed.forEach((t) => (t.genres || []).forEach((g) => { genreCount[g] = (genreCount[g] || 0) + 1; }));
    const genreData = Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }));

    let longestStreak = 0;
    let currentStreak = 0;

    if (activeDays.length > 0) {
      let tempStreak = 1;
      longestStreak = 1;

      for (let i = 1; i < activeDays.length; i++) {
        const prev = new Date(activeDays[i - 1]);
        const curr = new Date(activeDays[i]);
        const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) tempStreak++;
        else if (diffDays > 1) tempStreak = 1;

        if (tempStreak > longestStreak) longestStreak = tempStreak;
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const yesterdayObj = new Date();
      yesterdayObj.setDate(yesterdayObj.getDate() - 1);
      const yesterdayStr = yesterdayObj.toISOString().split('T')[0];

      if (activeDays.includes(todayStr) || activeDays.includes(yesterdayStr)) {
        currentStreak = 1;
        let checkDate = new Date(activeDays.includes(todayStr) ? todayStr : yesterdayStr);
        while (true) {
          checkDate.setDate(checkDate.getDate() - 1);
          if (activeDays.includes(checkDate.toISOString().split('T')[0])) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }

    return {
      movies: movies.length,
      shows: shows.length,
      avg,
      genreData,
      watchlistCount: watchlistGroups.planned.length,
      movieMinutes,
      showMinutes,
      totalMinutes: movieMinutes + showMinutes,
      totalEpisodes,
      streaks: { current: currentStreak, longest: longestStreak }
    };
  }, [trackedList, watchlistGroups, activeDays]);

  useEffect(() => {
    const badges = getBadges(stats);
    badges.forEach(badge => {
      if (badge.condition && !notifiedBadges.includes(badge.id)) {
        addNotification("New Badge Unlocked! 🏆", `You earned the ${badge.label} badge.`);

        const updated = [...notifiedBadges, badge.id];
        setNotifiedBadges(updated);
        window.localStorage.setItem("rl-notified-badges", JSON.stringify(updated));
      }
    });
  }, [stats, notifiedBadges]);

  if (!apiKey) {
    return (
      <div className="rl-app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center', padding: '20px' }}>
        <div style={{ background: 'var(--rl-cream)', padding: '30px', borderRadius: '16px', border: '1px solid var(--rl-border)' }}>
          <h2 style={{ color: '#a8452b', marginBottom: '10px' }}>API Key Missing</h2>
          <p>Vite cannot find your <strong>VITE_TMDB_API_KEY</strong>.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rl-app" style={{
      '--rl-beige': activeTheme.beige,
      '--rl-cream': activeTheme.cream,
      '--rl-border': activeTheme.border,
      '--rl-text': activeTheme.text,
      '--rl-bg': activeTheme.bg,
    }}>
      <header className="rl-nav">
        <div className="rl-nav-inner">
          <div
            className="rl-nav-logo"
            onClick={() => {
              setView("home");
              window.scrollTo(0, 0);
            }}
            style={{ cursor: "pointer" }}
          >
            <span className="rl-logo-mark"><span className="rl-logo-dot rl-logo-dot-a" /><span className="rl-logo-dot rl-logo-dot-b" /></span>
            Reelist
          </div>
          <nav className="rl-nav-tabs">
            <button className={`rl-nav-tab ${view === "home" ? "rl-nav-tab-active" : ""}`} onClick={() => setView("home")}><Home size={16} /><span>Home</span></button>
            <button className={`rl-nav-tab ${view === "explore" ? "rl-nav-tab-active" : ""}`} onClick={() => setView("explore")}><Compass size={16} /><span>Explore</span></button>
            <button className={`rl-nav-tab ${view === "watchlist" ? "rl-nav-tab-active" : ""}`} onClick={() => setView("watchlist")}><Bookmark size={16} /><span>Watchlist</span></button>
            <button className={`rl-nav-tab ${view === "profile" ? "rl-nav-tab-active" : ""}`} onClick={() => setView("profile")}><User size={16} /><span>Profile</span></button>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <button className="rl-nav-tab" onClick={() => {
                setShowNotifs(!showNotifs);
                if (!showNotifs) {
                  setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                }
              }}>
                <Bell size={16} />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span style={{ width: '6px', height: '6px', background: 'var(--rl-burnt)', borderRadius: '50%', position: 'absolute', top: '8px', right: '8px' }} />
                )}
              </button>

              {showNotifs && (
                <div style={{ position: 'absolute', top: '50px', right: '0', width: '280px', background: 'var(--rl-cream)', border: '1px solid var(--rl-border)', borderRadius: '12px', zIndex: 100, padding: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ margin: 0, fontSize: '14px' }}>Notifications</h4>
                    {notifications.length > 0 && (
                      <button
                        onClick={() => setNotifications([])}
                        style={{ background: 'none', border: 'none', fontSize: '11px', color: '#a8452b', cursor: 'pointer', fontWeight: '600' }}
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? <p style={{ fontSize: '12px', color: '#8a7d6f' }}>No new updates.</p> :
                    notifications.map(n => (
                      <div
                        key={n.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 0',
                          borderBottom: '1px solid var(--rl-border)',
                          fontSize: '13px'
                        }}
                      >
                        <div style={{ flex: 1, paddingRight: '12px' }}>
                          <div style={{ fontWeight: 600 }}>{n.title}</div>
                          <div style={{ color: '#6a5f55' }}>{n.message}</div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setNotifications(prev => prev.filter(item => item.id !== n.id));
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#8a7d6f',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          aria-label="Remove notification"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          </nav>
        </div>
      </header>

      <main className="rl-main">
        {view === "home" && (
          <HomeView
            trending={trending}
            popMovies={popMovies}
            popTv={popTv}
            loading={homeLoading}
            error={homeError}
            onRetry={loadHome}
            tracked={tracked}
            onOpen={openDetail}
            onSeeAll={handleSeeAll}
            onSave={handleStatus}
            tmdb={tmdb}
            favourites={favList.items}
            onToggleFavourite={(item) => toggleItemInList(favListId, item)}
            favourites={favList.items} />
        )}
        {view === "category" && categoryConfig && (
          <CategoryView
            config={categoryConfig}
            tmdb={tmdb}
            tracked={tracked}
            onOpen={openDetail}
            onBack={() => setView("home")}
            onToggleFavourite={(item) => toggleItemInList(favListId, item)}
            favourites={favList.items} />
        )}
        {view === "explore" && (
          <ExploreView
            query={query} setQuery={setQuery} onSearch={runSearch}
            results={results} loading={searchLoading}
            typeFilter={typeFilter} setTypeFilter={setTypeFilter}
            tracked={tracked} onOpen={openDetail}
            recentSearches={recentSearches} removeRecentSearch={removeRecentSearch}
            onToggleFavourite={(item) => toggleItemInList(favListId, item)}
            favourites={favList.items}
          />
        )}
        {view === "watchlist" && (
          <WatchlistView
            groups={watchlistGroups}
            tab={watchTab}
            setTab={setWatchTab}
            onOpen={openDetail}
            tmdb={tmdb}
            onSilentUpdate={handleSilentUpdate}
            layout={watchlistLayout}
            setLayout={(l) => {
              setWatchlistLayout(l);
              window.localStorage.setItem("rl-watchlist-layout", l);
            }}
            customLists={customLists}
            tracked={tracked}
            hideText={false}
            addList={addList}
            removeList={removeList}
            onToggleFavourite={(item) => toggleItemInList(favListId, item)}
            favourites={Object.values(customLists).find(l => l.name === "Favourites")?.items || []}
            notifications={notifications}
          />
        )}
        {view === "profile" && (
          <ProfileView
            stats={stats}
            tracked={trackedList}
            onOpen={openDetail}
            onToggleFavourite={(item) => toggleItemInList(favListId, item)}
            favourites={favList.items}
            profile={profile}
            onEdit={() => setShowEditModal(true)}
            onUpdateTheme={(theme) => updateProfile({ theme })}
          />
        )}
        {showEditModal && (
          <EditProfileModal
            profile={profile}
            onSave={updateProfile}
            onClose={() => setShowEditModal(false)}
          />
        )}
      </main>

      <DetailPanel
        selected={selected} detail={detail} loading={detailLoading} tracked={tracked} tmdb={tmdb}
        onClose={() => setSelected(null)} onStatus={handleStatus} onRate={handleRate}
        onNote={handleNote} onRemove={handleRemove} onToggleEpisode={handleToggleEpisode}
        onBulkMark={handleBulkMarkEpisodes}
        onEpisodeUpdate={handleEpisodeUpdate}
        customLists={customLists}
        toggleItemInList={toggleItemInList}
        addList={addList}
      />
    </div>
  );
}

export default ReelistApp;
