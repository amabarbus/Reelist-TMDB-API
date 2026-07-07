import { useState } from "react";
import { Calendar, Film, User, X } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import PosterCard from "../components/PosterCard.jsx";
import { APP_THEMES, GENRE_PALETTE } from "../lib/constants.js";
import { keyFor } from "../lib/format.js";
import { getBadges } from "../lib/constants.js";

function ProfileView({ stats, tracked, onOpen, onToggleFavourite, favourites, profile, onEdit, onUpdateTheme }) {
  const [showThemes, setShowThemes] = useState(false);

  const [selectedBadge, setSelectedBadge] = useState(null);

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

  const allBadges = getBadges(stats);
  const displayedBadges = showAll ? allBadges : allBadges.slice(0, 12);

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
          background: profile?.banner?.value ? `url(${profile.banner.value})` : 'var(--rl-beige)',
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

          <p style={{ color: '#8a7d6f', marginBottom: '20px' }}>{profile?.bio}</p>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="rl-btn rl-btn-ghost" style={{ background: 'var(--rl-cream)' }} onClick={onEdit}>
              Edit Profile
            </button>
            <button className="rl-btn rl-btn-ghost" style={{ background: showThemes ? 'var(--rl-beige)' : 'var(--rl-cream)' }} onClick={() => setShowThemes(!showThemes)}>
              Theme
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
        <h2>Recently rated</h2>
        {recentRated.length === 0 ? (
          <div className="rl-empty">Rate a few titles to see them here.</div>
        ) : (
          <div className="rl-grid">
            {recentRated.map((t) => (
              <PosterCard
                key={`${t.media_type}-${t.id}`}
                item={{ ...t, vote_average: t.rating }}
                tracked={{}}
                onOpen={() => onOpen({ id: t.id, media_type: t.media_type })}
                onToggleFavourite={onToggleFavourite}
                isFavourite={favourites?.some(f => keyFor(f) === keyFor(t))}
              />
            ))}
          </div>
        )
        }
      </section >
    </div >
  )
}

export default ProfileView;
