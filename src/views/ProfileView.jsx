import { useState, useEffect } from "react";
import { Calendar, Film, User, X, LogOut, Settings, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

import PosterCard from "../components/PosterCard.jsx";
import ConnectionsModal from "../components/ConnectionsModal.jsx";
import ExpandedListModal from "../components/ExpandedListModal.jsx";

import { APP_THEMES, GENRE_PALETTE } from "../lib/constants.js";
import { keyFor } from "../lib/format.js";
import { getBadges } from "../lib/constants.js";

function ProfileView({ stats, tracked, onOpen, onToggleFavourite, favourites, profile, onEdit, onUpdateTheme, onLogout, onUpdateUsername, onDeleteAccount, onUpdatePrivacy, onViewProfile }) {
  const [showThemes, setShowThemes] = useState(false);

  const [selectedBadge, setSelectedBadge] = useState(null);

  const [showSettings, setShowSettings] = useState(false);

  const [newUsername, setNewUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [usernameSuccess, setUsernameSuccess] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState({ message: '', color: '' });
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  const [followRequests, setFollowRequests] = useState([]);
  const [connections, setConnections] = useState(null);

  const [expandedList, setExpandedList] = useState(null);

  const validateUsername = (val) => {
    const allowedCharsOnly = /^[a-z0-9._]*$/;
    const matches = val.match(/[a-z]/g);
    const letterCount = matches ? matches.length : 0;
    return {
      isValidFormat: allowedCharsOnly.test(val),
      letterCount: letterCount
    };
  };

  useEffect(() => {
    const fetchRequests = async () => {
      if (profile?.isPublic !== false) return;
      const token = localStorage.getItem('reelist_token') || sessionStorage.getItem('reelist_token');
      try {
        const res = await fetch('http://localhost:3000/api/follow-requests', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setFollowRequests(await res.json());
      } catch (e) { }
    };
    fetchRequests();
  }, [profile?.isPublic]);

  const handleRequest = async (followerId, action) => {
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

  useEffect(() => {
    if (!newUsername || newUsername.trim().length === 0 || newUsername === profile?.username) {
      setUsernameStatus({ message: '', color: '' });
      setIsCheckingUsername(false);
      return;
    }

    setIsCheckingUsername(true);
    setUsernameStatus({ message: '', color: '' });

    const delayCheck = setTimeout(async () => {
      const { letterCount } = validateUsername(newUsername);

      if (letterCount < 3) {
        setUsernameStatus({ message: 'Need 3 letters', color: '#fbbf24' });
        setIsCheckingUsername(false);
        return;
      }

      try {
        const res = await fetch(`http://localhost:3000/api/check-username?username=${newUsername}`);
        const data = await res.json();

        if (data.available) {
          setUsernameStatus({ message: 'Available', color: '#4ade80' });
        } else {
          setUsernameStatus({ message: 'Taken', color: '#f87171' });
        }
      } catch (err) {
        setUsernameStatus({ message: 'Error', color: '#f87171' });
      }
      setIsCheckingUsername(false);
    }, 500);

    return () => clearTimeout(delayCheck);
  }, [newUsername, profile?.username]);

  const recentRated = [...tracked]
    .filter((t) => t.rating)
    .sort((a, b) => (b.ratedAt || b.addedAt || 0) - (a.ratedAt || a.addedAt || 0))
    .slice(0, 9);

  const formatTime = (totalMins) => {
    if (!totalMins) return "0h";
    const days = Math.floor(totalMins / 1440);
    const hours = Math.floor((totalMins % 1440) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  const memberDate = profile?.memberSince ? new Date(profile.memberSince) : new Date();
  const formattedAnniversary = memberDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const [showAll, setShowAll] = useState(false);

  const allBadges = getBadges(stats).sort((a, b) => (b.condition ? 1 : 0) - (a.condition ? 1 : 0));
  const displayedBadges = showAll ? allBadges : allBadges.slice(0, 12);

  const submitUsernameChange = async (e) => {
    e.preventDefault();

    if (usernameStatus.message !== 'Available') return;

    setUsernameError("");
    setUsernameSuccess("");
    setIsUpdating(true);

    try {
      await onUpdateUsername(newUsername);
      setUsernameSuccess("Username updated successfully!");
      setTimeout(() => {
        setShowSettings(false);
        setUsernameSuccess("");
        setNewUsername("");
      }, 1500);
    } catch (err) {
      setUsernameError(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div>
      <section className="rl-profile-header" style={{
        padding: 0,
        position: 'relative',
        background: 'var(--rl-cream)',
        borderRadius: '20px'
      }}>
        {/* The Banner */}
        <div style={{
          height: '200px',
          width: '100%',
          backgroundColor: 'var(--rl-beige)',
          backgroundImage: profile?.banner
            ? `url(${typeof profile.banner === 'object' ? profile.banner.value : profile.banner})`
            : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderRadius: '20px 20px 0 0'
        }} />

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginTop: '-50px',
          padding: '0 20px 20px'
        }}>
          <div className="rl-profile-avatar" style={{ border: '4px solid var(--rl-beige)' }}>
            {profile?.avatar ? <img src={profile.avatar} alt="Avatar" /> : <User size={40} />}
          </div>
          <h1>{profile?.name}</h1>

          <div style={{ color: 'var(--rl-text)', fontWeight: '700', marginBottom: '8px' }}>
            @{profile?.username}
          </div>

          {/* Anniversary Milestone */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--rl-text)',
            opacity: 0.7,
            fontSize: '13px',
            marginBottom: '12px',
            fontWeight: '500'
          }}>
            <Calendar size={14} /> Member since {formattedAnniversary}
          </div>

          {/* Follower Stats - Segmented Box Style */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '24px',
            marginBottom: '20px', background: 'var(--rl-beige)',
            padding: '12px 32px', borderRadius: '16px',
            border: '1px solid var(--rl-border)'
          }}>
            <div style={{ cursor: 'pointer', textAlign: 'center' }} onClick={() => setConnections('followers')}>
              <div style={{ color: 'var(--rl-text)', fontSize: '17px', fontWeight: '800' }}>{profile?.followersCount || 0}</div>
              <div style={{ color: '#8a7d6f', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px', fontWeight: '600' }}>Followers</div>
            </div>

            <div style={{ width: '1px', height: '30px', background: 'var(--rl-border)' }} />

            <div style={{ cursor: 'pointer', textAlign: 'center' }} onClick={() => setConnections('following')}>
              <div style={{ color: 'var(--rl-text)', fontSize: '17px', fontWeight: '800' }}>{profile?.followingCount || 0}</div>
              <div style={{ color: '#8a7d6f', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px', fontWeight: '600' }}>Following</div>
            </div>
          </div>

          {connections && (
            <ConnectionsModal
              username={profile?.username}
              type={connections}
              onClose={() => setConnections(null)}
              onViewProfile={onViewProfile}
            />
          )}

          <p style={{ color: '#8a7d6f', marginBottom: '20px' }}>{profile?.bio}</p>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="rl-btn rl-btn-ghost" style={{ background: 'var(--rl-cream)' }} onClick={onEdit}>
              Edit Profile
            </button>
            <button className="rl-btn rl-btn-ghost" style={{ background: 'var(--rl-cream)' }} onClick={onLogout}>
              <LogOut size={16} />
              Log Out
            </button>
            <button className="rl-btn rl-btn-ghost" style={{ background: 'var(--rl-cream)' }} onClick={() => setShowSettings(true)}>
              <Settings size={16} />
              Settings
            </button>
          </div>

          {/* Inline Theme Picker */}
          {showThemes && (
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', padding: '16px', background: 'var(--rl-beige)', borderRadius: '16px', border: '1px solid var(--rl-border)', flexWrap: 'wrap', justifyContent: 'center' }}>
              {Object.entries(APP_THEMES).map(([key, t]) => (
                <button
                  key={key}
                  onClick={() => onUpdateTheme(key)}
                  style={{
                    width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer',
                    background: t.cream,
                    border: `2px solid ${profile?.theme === key ? 'var(--rl-burnt)' : t.border}`,
                    boxShadow: profile?.theme === key ? '0 0 0 2px var(--rl-beige)' : 'none',
                    transition: 'all 0.2s'
                  }}
                  title={t.label}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rl-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2>Achievement Badges</h2>
          {allBadges.length > 11 && (
            <button className="rl-btn rl-btn-ghost" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => setShowAll(!showAll)}>
              {showAll ? 'Show Less' : 'See All'}
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '12px' }}>
          {displayedBadges.map((badge) => (
            <div
              key={badge.id}
              onClick={() => badge.condition && setSelectedBadge(badge)}
              style={{
                padding: '12px', borderRadius: '16px', textAlign: 'center',
                background: badge.condition ? 'var(--rl-badge-bg)' : 'transparent',
                border: badge.condition ? '2px solid var(--rl-border)' : '2px dashed var(--rl-border)',
                opacity: badge.condition ? 1 : 0.4,
                cursor: badge.condition ? 'pointer' : 'default'
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '4px' }}>
                {badge.condition ? badge.icon : '🔒'}
              </div>
              <div style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
                {badge.condition ? badge.label : 'Locked'}
              </div>
            </div>
          ))}
        </div>

        {selectedBadge && (
          <div className="rl-modal-backdrop" onClick={() => setSelectedBadge(null)}>
            <div className="rl-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '350px', padding: '24px', textAlign: 'center', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
              <button className="rl-modal-close" style={{ color: 'var(--rl-text)' }} onClick={() => setSelectedBadge(null)}><X size={18} /></button>

              <div style={{ fontSize: '64px', marginBottom: '16px' }}>{selectedBadge.icon}</div>
              <h2 style={{ marginBottom: '8px' }}>{selectedBadge.label}</h2>
              <p style={{ color: 'var(--rl-text)', opacity: 0.8, marginBottom: '20px' }}>
                {selectedBadge.conditionText}
              </p>

              <div style={{ borderTop: '1px solid var(--rl-border)', paddingTop: '16px', fontSize: '13px' }}>
                <span style={{ color: '#8a7d6f' }}>Achieved on:</span><br />
                <strong>{new Date().toLocaleDateString()}</strong>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Viewing Streak Panel */}
      <section className="rl-section" style={{ marginBottom: '24px' }}>
        <h2>Viewing Streak</h2>
        <div className="rl-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div className="rl-stat-card" style={{ background: 'var(--rl-beige)', borderColor: 'var(--rl-terracotta)' }}>
            <div className="rl-stat-value">🔥 {stats.streaks.current} {stats.streaks.current === 1 ? 'day' : 'days'}</div>
            <div className="rl-stat-label">Current Streak</div>
          </div>
          <div className="rl-stat-card">
            <div className="rl-stat-value">🔥 {stats.streaks.longest} {stats.streaks.longest === 1 ? 'day' : 'days'}</div>
            <div className="rl-stat-label">Longest Streak</div>
          </div>
        </div>
      </section>

      <div className="rl-stats-grid">
        <div className="rl-stat-card"><div className="rl-stat-value">{stats.movies}</div><div className="rl-stat-label">Movies Watched</div></div>
        <div className="rl-stat-card"><div className="rl-stat-value">{stats.shows}</div><div className="rl-stat-label">Shows Completed</div></div>

        <div className="rl-stat-card"><div className="rl-stat-value">{formatTime(stats.movieMinutes)}</div><div className="rl-stat-label">Movie Time</div></div>
        <div className="rl-stat-card"><div className="rl-stat-value">{formatTime(stats.showMinutes)}</div><div className="rl-stat-label">TV Time</div></div>
        <div className="rl-stat-card"><div className="rl-stat-value" style={{ color: "var(--rl-olive)" }}>{formatTime(stats.totalMinutes)}</div><div className="rl-stat-label">Total Time Watched</div></div>

        <div className="rl-stat-card"><div className="rl-stat-value">{stats.totalEpisodes}</div><div className="rl-stat-label">Episodes Watched</div></div>

        <div className="rl-stat-card"><div className="rl-stat-value">{stats.avg ? stats.avg.toFixed(1) : "–"}</div><div className="rl-stat-label">Average Rating</div></div>
        <div className="rl-stat-card"><div className="rl-stat-value">{stats.watchlistCount}</div><div className="rl-stat-label">On Your Watchlist</div></div>
      </div>

      {stats.genreData.length > 0 && (
        <section className="rl-section">
          <h2>Genres you watch most</h2>
          <div className="rl-chart-wrap">
            <div style={{ width: "100%", maxWidth: 260, height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.genreData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3} stroke="none">
                    {stats.genreData.map((entry, i) => <Cell key={entry.name} fill={GENRE_PALETTE[i % GENRE_PALETTE.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="rl-legend">
              {stats.genreData.map((g, i) => (
                <li key={g.name}><span className="rl-legend-dot" style={{ background: GENRE_PALETTE[i % GENRE_PALETTE.length] }} />{g.name}<span className="rl-legend-count">{g.value}</span></li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="rl-section">
        {(() => {
          const getFullItem = (item) => {
            const full = tracked.find(t => t.id === item.id && t.media_type === item.media_type);
            return full ? { ...item, ...full } : item;
          };

          const favShows = favourites?.filter(t => t.media_type === 'tv').map(getFullItem) || [];
          const favMovies = favourites?.filter(t => t.media_type === 'movie').map(getFullItem) || [];

          const allShows = tracked.filter(t => t.media_type === 'tv');
          const allMovies = tracked.filter(t => t.media_type === 'movie');

          const renderGrid = (items) => (
            <div className="rl-grid">
              {items.slice(0, 9).map((t) => (
                <PosterCard
                  key={`${t.media_type}-${t.id}`}
                  item={{ ...t, vote_average: t.rating || t.vote_average }}
                  tracked={{}}
                  onOpen={() => onOpen({ id: t.id, media_type: t.media_type })}
                  onToggleFavourite={onToggleFavourite}
                  isFavourite={favourites?.some(f => keyFor(f) === keyFor(t))}
                />
              ))}
            </div>
          );

          return (
            <>
              {/* SHOWS SECTION */}
              <section className="rl-section" style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ margin: 0 }}>Shows</h2>
                  {allShows.length > 9 && (
                    <button className="rl-btn rl-btn-ghost" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => setExpandedList({ title: "Shows", items: allShows })}>
                      See All
                    </button>
                  )}
                </div>
                {allShows.length > 0 ? renderGrid(allShows) : <div className="rl-empty">No shows tracked yet.</div>}
              </section>

              {/* FAVOURITE SHOWS */}
              {favShows.length > 0 && (
                <section className="rl-section" style={{ marginBottom: '32px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ margin: 0 }}>Favourite Shows</h2>
                    {favShows.length > 9 && (
                      <button className="rl-btn rl-btn-ghost" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => setExpandedList({ title: "Favourite Shows", items: favShows })}>
                        See All
                      </button>
                    )}
                  </div>
                  {renderGrid(favShows)}
                </section>
              )}

              {/* MOVIES SECTION */}
              <section className="rl-section" style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ margin: 0 }}>Movies</h2>
                  {allMovies.length > 9 && (
                    <button className="rl-btn rl-btn-ghost" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => setExpandedList({ title: "Movies", items: allMovies })}>
                      See All
                    </button>
                  )}
                </div>
                {allMovies.length > 0 ? renderGrid(allMovies) : <div className="rl-empty">No movies tracked yet.</div>}
              </section>

              {/* FAVOURITE MOVIES */}
              {favMovies.length > 0 && (
                <section className="rl-section" style={{ marginBottom: '32px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ margin: 0 }}>Favourite Movies</h2>
                    {favMovies.length > 9 && (
                      <button className="rl-btn rl-btn-ghost" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => setExpandedList({ title: "Favourite Movies", items: favMovies })}>
                        See All
                      </button>
                    )}
                  </div>
                  {renderGrid(favMovies)}
                </section>
              )}

              {expandedList && (
                <ExpandedListModal
                  title={expandedList.title}
                  items={expandedList.items}
                  onClose={() => setExpandedList(null)}
                  onOpen={onOpen}
                  onToggleFavourite={onToggleFavourite}
                  favourites={favourites}
                />
              )}
            </>
          );
        })()}

        {/* Settings Modal */}
        {showSettings && (
          <div className="rl-modal-backdrop" onClick={() => setShowSettings(false)}>
            <div className="rl-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', padding: '24px' }}>
              <button className="rl-modal-close" style={{ color: 'var(--rl-text)' }} onClick={() => setShowSettings(false)}>
                <X size={18} />
              </button>

              <h2 style={{ marginBottom: '24px', fontSize: '20px' }}>Account Settings</h2>

              {/* THEME PICKER */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '12px' }}>App Theme</label>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {Object.entries(APP_THEMES).map(([key, t]) => (
                    <button
                      key={key}
                      onClick={() => onUpdateTheme(key)}
                      style={{
                        width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer',
                        background: t.cream,
                        border: `2px solid ${profile?.theme === key ? 'var(--rl-burnt)' : t.border}`,
                        boxShadow: profile?.theme === key ? '0 0 0 2px var(--rl-beige)' : 'none',
                        transition: 'all 0.2s'
                      }}
                      title={t.label}
                    />
                  ))}
                </div>
              </div>

              {/* USERNAME FORM */}
              <form onSubmit={submitUsernameChange}>
                <label style={{ marginTop: '24px', paddingTop: '24px', display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', borderTop: '1px solid var(--rl-border)' }}>Change Username</label>

                <div className="rl-input-wrap" style={{ position: 'relative', display: 'flex', alignItems: 'center', background: 'var(--rl-beige)', borderRadius: '12px', border: '1px solid var(--rl-border)' }}>
                  <span style={{ color: '#8a7d6f', paddingLeft: '14px', fontWeight: '600' }}>@</span>
                  <input
                    type="text"
                    className="rl-input"
                    placeholder={profile?.username}
                    value={newUsername}
                    onChange={(e) => {
                      const val = e.target.value.toLowerCase();
                      const { isValidFormat } = validateUsername(val);

                      if (isValidFormat) {
                        setNewUsername(val);
                      }
                    }}
                    required
                    style={{ paddingRight: '110px', border: 'none', background: 'transparent', flex: 1 }}
                  />

                  {/* THE VALIDATION PILL */}
                  {newUsername.trim().length > 0 && newUsername !== profile?.username && (
                    <div style={{
                      position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px',
                      borderRadius: '20px',
                      backgroundColor: isCheckingUsername ? 'rgba(138, 125, 111, 0.1)' : `${usernameStatus.color}26`,
                      color: isCheckingUsername ? '#8a7d6f' : usernameStatus.color,
                      fontSize: '11px', fontWeight: '600', pointerEvents: 'none', transition: 'all 0.2s ease', zIndex: 10
                    }}>
                      {isCheckingUsername ? (
                        <>
                          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                          <span>Checking...</span>
                        </>
                      ) : (
                        <>
                          {usernameStatus.message === 'Available' && <CheckCircle2 size={14} />}
                          {usernameStatus.message === 'Taken' && <XCircle size={14} />}
                          {usernameStatus.message === 'Too short' && <AlertCircle size={14} />}
                          <span>{usernameStatus.message}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {usernameError && <div style={{ color: '#a8452b', fontSize: '13px', marginTop: '12px' }}>{usernameError}</div>}
                {usernameSuccess && <div style={{ color: 'var(--rl-olive)', fontSize: '13px', marginTop: '12px' }}>{usernameSuccess}</div>}

                <button
                  type="submit"
                  className="rl-btn rl-btn-primary"
                  style={{ width: '100%', marginTop: '16px' }}
                  disabled={isUpdating || !newUsername.trim() || newUsername === profile?.username || usernameStatus.message !== 'Available'}
                >
                  {isUpdating ? "Updating..." : "Save Username"}
                </button>
              </form>

              {/* PRIVACY TOGGLE */}
              <div style={{ marginTop: '24px', paddingTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--rl-border)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '2px' }}>Account Privacy</label>
                  <span style={{ fontSize: '12px', color: '#8a7d6f' }}>
                    {profile?.isPublic === false ? "Profile is private" : "Profile is public"}
                  </span>
                </div>

                <label className="rl-switch">
                  <input
                    type="checkbox"
                    checked={profile?.isPublic === false}
                    onChange={(e) => onUpdatePrivacy(!e.target.checked)}
                  />
                  <span className="rl-slider"></span>
                </label>
              </div>

              {/* ACCOUNT DELETION SECTION */}
              <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--rl-border)' }}>

                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    className="rl-btn rl-btn-ghost"
                    style={{ width: '100%', borderColor: '#a8452b', color: '#a8452b' }}
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    Delete Account
                  </button>
                ) : (
                  <div style={{ background: '#a8452b15', padding: '16px', borderRadius: '12px', border: '1px solid #a8452b' }}>
                    <p style={{ fontSize: '13px', color: '#a8452b', marginBottom: '12px', fontWeight: '500' }}>
                      Are you sure? This action cannot be undone and all your data will be permanently lost.
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="rl-btn rl-btn-ghost"
                        style={{ flex: 1 }}
                        onClick={() => setShowDeleteConfirm(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="rl-btn"
                        style={{ flex: 1, background: '#a8452b', color: 'white', border: 'none' }}
                        onClick={onDeleteAccount}
                      >
                        Confirm Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        )}
      </section >
    </div >
  )
}

export default ProfileView;
