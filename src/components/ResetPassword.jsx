import { useState } from 'react';
import { Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useSearchParams } from "react-router-dom";

function ResetPassword() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [feedback, setFeedback] = useState({ message: '', color: '' });
    const [isSuccess, setIsSuccess] = useState(false);

    const getPasswordStrength = () => {
        if (password.length === 0) return { width: '0%', color: 'transparent' };
        if (password.length < 5) return { width: '33%', color: '#f87171' };
        if (password.length < 8) return { width: '66%', color: '#fbbf24' };
        return { width: '100%', color: '#4ade80' };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!token) {
            setFeedback({ message: "No reset token found in the URL.", color: "#f87171" });
            return;
        }

        if (password !== confirmPassword) {
            setFeedback({ message: "Passwords do not match.", color: "#f87171" });
            return;
        }

        setFeedback({ message: "Updating password...", color: "white" });

        try {
            const response = await fetch('http://localhost:3000/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword: password })
            });

            const data = await response.json();

            if (response.ok) {
                setFeedback({ message: data.message, color: "#4ade80" });
                setIsSuccess(true);
                setTimeout(() => {
                    window.location.href = '/?verified=true';
                }, 2000);
            } else {
                setFeedback({ message: data.error, color: "#f87171" });
            }
        } catch (err) {
            setFeedback({ message: "Cannot connect to server.", color: "#f87171" });
        }
    };

    return (
        <div className="login-wrapper">
            <div className="auth-panel-large" style={{ width: '600px', height: 'auto', minHeight: '400px' }}>
                <div style={{ padding: '50px', width: '100%' }}>
                    <h2 style={{ fontSize: '1.8rem', marginBottom: '10px' }}>Set New Password</h2>
                    <p style={{ color: '#8a7d6f', fontSize: '14.5px', marginBottom: '25px', lineHeight: '1.5' }}>
                        Your new password must be different from previously used passwords.
                    </p>

                    {feedback.message && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 16px', borderRadius: '12px', backgroundColor: feedback.color === '#4ade80' ? 'rgba(74, 222, 128, 0.08)' : 'rgba(248, 113, 113, 0.08)', color: feedback.color === '#4ade80' ? '#22c55e' : '#ef4444', border: `1px solid ${feedback.color === '#4ade80' ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)'}`, fontSize: '13px', fontWeight: '500', marginBottom: '20px' }}>
                            {feedback.color === '#4ade80' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                            <span style={{ lineHeight: '1.4' }}>{feedback.message}</span>
                        </div>
                    )}

                    {!isSuccess && (
                        <form onSubmit={handleSubmit}>
                            <div className="input-with-icon" style={{ position: 'relative', overflow: 'hidden', borderRadius: '12px', transform: 'translateZ(0)' }}>
                                <Lock size={18} />
                                <input
                                    type="password"
                                    placeholder="New Password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    style={{ width: '100%' }}
                                />
                                {password.length > 0 && (
                                    <div style={{ position: 'absolute', bottom: '0', left: '0', height: '3px', width: getPasswordStrength().width, backgroundColor: getPasswordStrength().color, transition: 'all 0.3s ease', zIndex: 5 }} />
                                )}
                            </div>

                            <div className="input-with-icon">
                                <Lock size={18} />
                                <input
                                    type="password"
                                    placeholder="Confirm New Password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <button type="submit" className="login-btn" style={{ marginTop: '20px' }}>
                                Reset Password
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ResetPassword;