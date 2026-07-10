import { useState, useEffect } from "react";
import { X, Loader2, ThumbsUp, ThumbsDown, MessageCircle, SmilePlus, Send, ChevronLeft } from "lucide-react";
import { GiphyFetch } from '@giphy/js-fetch-api';

const gf = new GiphyFetch(import.meta.env.VITE_GIPHY_API_KEY);

function CommentPanel({ comments, setComments, commentText, setCommentText, handlePostComment, loading, onClose }) {
    const [activeThreadId, setActiveThreadId] = useState(null);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [selectedGif, setSelectedGif] = useState(null);
    const [searchInput, setSearchInput] = useState("");
    const [gifList, setGifList] = useState([]);
    const [isFetchingGifs, setIsFetchingGifs] = useState(false);

    useEffect(() => {
        if (!showGifPicker) return;

        const delaySearch = setTimeout(async () => {
            if (searchInput.trim() === "") {
                setIsFetchingGifs(true);
                const res = await gf.trending({ limit: 12 });
                setGifList(res.data);
                setIsFetchingGifs(false);
            } else {
                setIsFetchingGifs(true);
                try {
                    const res = await gf.search(searchInput, { limit: 12 });
                    setGifList(res.data);
                } catch (err) { console.error("Search failed:", err); }
                setIsFetchingGifs(false);
            }
        }, 500);

        return () => clearTimeout(delaySearch);
    }, [searchInput, showGifPicker]);

    const submitPost = () => {
        handlePostComment(activeThreadId || null, selectedGif || null);
        setShowGifPicker(false);
        setSelectedGif(null);
    };

    const handleReact = async (commentId, action) => {
        const target = comments.find(c => c.id === commentId);
        if (!target) return;

        const currentReaction = target.user_reaction;
        let newReaction = action;
        let likesDelta = 0; let dislikesDelta = 0;

        if (currentReaction === action) {
            newReaction = null;
            if (action === 'like') likesDelta = -1; else dislikesDelta = -1;
        } else if (currentReaction) {
            if (action === 'like') { likesDelta = 1; dislikesDelta = -1; }
            else { likesDelta = -1; dislikesDelta = 1; }
        } else {
            if (action === 'like') likesDelta = 1; else dislikesDelta = 1;
        }

        setComments(prev => prev.map(c => {
            if (c.id === commentId) {
                return {
                    ...c,
                    likes: Math.max(0, (c.likes || 0) + likesDelta),
                    dislikes: Math.max(0, (c.dislikes || 0) + dislikesDelta),
                    user_reaction: newReaction
                };
            }
            return c;
        }));

        const token = localStorage.getItem('reelist_token') || sessionStorage.getItem('reelist_token');
        try {
            await fetch(`http://localhost:3000/api/comments/${commentId}/react`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ action })
            });
        } catch (err) { console.error("Failed to react", err); }
    };

    const allComments = [...comments].sort((a, b) => {
        const aReplies = comments.filter(child => child.parent_id === a.id).length;
        const bReplies = comments.filter(child => child.parent_id === b.id).length;

        const aScore = (a.likes || 0) + (a.dislikes || 0) + aReplies;
        const bScore = (b.likes || 0) + (b.dislikes || 0) + bReplies;

        return bScore - aScore;
    });

    const displayedComments = activeThreadId
        ? allComments.filter(c => c.parent_id === activeThreadId)
        : allComments.filter(c => !c.parent_id);

    const activeParentComment = activeThreadId ? comments.find(c => c.id === activeThreadId) : null;

    const CommentNode = ({ c, isParentRender }) => {
        const replyCount = comments.filter(child => child.parent_id === c.id).length;

        return (
            <div style={{ display: 'flex', gap: '12px', background: isParentRender ? 'var(--rl-cream)' : 'var(--rl-beige)', padding: '12px', borderRadius: '12px', border: isParentRender ? '1px solid var(--rl-border)' : 'none' }}>
                {/* AVATAR BLOCK */}
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--rl-burnt)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px', flexShrink: 0, overflow: 'hidden' }}>
                    {c.avatar ? (
                        <img
                            src={c.avatar}
                            alt={c.username}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    ) : (
                        c.username.charAt(0).toUpperCase()
                    )}
                </div>

                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--rl-text)' }}>@{c.username}</span>
                        <span style={{ fontSize: '11px', color: '#8a7d6f' }}>
                            {new Date(c.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                    </div>

                    {c.comment && <p style={{ margin: '0 0 8px 0', fontSize: '14px', lineHeight: '1.5', color: 'var(--rl-text)' }}>{c.comment}</p>}
                    {c.gif_url && <img src={c.gif_url} alt="GIF" style={{ maxWidth: '100%', borderRadius: '12px', marginBottom: '8px', border: '1px solid var(--rl-border)' }} />}

                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <button
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: c.user_reaction === 'like' ? 'var(--rl-burnt)' : '#8a7d6f', cursor: 'pointer', fontSize: '12px', padding: 0 }}
                            onClick={() => handleReact(c.id, 'like')}
                        >
                            <ThumbsUp size={14} fill={c.user_reaction === 'like' ? 'currentColor' : 'none'} /> <span style={{ fontWeight: '600' }}>{c.likes || 0}</span>
                        </button>
                        <button
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: c.user_reaction === 'dislike' ? '#4a5568' : '#8a7d6f', cursor: 'pointer', fontSize: '12px', padding: 0 }}
                            onClick={() => handleReact(c.id, 'dislike')}
                        >
                            <ThumbsDown size={14} fill={c.user_reaction === 'dislike' ? 'currentColor' : 'none'} /> <span style={{ fontWeight: '600' }}>{c.dislikes || 0}</span>
                        </button>

                        {/* Only show Reply/View Thread button on top-level comments */}
                        {!c.parent_id && !isParentRender && (
                            <button
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: 'var(--rl-olive)', cursor: 'pointer', fontSize: '12px', padding: 0, fontWeight: 600 }}
                                onClick={() => setActiveThreadId(c.id)}
                            >
                                <MessageCircle size={14} /> {replyCount > 0 ? `${replyCount} Replies` : 'Reply'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="rl-modal-backdrop" style={{ zIndex: 100 }} onClick={onClose}>
            <div className="rl-modal" onClick={e => e.stopPropagation()} style={{ zIndex: 110, width: '90%', maxWidth: '450px', height: '80vh', maxHeight: '700px', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', background: 'var(--rl-cream)' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid var(--rl-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--rl-beige)' }}>
                    {activeThreadId ? (
                        <button className="rl-btn rl-btn-ghost" style={{ padding: '4px 8px', margin: '-4px -8px', fontSize: '14px', display: 'flex', alignItems: 'center' }} onClick={() => setActiveThreadId(null)}>
                            <ChevronLeft size={18} /> Back to chat
                        </button>
                    ) : (
                        <h2 style={{ margin: 0, fontSize: '18px' }}>Community Chat</h2>
                    )}
                    <button className="rl-modal-close" style={{ position: 'static' }} onClick={onClose}><X size={20} /></button>
                </div>

                {/* Feed */}
                <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {loading ? (
                        <Loader2 className="rl-spin" size={28} style={{ margin: 'auto', color: '#8a7d6f' }} />
                    ) : activeThreadId && activeParentComment ? (
                        <>
                            <CommentNode c={activeParentComment} isParentRender={true} />
                            <div style={{ height: '1px', background: 'var(--rl-border)', margin: '4px 0' }} />
                            {displayedComments.length === 0 ? (
                                <div style={{ textAlign: 'center', color: '#8a7d6f', fontSize: '13px', padding: '20px' }}>No replies yet. Be the first!</div>
                            ) : (
                                displayedComments.map(c => <CommentNode key={c.id} c={c} />)
                            )}
                        </>
                    ) : displayedComments.length === 0 ? (
                        <div style={{ margin: 'auto', color: '#8a7d6f', fontSize: '14px' }}>Be the first to share your thoughts!</div>
                    ) : (
                        displayedComments.map(c => <CommentNode key={c.id} c={c} />)
                    )}
                </div>

                {/* Input Area */}
                <div style={{ borderTop: '1px solid var(--rl-border)', background: 'var(--rl-beige)', padding: '16px' }}>
                    {selectedGif && (
                        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '12px' }}>
                            <img src={selectedGif} alt="Selected GIF" style={{ height: '100px', borderRadius: '8px', border: '1px solid var(--rl-border)' }} />
                            <button
                                style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--rl-burnt)', color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                onClick={() => setSelectedGif(null)}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )}

                    {showGifPicker && !selectedGif && (
                        <div style={{ height: '220px', background: 'var(--rl-cream)', border: '1px solid var(--rl-border)', borderRadius: '8px', marginBottom: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <div style={{ padding: '8px', borderBottom: '1px solid var(--rl-border)', background: 'var(--rl-beige)' }}>
                                <input
                                    type="text" className="rl-input" style={{ width: '100%', padding: '6px 12px', fontSize: '13px', borderRadius: '14px' }}
                                    placeholder="Search Giphy..."
                                    value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                                    onKeyDown={async (e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (!searchInput.trim()) return;
                                            setIsFetchingGifs(true);
                                            try {
                                                const res = await gf.search(searchInput, { limit: 12 });
                                                setGifList(res.data);
                                            } catch (err) { console.error("Giphy Search FAILED:", err); }
                                            setIsFetchingGifs(false);
                                        }
                                    }}
                                />
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                                {isFetchingGifs ? (
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Loader2 className="rl-spin" size={24} color="#8a7d6f" /></div>
                                ) : gifList.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: '#8a7d6f', fontSize: '12px', marginTop: '20px' }}>No GIFs found.</div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                                        {gifList.map(gif => (
                                            <img key={gif.id} src={gif.images.fixed_height_small.url} alt={gif.title} style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer' }}
                                                onClick={() => {
                                                    setSelectedGif(gif.images.fixed_height.url);
                                                    setShowGifPicker(false);
                                                    setSearchInput("");
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <textarea
                                className="rl-input"
                                style={{ width: '100%', minHeight: '44px', maxHeight: '120px', padding: '12px 40px 12px 14px', borderRadius: '22px', resize: 'none', overflowY: 'auto' }}
                                placeholder={activeThreadId && activeParentComment ? `Reply to @${activeParentComment.username}...` : "Share your thoughts..."}
                                value={commentText} onChange={e => setCommentText(e.target.value)} rows={1}
                            />
                            <button
                                style={{ position: 'absolute', right: '12px', bottom: '12px', background: 'none', border: 'none', color: showGifPicker ? 'var(--rl-burnt)' : '#8a7d6f', cursor: 'pointer', padding: 0 }}
                                onClick={() => setShowGifPicker(!showGifPicker)}
                            >
                                <SmilePlus size={20} />
                            </button>
                        </div>
                        <button
                            className="rl-btn rl-btn-primary"
                            style={{ height: '44px', width: '44px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                            onClick={submitPost} disabled={!commentText.trim() && !selectedGif}
                        >
                            <Send size={18} style={{ marginLeft: '2px' }} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CommentPanel;