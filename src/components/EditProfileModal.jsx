import { useRef, useState } from "react";
import { User, X } from "lucide-react";
import Section from "./Section";

function EditProfileModal({ profile, onSave, onClose }) {
  const [name, setName] = useState(profile.name);
  const [username, setUsername] = useState(profile.username || "");
  const [bio, setBio] = useState(profile.bio);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [banner, setBanner] = useState(profile.banner || { type: 'upload', value: null });

  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  const handleFile = (e, setFunction) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFunction(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    onSave({ name, username, bio, avatar, banner: { type: 'upload', value: banner.value || banner } });
    onClose();
  };

  return (
    <div className="rl-modal-backdrop">
      <div className="rl-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px', padding: '24px' }}>
        <button className="rl-modal-close" style={{ color: 'var(--rl-text)' }} onClick={onClose}><X size={18} /></button>
        <h3>Edit Profile</h3>

        {/* Banner Section */}
        <div style={{ color: 'var(--rl-text)', fontWeight: '700', marginBottom: '8px', marginLeft: '8px', padding: '4px' }}> Banner </div>
        <div style={{
          height: '150px',
          width: '100%',
          borderRadius: '12px',
          marginBottom: '10px',
          overflow: 'hidden',
          border: '1px solid var(--rl-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--rl-beige)',
          position: 'relative'
        }}>
          {/* The Image (if exists) */}
          {banner?.value && (
            <img
              src={banner.value}
              alt="Banner Preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}

          <button
            className="rl-btn"
            style={{
              position: 'absolute',
              background: 'rgba(0, 0, 0, 0.4)',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              backdropFilter: 'blur(4px)',
              zIndex: 1
            }}
            onClick={() => bannerInputRef.current.click()}
          >
            {banner?.value ? "Change Banner" : "Select Banner"}
          </button>
        </div>
        <input type="file" ref={bannerInputRef} hidden accept="image/*" onChange={(e) => handleFile(e, (val) => setBanner({ type: 'upload', value: val }))} />

        {/* Avatar Section */}
        <div style={{ color: 'var(--rl-text)', fontWeight: '700', marginBottom: '8px', marginLeft: '8px', padding: '4px' }}> Avatar </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--rl-beige)', overflow: 'hidden' }}>
            {avatar ? <img src={avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={30} style={{ margin: '15px' }} />}
          </div>
          <button className="rl-btn rl-btn-ghost" onClick={() => avatarInputRef.current.click()}>Change Photo</button>
          <input type="file" ref={avatarInputRef} hidden accept="image/*" onChange={(e) => handleFile(e, setAvatar)} />
        </div>

        <div style={{ color: 'var(--rl-text)', fontWeight: '700', marginBottom: '8px', marginLeft: '8px', padding: '4px' }}> Name </div>
        <input className="rl-input" style={{ background: 'var(--rl-beige)', padding: '12px', borderRadius: '12px', marginBottom: '12px', width: '100%' }} value={name} onChange={e => setName(e.target.value)} placeholder="Display Name" />
        <div style={{ color: 'var(--rl-text)', fontWeight: '700', marginBottom: '8px', marginLeft: '8px', padding: '4px' }}> Bio </div>
        <textarea className="rl-textarea" style={{ width: '100%', marginBottom: '12px' }} value={bio} onChange={e => setBio(e.target.value)} placeholder="Bio" />

        <button className="rl-btn rl-btn-primary" style={{ width: '100%' }} onClick={handleSave}>Save Changes</button>
      </div>
    </div>
  );
}

export default EditProfileModal;
