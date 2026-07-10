import { X } from "lucide-react";

import PosterCard from "./PosterCard.jsx";
import { keyFor } from "../lib/format.js";

function ExpandedListModal({ title, items, onClose, onOpen, onToggleFavourite, favourites }) {
    const watching = items.filter(t => t.status === 'watching' || t.status === 'onhold');
    const completed = items.filter(t => t.status === 'completed' || t.status === 'uptodate');
    const planned = items.filter(t => t.status === 'planned');

    const renderGrid = (list) => (
        <div className="rl-grid">
            {list.map(t => (
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

    const renderSection = (sectionTitle, list) => {
        if (!list || list.length === 0) return null;
        return (
            <div style={{ marginBottom: '32px', paddingLeft: '16px', borderLeft: '2px solid var(--rl-border)' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '16px', color: 'var(--rl-text)' }}>{sectionTitle}</h3>
                {renderGrid(list)}
            </div>
        );
    };

    return (
        <div className="rl-modal-backdrop" onClick={onClose} style={{ zIndex: 200 }}>
            <div className="rl-modal" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '1000px', maxHeight: '85vh', overflowY: 'auto', padding: '0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--rl-border)', position: 'sticky', top: 0, background: 'var(--rl-cream)', zIndex: 100 }}>
                    <h2 style={{ margin: 0 }}>{title}</h2>
                    <button className="rl-modal-close" onClick={onClose} style={{ position: 'static' }}><X size={20} /></button>
                </div>
                <div style={{ padding: '24px' }}>
                    {watching.length === 0 && completed.length === 0 && planned.length === 0 ? (
                        renderGrid(items)
                    ) : (
                        <>
                            {renderSection("Currently Watching", watching)}
                            {renderSection("Completed", completed)}
                            {renderSection("Plan to Watch", planned)}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ExpandedListModal;