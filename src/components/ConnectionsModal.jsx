import { X, User, Loader2, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";

function ConnectionsModal({ username, type, onClose, onViewProfile }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchConnections = async () => {
            const token = localStorage.getItem('reelist_token') || sessionStorage.getItem('reelist_token');

            setLoading(true);
            try {
                const res = await fetch(`http://localhost:3000/api/users/${username}/connections?type=${type}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (res.ok) {
                    setUsers(await res.json());
                }
            } catch (e) {
                console.error("Network error:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchConnections();
    }, [username, type]);

    return (
        <div className="rl-modal-backdrop" onClick={onClose}>
            <div className="rl-modal" onClick={e => e.stopPropagation()} style={{ width: '420px', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--rl-border)', background: 'var(--rl-cream)', position: 'sticky', top: 0, zIndex: 10 }}>
                    <h2 style={{ textTransform: 'capitalize', margin: 0, fontSize: '18px' }}>{type}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--rl-text)', display: 'flex', padding: '4px' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* SCROLLABLE LIST AREA */}
                <div style={{ overflowY: 'auto', padding: '12px', flex: 1 }}>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
                            <Loader2 size={28} className="rl-spin" style={{ color: 'var(--rl-burnt)' }} />
                        </div>
                    ) : users.length === 0 ? (
                        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#8a7d6f' }}>
                            <div style={{ fontSize: '32px', marginBottom: '12px' }}>👻</div>
                            <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>No {type} found.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {users.map(u => (
                                <div
                                    key={u.id}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '12px', cursor: 'pointer', borderRadius: '12px',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseOver={e => e.currentTarget.style.background = 'var(--rl-beige)'}
                                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                    onClick={() => { onViewProfile(u.username); onClose(); }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: 'var(--rl-beige)', border: '1px solid var(--rl-border)', overflow: 'hidden', flexShrink: 0 }}>
                                            {u.avatar ? <img src={u.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={22} style={{ margin: '11px' }} color="#8a7d6f" />}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--rl-text)' }}>@{u.username}</div>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} color="#8a7d6f" style={{ opacity: 0.5 }} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
export default ConnectionsModal;