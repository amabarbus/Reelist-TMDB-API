import { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from "react";
import { Home, Compass, Bookmark, User, Search as SearchIcon, Star, X, Check, Film, Tv, Loader2, KeyRound, AlertCircle, Clock, Calendar, Trash2, Play, LayoutGrid, List, Pause, Bell, LogOut } from "lucide-react";

import "./lib/applyTheme.js";
import "./style.css";
import { TMDB, img, STATUS_LABELS, STATUS_ORDER, GENRE_PALETTE, APP_THEMES, getBadges } from "./lib/constants.js";
import { titleOf, keyFor, yearOf } from "./lib/format.js";

import Login from "./views/Login.jsx";
import HomeView from "./views/HomeView.jsx";
import ExploreView from "./views/ExploreView.jsx";
import WatchlistView from "./views/WatchlistView.jsx";
import ProfileView from "./views/ProfileView.jsx";
import CategoryView from "./views/CategoryView.jsx";
import DetailPanel from "./components/DetailPanel.jsx";
import EditProfileModal from "./components/EditProfileModal.jsx";
import PublicProfileView from "./views/PublicProfileView.jsx";

function MainApp({ onLogout }) {

  const [showEditModal, setShowEditModal] = useState(false);

  const [apiKey, setApiKey] = useState(import.meta.env.VITE_TMDB_API_KEY);

  const [profile, setProfile] = useState(() => {
    let authUser = null;
    try {
      const savedUser = window.localStorage.getItem('reelist_user') || window.sessionStorage.getItem('reelist_user');
      if (savedUser) authUser = JSON.parse(savedUser);
    } catch (e) { }

    let savedProfile = null;
    try {
      const saved = window.localStorage.getItem("user-profile");
      if (saved) savedProfile = JSON.parse(saved);
    } catch (e) { }

    return {
      name: savedProfile?.name || authUser?.username || "Movie Enthusiast",
      username: authUser?.username || savedProfile?.username || "User",
      bio: savedProfile?.bio || "Tracking my cinematic journey...",
      theme: savedProfile?.theme || "warm-cream",
      memberSince: savedProfile?.memberSince || new Date().toISOString()
    };
  });

  const updateProfile = async (updates, skipDbSync = false) => {
    const nextProfile = { ...profile, ...updates };
    setProfile(nextProfile);
    window.localStorage.setItem("user-profile", JSON.stringify(nextProfile));

    if (skipDbSync) return;

    const token = localStorage.getItem('reelist_token') || sessionStorage.getItem('reelist_token');
    if (!token) return;

    if (updates.theme) {
      document.documentElement.setAttribute('data-theme', updates.theme);
      try {
        await fetch('http://localhost:3000/api/users/theme', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ theme: updates.theme })
        });
      } catch (err) { }
    }

    if (updates.name !== undefined || updates.bio !== undefined || updates.avatar !== undefined || updates.banner !== undefined || updates.isPublic !== undefined) {
      try {
        await fetch('http://localhost:3000/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            name: nextProfile.name,
            bio: nextProfile.bio,
            avatar: nextProfile.avatar || null,
            banner: typeof nextProfile.banner === 'object' ? JSON.stringify(nextProfile.banner) : nextProfile.banner || null,
            is_public: nextProfile.isPublic !== false
          })
        });
      } catch (err) { }
    }
  };

  const handleUpdateUsername = async (newUsername) => {
    const token = localStorage.getItem('reelist_token') || sessionStorage.getItem('reelist_token');

    const response = await fetch('http://localhost:3000/api/users/username', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ newUsername })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to update username.");
    }

    const storage = localStorage.getItem('reelist_token') ? localStorage : sessionStorage;

    storage.setItem('reelist_token', data.token);
    storage.setItem('reelist_user', JSON.stringify(data.user));

    setProfile(prev => ({ ...prev, username: data.user.username }));
  };

  const handleDeleteAccount = async () => {
    const token = localStorage.getItem('reelist_token') || sessionStorage.getItem('reelist_token');
    if (!token) return;

    try {
      const response = await fetch('http://localhost:3000/api/users/account', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        onLogout();
      } else {
        console.error("Failed to delete account.");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
    }
  };


  const activeTheme = APP_THEMES[profile?.theme] || APP_THEMES['warm-cream'];

  useLayoutEffect(() => {
    if (profile?.theme) {
      document.documentElement.setAttribute('data-theme', profile.theme);
    }
  }, [profile?.theme]);

  const [tracked, setTracked] = useState(() => {
    const saved = window.localStorage.getItem("tracked-items");
    return saved ? JSON.parse(saved) : {};
  });

  const [activeDays, setActiveDays] = useState(() => {
    return JSON.parse(window.localStorage.getItem("rl-active-days") || "[]");
  });

  const [streaks, setStreaks] = useState({ current: 0, longest: 0 });

  const recordActivity = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];

    setActiveDays(prev => {
      const next = prev.includes(today) ? prev : [...prev, today].sort();
      window.localStorage.setItem("rl-active-days", JSON.stringify(next));

      let currentStreak = 1;
      let longestStreak = 1;
      let tempStreak = 1;

      for (let i = 1; i < next.length; i++) {
        const prevDate = new Date(next[i - 1]);
        const currDate = new Date(next[i]);
        const diffDays = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) tempStreak++;
        else if (diffDays > 1) tempStreak = 1;
        if (tempStreak > longestStreak) longestStreak = tempStreak;
      }

      const yesterdayObj = new Date();
      yesterdayObj.setDate(yesterdayObj.getDate() - 1);
      const yesterdayStr = yesterdayObj.toISOString().split('T')[0];

      if (next.includes(today) || next.includes(yesterdayStr)) {
        currentStreak = 1;
        let checkDate = new Date(next.includes(today) ? today : yesterdayStr);
        while (true) {
          checkDate.setDate(checkDate.getDate() - 1);
          if (next.includes(checkDate.toISOString().split('T')[0])) {
            currentStreak++;
          } else break;
        }
      } else {
        currentStreak = 0;
      }

      setStreaks({ current: currentStreak, longest: longestStreak });

      const token = localStorage.getItem('reelist_token') || sessionStorage.getItem('reelist_token');
      if (token) {
        fetch('http://localhost:3000/api/activity', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            activeDays: next,
            currentStreak: currentStreak,
            longestStreak: longestStreak
          })
        }).catch(() => { });
      }
      return next;
    });
  }, []);

  const [view, setView] = useState(() => window.localStorage.getItem("rl-app-view") || "home");
  const [targetProfile, setTargetProfile] = useState(null);
  const [categoryConfig, setCategoryConfig] = useState(null);

  const handleViewProfile = useCallback((clickedUsername) => {
    if (clickedUsername === profile?.username) {
      setView("profile");
    } else {
      setTargetProfile(clickedUsername);
      setView("public-profile");
    }
    window.scrollTo(0, 0);
  }, [profile?.username]);

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

  const [isDbLoaded, setIsDbLoaded] = useState(false);
  const initialStatsRef = useRef(false);

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

    syncListCreate(name);
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
    if (!targetListId) return;

    const k = keyFor(item);
    const list = customLists[targetListId] || { items: [] };
    const itemExists = list.items.some(i => keyFor(i) === k);

    const newItems = itemExists
      ? list.items.filter(i => keyFor(i) !== k)
      : [...list.items, item];

    const nextLists = { ...customLists, [targetListId]: { ...list, items: newItems } };
    setCustomLists(nextLists);
    window.localStorage.setItem("custom-lists", JSON.stringify(nextLists));

    if (!itemExists && !tracked[k]) {
      handleStatus(item, "planned");
    }

    syncListToggle(list.name, item);
  }

  useEffect(() => {
    window.localStorage.setItem("tracked-items", JSON.stringify(tracked));
  }, [tracked]);

  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifTab, setNotifTab] = useState("social");
  const [followRequests, setFollowRequests] = useState([]);
  const [unseenRequests, setUnseenRequests] = useState(false);
  const [unreadTabs, setUnreadTabs] = useState([]);

  const getNotifCategory = (title) => {
    const t = title.toLowerCase();
    if (t.includes('badge') || t.includes('streak')) return 'activity';
    if (t.includes('episode') || t.includes('season') || t.includes('movie')) return 'releases';
    if (t.includes('like') || t.includes('comment') || t.includes('follow')) return 'social';
    return 'system';
  };

  const addNotification = useCallback(async (title, message) => {
    const token = localStorage.getItem('reelist_token') || sessionStorage.getItem('reelist_token');
    if (!token) return;

    try {
      const response = await fetch('http://localhost:3000/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title, message })
      });

      if (response.ok) {
        const newNotif = await response.json();

        setNotifications(prev => {
          const exists = prev.some(n => n.title === title && n.message === message);
          if (exists) return prev;
          return [newNotif, ...prev].slice(0, 20);
        });
      }
    } catch (e) { }
  }, []);

  const handleFollowRequest = async (followerId, action) => {
    const token = localStorage.getItem('reelist_token') || sessionStorage.getItem('reelist_token');
    try {
      await fetch(`http://localhost:3000/api/follow-requests/${followerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action })
      });
      setFollowRequests(prev => prev.filter(r => r.follower_id !== followerId));
    } catch (e) { }
  };

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

  const saveToDatabase = async (entry) => {
    const token = localStorage.getItem('reelist_token') || sessionStorage.getItem('reelist_token');
    if (!token) return;
    try {
      await fetch('http://localhost:3000/api/tracked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          tmdb_id: entry.id,
          media_type: entry.media_type,
          title: entry.title,
          poster_path: entry.poster_path,
          status: entry.status,
          rating: entry.rating,
          watched_episodes: entry.watchedEpisodes || [],
          number_of_episodes: entry.number_of_episodes,
          genres: entry.genres || [],
          runtime: entry.runtime || null,
          episode_ratings: entry.episodeRatings || {},
          fav_characters: entry.favCharacters || {},
          release_date: entry.release_date || entry.first_air_date || null
        })
      });
    } catch (err) { }
  };

  const deleteFromDatabase = async (tmdb_id, media_type) => {
    const token = localStorage.getItem('reelist_token') || sessionStorage.getItem('reelist_token');
    if (!token) return;
    try {
      await fetch(`http://localhost:3000/api/tracked/${tmdb_id}?media_type=${media_type}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) { }
  };

  const syncListCreate = async (name) => {
    const token = localStorage.getItem('reelist_token') || sessionStorage.getItem('reelist_token');
    if (!token) return;
    try {
      await fetch('http://localhost:3000/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name })
      });
    } catch (err) { }
  };

  const syncListToggle = async (listName, item) => {
    const token = localStorage.getItem('reelist_token') || sessionStorage.getItem('reelist_token');
    if (!token) return;

    setTimeout(async () => {
      try {
        await fetch('http://localhost:3000/api/lists/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ list_name: listName, tmdb_id: item.id, media_type: item.media_type })
        });
      } catch (err) { }
    }, 500);
  };

  useEffect(() => {
    const loadUserData = async () => {
      const token = localStorage.getItem('reelist_token') || sessionStorage.getItem('reelist_token');
      if (!token) return;

      try {
        const response = await fetch('http://localhost:3000/api/tracked', { headers: { 'Authorization': `Bearer ${token}` } });

        // NEW: Automatically log the user out if the token is expired/invalid!
        if (response.status === 401 || response.status === 403) {
          console.warn("Session expired. Logging out...");
          onLogout(); // This triggers the logout function passed to MainApp
          return;
        }

        if (response.ok) {
          const data = await response.json();
          const dbTracked = {};
          data.forEach(item => {
            const k = `${item.media_type}-${item.tmdb_id}`;

            const parseJSON = (val) => {
              if (!val) return [];
              if (typeof val === 'string') {
                try { return JSON.parse(val); } catch (e) { return []; }
              }
              return val;
            };

            dbTracked[k] = {
              id: item.tmdb_id,
              media_type: item.media_type,
              title: item.title,
              poster_path: item.poster_path,
              status: item.status,
              rating: item.rating,
              watchedEpisodes: parseJSON(item.watched_episodes),
              genres: parseJSON(item.genres),
              runtime: item.runtime,
              addedAt: Date.now(),
              number_of_episodes: item.number_of_episodes,
              episodeRatings: parseJSON(item.episode_ratings) || {},
              favCharacters: parseJSON(item.fav_characters) || {},
              release_date: item.release_date,
              first_air_date: item.release_date
            };
          });
          setTracked(dbTracked);
        }

        const listsResponse = await fetch('http://localhost:3000/api/lists', { headers: { 'Authorization': `Bearer ${token}` } });
        if (listsResponse.ok) {
          const { lists, items } = await listsResponse.json();
          const dbLists = {};

          lists.forEach(l => { dbLists[l.id] = { id: l.id.toString(), name: l.name, items: [] }; });
          items.forEach(item => {
            const targetListId = Object.keys(dbLists).find(key => dbLists[key].name === item.list_name);
            if (targetListId) {
              dbLists[targetListId].items.push({ id: item.tmdb_id, media_type: item.media_type, title: item.title, poster_path: item.poster_path });
            }
          });

          if (!Object.values(dbLists).some(l => l.name === "Favourites")) {
            const favId = Date.now().toString();
            dbLists[favId] = { id: favId, name: "Favourites", items: [] };
            syncListCreate("Favourites");
          }
          setCustomLists(dbLists);
        }

        const notifResponse = await fetch('http://localhost:3000/api/notifications', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (notifResponse.ok) {
          const data = await notifResponse.json();
          setNotifications(data);
        }

        const profileResponse = await fetch('http://localhost:3000/api/profile', { headers: { 'Authorization': `Bearer ${token}` } });
        if (profileResponse.ok) {
          const dbProfile = await profileResponse.json();

          if (dbProfile.active_days) {
            try {
              const parsedDays = JSON.parse(dbProfile.active_days);
              setActiveDays(parsedDays);
              window.localStorage.setItem("rl-active-days", JSON.stringify(parsedDays));
            } catch (e) { console.error("Error parsing structural active_days string", e); }
          }

          setStreaks({
            current: dbProfile.current_streak || 0,
            longest: dbProfile.longest_streak || 0
          });

          let parsedBanner = dbProfile.banner;
          if (parsedBanner && parsedBanner.startsWith('{')) {
            try { parsedBanner = JSON.parse(parsedBanner); } catch (e) { }
          }

          updateProfile({
            theme: dbProfile.theme || 'warm-cream',
            name: dbProfile.name || "Movie Enthusiast",
            bio: dbProfile.bio || "Tracking my cinematic journey...",
            avatar: dbProfile.avatar,
            banner: parsedBanner,
            isPublic: dbProfile.is_public !== false,
            followersCount: parseInt(dbProfile.followers_count) || 0,
            followingCount: parseInt(dbProfile.following_count) || 0
          }, true);

          if (dbProfile.is_public === false) {
            try {
              const reqRes = await fetch('http://localhost:3000/api/follow-requests', { headers: { 'Authorization': `Bearer ${token}` } });
              if (reqRes.ok) {
                const data = await reqRes.json();
                setFollowRequests(data);

                const hasNew = data.some(req => req.is_seen === false);
                if (hasNew) setUnseenRequests(true);
              }
            } catch (e) { }
          }
        }
        setIsDbLoaded(true);
      } catch (error) { console.error("Failed to load user data", error); }
    }
    loadUserData();
  }, []);

  function handleSilentUpdate(item, updates) {
    const k = keyFor(item);
    setTracked(prevTracked => {
      if (!prevTracked[k]) return prevTracked;
      const nextEntry = { ...prevTracked[k], ...updates };
      saveToDatabase(nextEntry);
      const nextState = { ...prevTracked, [k]: nextEntry };
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
      runtime: item.runtime,
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
    saveToDatabase(nextEntry);
    persistTracked({ ...tracked, [k]: nextEntry });
  }

  function handleRemove(item) {
    const k = keyFor(item);
    const next = { ...tracked };
    delete next[k];
    deleteFromDatabase(item.id, item.media_type);
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
    const nextEntry = { ...base, rating, ratedAt: Date.now() };
    saveToDatabase(nextEntry);
    persistTracked({ ...tracked, [k]: nextEntry });
  }

  function handleNote(item, note) {
    const k = keyFor(item);
    if (!tracked[k]) return;
    const nextEntry = { ...tracked[k], note };
    persistTracked({ ...tracked, [k]: nextEntry });
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
    if (isWatched) newStatus = "watching";

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
    saveToDatabase(updatedEntry);
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
    const nextEntry = { ...base, watchedEpisodes: Array.from(eps), status: newStatus, number_of_episodes: item.number_of_episodes };
    saveToDatabase(nextEntry);
    persistTracked({ ...tracked, [k]: nextEntry });
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

    saveToDatabase(updatedEntry);
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
      streaks: streaks
    };
  }, [trackedList, watchlistGroups, streaks]);

  useEffect(() => {
    if (!isDbLoaded) return;

    const badges = getBadges(stats);
    const earnedBadges = badges.filter(b => b.condition);

    if (!initialStatsRef.current) {
      const earnedIds = earnedBadges.map(b => b.id);
      setNotifiedBadges(earnedIds);
      try { window.localStorage.setItem("rl-notified-badges", JSON.stringify(earnedIds)); } catch (e) { }
      initialStatsRef.current = true;
      return;
    }

    const newlyUnlocked = earnedBadges.filter(b => !notifiedBadges.includes(b.id));

    if (newlyUnlocked.length > 0) {
      newlyUnlocked.forEach(badge => {
        addNotification("New Badge Unlocked! 🏆", `You earned the ${badge.label} badge.`);
      });

      const nextBadges = [...notifiedBadges, ...newlyUnlocked.map(b => b.id)];
      setNotifiedBadges(nextBadges);
      try { window.localStorage.setItem("rl-notified-badges", JSON.stringify(nextBadges)); } catch (e) { }
    }
  }, [stats, isDbLoaded, notifiedBadges, addNotification]);

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
              <button className="rl-nav-tab" onClick={async () => {
                setShowNotifs(!showNotifs);

                if (!showNotifs) {
                  const tabsWithDots = [];
                  if (unseenRequests) tabsWithDots.push('social');

                  notifications.forEach(n => {
                    if (!n.read) {
                      const cat = getNotifCategory(n.title);
                      if (!tabsWithDots.includes(cat)) tabsWithDots.push(cat);
                    }
                  });

                  setUnreadTabs(tabsWithDots.filter(t => t !== notifTab));

                  const token = localStorage.getItem('reelist_token') || sessionStorage.getItem('reelist_token');

                  if (unseenRequests) {
                    fetch('http://localhost:3000/api/follow-requests/seen', {
                      method: 'PUT',
                      headers: { 'Authorization': `Bearer ${token}` }
                    });
                  }

                  setUnseenRequests(false);
                  setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                  await fetch('http://localhost:3000/api/notifications/read', {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` }
                  });
                }
              }}>

                <Bell size={16} />
                {(notifications.filter(n => !n.read).length > 0 || unseenRequests) && (
                  <span style={{ width: '6px', height: '6px', background: 'var(--rl-burnt)', borderRadius: '50%', position: 'absolute', top: '8px', right: '8px' }} />
                )}
              </button>

              {
                showNotifs && (
                  <div style={{ position: 'absolute', top: '50px', right: '0', width: '340px', background: 'var(--rl-cream)', border: '1px solid var(--rl-border)', borderRadius: '12px', zIndex: 100, padding: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h4 style={{ margin: 0, fontSize: '14px' }}>Notifications</h4>
                      {notifications.length > 0 && (
                        <button
                          onClick={async () => {
                            setNotifications([]);
                            const token = localStorage.getItem('reelist_token') || sessionStorage.getItem('reelist_token');
                            await fetch('http://localhost:3000/api/notifications', { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                          }}
                          style={{ background: 'none', border: 'none', fontSize: '11px', color: '#a8452b', cursor: 'pointer', fontWeight: '600' }}
                        >
                          Clear History
                        </button>
                      )}
                    </div>

                    {/* TAB NAVIGATION */}
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--rl-border)', marginBottom: '12px' }}>
                      {['activity', 'releases', 'social', 'system'].map(tab => (
                        <button
                          key={tab}
                          onClick={() => {
                            setNotifTab(tab);
                            setUnreadTabs(prev => prev.filter(t => t !== tab));
                          }}
                          style={{
                            flex: 1, padding: '8px 0', textTransform: 'capitalize', background: 'none', border: 'none',
                            borderBottom: notifTab === tab ? '2px solid var(--rl-burnt)' : '2px solid transparent',
                            color: notifTab === tab ? 'var(--rl-burnt)' : 'var(--rl-text)',
                            fontWeight: notifTab === tab ? '600' : '500', fontSize: '12px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                          }}
                        >
                          {tab}
                          {unreadTabs.includes(tab) && (
                            <span style={{ width: '6px', height: '6px', background: 'var(--rl-burnt)', borderRadius: '50%', display: 'inline-block' }} />
                          )}
                        </button>
                      ))}
                    </div>

                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>

                      {/* SOCIAL TAB: Renders Follow Requests + Standard Social Notifs */}
                      {notifTab === 'social' && (
                        <>
                          {followRequests.map(req => (
                            <div key={req.follower_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--rl-border)' }}>
                              <div
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                                onClick={() => {
                                  handleViewProfile(req.username);
                                  setShowNotifs(false);
                                  window.scrollTo(0, 0);
                                }}
                              >
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--rl-beige)', overflow: 'hidden', flexShrink: 0 }}>
                                  {req.avatar ? <img src={req.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={16} style={{ margin: '8px' }} color="#8a7d6f" />}
                                </div>
                                <div>
                                  <span style={{ fontWeight: '600', fontSize: '13px', color: 'var(--rl-text)' }}>@{req.username}</span>
                                  <div style={{ fontSize: '11px', color: '#8a7d6f' }}>requested to follow you</div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: '6px', flexDirection: 'column' }}>
                                <button onClick={() => handleFollowRequest(req.follower_id, 'approve')} className="rl-btn rl-btn-primary" style={{ padding: '2px 8px', fontSize: '11px' }}>Approve</button>
                                <button onClick={() => handleFollowRequest(req.follower_id, 'deny')} className="rl-btn rl-btn-ghost" style={{ padding: '2px 8px', fontSize: '11px' }}>Deny</button>
                              </div>
                            </div>
                          ))}
                        </>
                      )}

                      {/* STANDARD NOTIFICATIONS FILTERING */}
                      {(() => {
                        const filteredNotifs = notifications.filter(n => getNotifCategory(n.title) === notifTab);

                        if (filteredNotifs.length === 0 && (notifTab !== 'social' || followRequests.length === 0)) {
                          return <p style={{ fontSize: '12px', color: '#8a7d6f', textAlign: 'center', marginTop: '20px' }}>No new {notifTab} updates.</p>;
                        }

                        return filteredNotifs.map(n => (
                          <div key={n.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--rl-border)', fontSize: '13px' }}>
                            <div style={{ flex: 1, paddingRight: '12px' }}>
                              <div style={{ fontWeight: 600, color: 'var(--rl-text)' }}>{n.title}</div>
                              <div style={{ color: '#8a7d6f', marginTop: '2px', lineHeight: '1.4' }}>{n.message}</div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setNotifications(prev => prev.filter(item => item.id !== n.id));
                              }}
                              style={{ background: 'none', border: 'none', color: '#8a7d6f', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                              aria-label="Remove notification"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ));
                      })()}

                    </div>
                  </div>
                )
              }
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
            onViewProfile={handleViewProfile}
          />
        )}
        {view === "public-profile" && targetProfile && (
          <PublicProfileView
            username={targetProfile}
            onBack={() => setView("explore")}
            onOpen={openDetail}
            onToggleFavourite={(item) => toggleItemInList(favListId, item)}
            favourites={favList.items}
            tmdb={tmdb}
            onViewProfile={handleViewProfile}
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
            onLogout={onLogout}
            onUpdateUsername={handleUpdateUsername}
            onDeleteAccount={handleDeleteAccount}
            onUpdatePrivacy={(isPublic) => updateProfile({ isPublic })}
            onViewProfile={handleViewProfile}
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

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const hasLocalToken = !!window.localStorage.getItem('reelist_token');
    const hasSessionToken = !!window.sessionStorage.getItem('reelist_token');
    return hasLocalToken || hasSessionToken;
  });

  const handleLogout = () => {
    localStorage.removeItem('reelist_token');
    sessionStorage.removeItem('reelist_token');
    localStorage.removeItem('reelist_user');
    sessionStorage.removeItem('reelist_user');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return <MainApp onLogout={handleLogout} />;
}
