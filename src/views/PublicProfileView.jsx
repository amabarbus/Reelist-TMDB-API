import { useState, useEffect, useMemo } from "react";
import { Calendar, User, ArrowLeft, Loader2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

import PosterCard from "../components/PosterCard.jsx";
import ConnectionsModal from "../components/ConnectionsModal.jsx";
import ExpandedListModal from "../components/ExpandedListModal.jsx";

import { GENRE_PALETTE, getBadges } from "../lib/constants.js";
import { keyFor, titleOf } from "../lib/format.js";

function PublicProfileView({ username, onBack, onOpen, onToggleFavourite, favourites, tmdb, onViewProfile }) {
    const [profileData, setProfileData] = useState(null);
    const [trackedList, setTrackedList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [isPrivateProfile, setIsPrivateProfile] = useState(false);

    const [followStatus, setFollowStatus] = useState(null);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [isTogglingFollow, setIsTogglingFollow] = useState(false);
    const [publicFavourites, setPublicFavourites] = useState([]);
    const [connections, setConnections] = useState(null);

    const [expandedList, setExpandedList] = useState(null);

    useEffect(() => {
        const fetchUser = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('reelist_token') || sessionStorage.getItem('reelist_token');
                const res = await fetch(`http://localhost:3000/api/users/${username}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                const data = await res.json();

                if (!res.ok) throw new Error(data.error || "User not found");

                setIsPrivateProfile(data.isPrivateAccess);
                setFollowStatus(data.profile.follow_status);
                setFollowersCount(parseInt(data.profile.followers_count) || 0);
                setFollowingCount(parseInt(data.profile.following_count) || 0);

                let parsedBanner = data.profile.banner;
                if (parsedBanner && typeof parsedBanner === 'string' && parsedBanner.startsWith('{')) {
                    try { parsedBanner = JSON.parse(parsedBanner); } catch (e) { }
                }

                setProfileData({ ...data.profile, banner: parsedBanner });

                const parseJSON = (val) => {
                    if (!val) return [];
                    if (typeof val === 'string') {
                        try { return JSON.parse(val); } catch (e) { return []; }
                    }
                    return val;
                };

                const parsedTracked = data.tracked.map(item => ({
                    id: item.tmdb_id,
                    media_type: item.media_type,
                    title: item.title,
                    poster_path: item.poster_path,
                    status: item.status,
                    rating: item.rating,
                    watchedEpisodes: parseJSON(item.watched_episodes),
                    genres: parseJSON(item.genres),
                    runtime: item.runtime,
                    number_of_episodes: item.number_of_episodes,
                    release_date: item.release_date,
                    first_air_date: item.release_date
                }));

                setTrackedList(parsedTracked.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0)));

                const parsedFavs = (data.favourites || []).map(item => ({
                    id: item.tmdb_id,
                    media_type: item.media_type,
                    title: item.title,
                    poster_path: item.poster_path,
                    rating: item.rating
                }));
                setPublicFavourites(parsedFavs);

            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (username) fetchUser();
    }, [username]);

    const handleToggleFollow = async () => {
        if (isTogglingFollow) return;
        setIsTogglingFollow(true);

        const prevStatus = followStatus;
        const isPublic = profileData?.is_public !== false;

        if (prevStatus) {
            setFollowStatus(null);
            if (prevStatus === 'accepted') setFollowersCount(prev => prev - 1);
        } else {
            setFollowStatus(isPublic ? 'accepted' : 'pending');
            if (isPublic) setFollowersCount(prev => prev + 1);
        }

        try {
            const token = localStorage.getItem('reelist_token') || sessionStorage.getItem('reelist_token');
            const response = await fetch(`http://localhost:3000/api/users/${username}/follow`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("Failed to toggle follow");
        } catch (err) {
            setFollowStatus(prevStatus);
            if (prevStatus === 'accepted' && !followStatus) setFollowersCount(prev => prev + 1);
            if (!prevStatus && isPublic) setFollowersCount(prev => prev - 1);
            console.error(err);
        } finally {
            setIsTogglingFollow(false);
        }
    };

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
        const plannedCount = trackedList.filter(t => t.status === 'planned').length;

        return {
            movies: movies.length, shows: shows.length, avg, genreData,
            watchlistCount: plannedCount, movieMinutes, showMinutes,
            totalMinutes: movieMinutes + showMinutes, totalEpisodes,
            streaks: {
                current: profileData?.current_streak || 0,
                longest: profileData?.longest_streak || 0
            }
        };
    }, [trackedList, profileData]);

    if (loading) return <div className="rl-loading" style={{ marginTop: '100px' }}><Loader2 className="rl-spin" size={24} /> Loading profile...</div>;
    if (error) return <div className="rl-empty" style={{ marginTop: '100px' }}>{error}</div>;

    const recentRated = [...trackedList].filter((t) => t.rating).slice(0, 9);

    const formatTime = (totalMins) => {
        if (!totalMins) return "0h";
        const days = Math.floor(totalMins / 1440);
        const hours = Math.floor((totalMins % 1440) / 60);
        return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
    };

    const allBadges = getBadges(stats).sort((a, b) => (b.condition ? 1 : 0) - (a.condition ? 1 : 0)).slice(0, 12);

    return (
        <div>
            <section className="rl-profile-header" style={{ padding: 0, position: 'relative', background: 'var(--rl-cream)', borderRadius: '20px' }}>
                <div style={{
                    height: '200px', width: '100%', backgroundColor: 'var(--rl-beige)',
                    backgroundImage: profileData?.banner ? `url(${typeof profileData.banner === 'object' ? profileData.banner.value : profileData.banner})` : 'none',
                    backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '20px 20px 0 0'
                }} />

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '-50px', padding: '0 20px 20px' }}>
                    <div className="rl-profile-avatar" style={{ border: '4px solid var(--rl-beige)' }}>
                        {profileData?.avatar ? <img src={profileData.avatar} alt="Avatar" /> : <User size={40} />}
                    </div>
                    <h1>{profileData?.name || profileData?.username}</h1>
                    <div style={{ color: 'var(--rl-text)', fontWeight: '700', marginBottom: '8px' }}>@{profileData?.username}</div>
                    <p style={{ color: '#8a7d6f', marginBottom: '16px' }}>{profileData?.bio || "No bio yet."}</p>

                    {/* Follower Stats - Segmented Box Style */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '24px',
                        marginBottom: '20px', background: 'var(--rl-beige)',
                        padding: '12px 32px', borderRadius: '16px',
                        border: '1px solid var(--rl-border)',
                        justifyContent: 'center'
                    }}>
                        <div style={{ cursor: 'pointer', textAlign: 'center' }} onClick={() => setConnections('followers')}>
                            <div style={{ color: 'var(--rl-text)', fontSize: '17px', fontWeight: '800' }}>{followersCount}</div>
                            <div style={{ color: '#8a7d6f', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px', fontWeight: '600' }}>Followers</div>
                        </div>

                        <div style={{ width: '1px', height: '30px', background: 'var(--rl-border)' }} />

                        <div style={{ cursor: 'pointer', textAlign: 'center' }} onClick={() => setConnections('following')}>
                            <div style={{ color: 'var(--rl-text)', fontSize: '17px', fontWeight: '800' }}>{followingCount}</div>
                            <div style={{ color: '#8a7d6f', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px', fontWeight: '600' }}>Following</div>
                        </div>
                    </div>

                    {/* The Connections Modal */}
                    {connections && (
                        <ConnectionsModal
                            username={profileData?.username}
                            type={connections}
                            onClose={() => setConnections(null)}
                            onViewProfile={onViewProfile}
                        />
                    )}

                    {/* Follow Button */}
                    <button
                        onClick={handleToggleFollow}
                        disabled={isTogglingFollow}
                        className={`rl-btn ${followStatus ? 'rl-btn-ghost' : 'rl-btn-primary'}`}
                        style={{ width: '120px' }}
                    >
                        {followStatus === 'pending' ? "Requested" : followStatus === 'accepted' ? "Following" : "Follow"}
                    </button>
                </div>
            </section>

            {/* Conditional Rendering for Private Accounts */}
            {isPrivateProfile ? (
                <section className="rl-section" style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--rl-cream)', borderRadius: '20px', marginTop: '20px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
                    <h2 style={{ marginBottom: '8px' }}>This account is private</h2>
                    <p style={{ color: '#8a7d6f' }}>You can see their basic info, but their viewing stats and history are hidden.</p>
                </section>
            ) : (
                <>
                    {/* Badges */}
                    <section className="rl-section">
                        <h2>Badges</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '12px' }}>
                            {allBadges.map((badge) => (
                                <div key={badge.id} style={{
                                    padding: '12px', borderRadius: '16px', textAlign: 'center',
                                    background: badge.condition ? 'var(--rl-badge-bg)' : 'transparent',
                                    border: badge.condition ? '2px solid var(--rl-border)' : '2px dashed var(--rl-border)',
                                    opacity: badge.condition ? 1 : 0.4
                                }}>
                                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>{badge.condition ? badge.icon : '🔒'}</div>
                                    <div style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>{badge.condition ? badge.label : 'Locked'}</div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Stats */}
                    <section className="rl-section">
                        <h2>Viewing Stats</h2>
                        <div className="rl-stats-grid">
                            <div className="rl-stat-card"><div className="rl-stat-value">{stats.movies}</div><div className="rl-stat-label">Movies</div></div>
                            <div className="rl-stat-card"><div className="rl-stat-value">{stats.shows}</div><div className="rl-stat-label">Shows</div></div>
                            <div className="rl-stat-card"><div className="rl-stat-value" style={{ color: "var(--rl-olive)" }}>{formatTime(stats.totalMinutes)}</div><div className="rl-stat-label">Total Time</div></div>
                            <div className="rl-stat-card"><div className="rl-stat-value">{stats.avg ? stats.avg.toFixed(1) : "–"}</div><div className="rl-stat-label">Avg Rating</div></div>
                        </div>
                    </section>

                    <section className="rl-section">
                        {(() => {
                            const getFullPublicItem = (item) => {
                                const full = trackedList.find(t => t.id === item.id && t.media_type === item.media_type);
                                return full ? { ...item, ...full } : item;
                            };

                            const favShows = publicFavourites?.filter(t => t.media_type === 'tv').map(getFullPublicItem) || [];
                            const favMovies = publicFavourites?.filter(t => t.media_type === 'movie').map(getFullPublicItem) || [];

                            const allShows = trackedList.filter(t => t.media_type === 'tv');
                            const allMovies = trackedList.filter(t => t.media_type === 'movie');

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
                    </section>
                </>
            )}
        </div>
    );
}

export default PublicProfileView;