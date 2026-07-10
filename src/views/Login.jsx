import { useState, useEffect } from 'react';
import { Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useSearchParams } from "react-router-dom";

function Login({ onLoginSuccess }) {
    const [activePane, setActivePane] = useState('login');
    const [resetEmail, setResetEmail] = useState('');
    const isRegistering = activePane === 'register';
    const [username, setUsername] = useState('');
    const [usernameStatus, setUsernameStatus] = useState({ message: '', color: '' });
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [feedback, setFeedback] = useState({ message: '', color: '' });

    const validateUsername = (val) => {
        const allowedCharsOnly = /^[a-z0-9._]*$/;
        const matches = val.match(/[a-z]/g);
        const letterCount = matches ? matches.length : 0;
        return {
            isValidFormat: allowedCharsOnly.test(val),
            letterCount: letterCount
        };
    };

    const [searchParams] = useSearchParams();

    useEffect(() => {
        if (searchParams.get("verified") === "true") {
            setFeedback({ message: "Your account has been verified! You can now log in.", color: "#4ade80" });

            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [searchParams]);

    useEffect(() => {
        if (!isRegistering || username.trim().length === 0) {
            setUsernameStatus({ message: '', color: '' });
            setIsCheckingUsername(false);
            return;
        }

        setIsCheckingUsername(true);
        setUsernameStatus({ message: '', color: '' });

        const delayCheck = setTimeout(async () => {
            const { letterCount } = validateUsername(username);

            if (letterCount < 3) {
                setUsernameStatus({ message: 'Need 3 letters', color: '#fbbf24' });
                setIsCheckingUsername(false);
                return;
            }

            try {
                const res = await fetch(`http://localhost:3000/api/check-username?username=${username}`);
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
    }, [username, activePane]);

    const getPasswordStrength = () => {
        if (password.length === 0) return { width: '0%', color: 'transparent' };
        if (password.length < 5) return { width: '33%', color: '#f87171' };
        if (password.length < 8) return { width: '66%', color: '#fbbf24' };
        return { width: '100%', color: '#4ade80' };
    };

    const renderFeedback = (forRegisterPane) => {
        if (!feedback.message) return null;
        if (isRegistering !== forRegisterPane) return null;

        const isError = feedback.color === '#f87171';
        const isSuccess = feedback.color === '#4ade80';

        let bgColor = 'rgba(255, 255, 255, 0.05)';
        let borderColor = 'rgba(255, 255, 255, 0.1)';
        let textColor = '#8a7d6f';
        let Icon = null;

        if (isError) {
            bgColor = 'rgba(248, 113, 113, 0.08)';
            borderColor = 'rgba(248, 113, 113, 0.2)';
            textColor = '#ef4444';
            Icon = AlertCircle;
        } else if (isSuccess) {
            bgColor = 'rgba(74, 222, 128, 0.08)';
            borderColor = 'rgba(74, 222, 128, 0.2)';
            textColor = '#22c55e';
            Icon = CheckCircle2;
        }

        return (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 16px', borderRadius: '12px', backgroundColor: bgColor, color: textColor, border: `1px solid ${borderColor}`, fontSize: '13px', fontWeight: '500', marginBottom: '20px', animation: 'fadeIn 0.3s ease' }}>
                {Icon && <Icon size={18} style={{ flexShrink: 0, marginTop: '1px' }} />}
                <span style={{ lineHeight: '1.4' }}>{feedback.message}</span>
            </div>
        );
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setFeedback({ message: "Sending reset link...", color: "white" });

        try {
            const response = await fetch('http://localhost:3000/api/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: resetEmail })
            });
            const data = await response.json();

            if (response.ok) {
                setFeedback({ message: data.message, color: "#4ade80" });
                setTimeout(() => {
                    setActivePane('login');
                    setResetEmail('');
                    setFeedback({ message: '', color: '' });
                }, 4000);
            } else {
                setFeedback({ message: data.error, color: "#f87171" });
            }
        } catch (err) {
            setFeedback({ message: "Cannot connect to server.", color: "#f87171" });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isRegistering && password !== confirmPassword) {
            setFeedback({ message: "Passwords do not match.", color: "#f87171" });
            return;
        }

        if (isRegistering && usernameStatus.message !== 'Available') {
            setFeedback({ message: "Please choose a valid and available username.", color: "#f87171" });
            return;
        }

        setFeedback({ message: "Processing...", color: "white" });

        if (isRegistering) {
            setFeedback({ message: "Success! Please check your email to verify your account.", color: "#4ade80" });

            setTimeout(() => {
                setIsRegistering(false);
                setPassword('');
                setConfirmPassword('');
                setFeedback({ message: '', color: '' });
            }, 3000);
        }

        const endpoint = isRegistering ? 'http://localhost:3000/register' : 'http://localhost:3000/login';
        const payload = isRegistering ? { username, email, password } : { email, password, rememberMe };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();

            if (response.ok) {
                if (isRegistering) {
                    setTimeout(() => {
                        setIsRegistering(false);
                        setPassword('');
                        setConfirmPassword('');
                        setFeedback({ message: '', color: '' });
                    }, 1500);
                } else {
                    setFeedback({ message: "Welcome back!", color: "#4ade80" });
                    if (rememberMe) {
                        localStorage.setItem('reelist_token', data.token);
                        localStorage.setItem('reelist_user', JSON.stringify(data.user));
                    } else {
                        sessionStorage.setItem('reelist_token', data.token);
                        sessionStorage.setItem('reelist_user', JSON.stringify(data.user));
                    }
                    setTimeout(() => onLoginSuccess(), 1000);
                }
            } else {
                setFeedback({ message: data.error || "Authentication failed.", color: "#f87171" });
            }
        } catch (err) {
            setFeedback({ message: "Cannot connect to server.", color: "#f87171" });
        }
    };

    return (
        <div className="login-wrapper">
            <div className="background-container">
                <video autoPlay loop muted playsInline className="bg-video">
                    <source src="your-background-video.mp4" type="video/mp4" />
                </video>
                <div className="overlay"></div>
            </div>

            <div className="auth-panel-large">

                {/* Left Branding Side */}
                <div className="auth-brand">
                    <h1>Reelist</h1>
                    <p>Your cinematic journey, beautifully tracked. Discover new favorites, log your daily watches, and explore detailed statistics of your viewing habits.</p>
                </div>

                {/* Right Form Side */}
                <div className="auth-form-window">
                    <div
                        className="auth-form-track"
                        style={{
                            width: '300%',
                            transform: `translateX(${activePane === 'login' ? '0' : activePane === 'register' ? '-33.333%' : '-66.666%'})`
                        }}
                    >

                        {/* PANE 1: LOGIN */}
                        <div className="auth-form-pane" style={{ width: '33.333%' }}>
                            <h2>Sign In</h2>
                            {renderFeedback(false)}
                            <form onSubmit={handleSubmit}>
                                <div className="input-with-icon">
                                    <Mail size={18} />
                                    <input type="email" placeholder="Email Address" required value={email} onChange={(e) => setEmail(e.target.value)} />
                                </div>

                                <div className="input-with-icon">
                                    <Lock size={18} />
                                    <input type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                                </div>

                                <div className="form-options">
                                    <label>
                                        <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} /> Remember me
                                    </label>
                                    <a onClick={() => setActivePane('forgot')}>Forgot Password?</a>
                                </div>

                                <button type="submit" className="login-btn">
                                    Log In <ArrowRight size={18} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '5px' }} />
                                </button>
                            </form>

                            <div className="social-divider"><span>OR CONTINUE WITH</span></div>
                            <div className="social-btns">
                                {/* Google Icon */}
                                <button className="social-btn" type="button">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                </button>
                                {/* GitHub Icon */}
                                <button className="social-btn" type="button">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                                    </svg>
                                </button>
                            </div>

                            <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: '#8a7d6f' }}>
                                Don't have an account? <span onClick={() => setActivePane('register')} style={{ color: '#C97352', cursor: 'pointer', fontWeight: 'bold' }}>Sign up</span>
                            </p>
                        </div>

                        {/* PANE 2: REGISTER */}
                        <div className="auth-form-pane" style={{ width: '33.333%' }}>
                            <h2>Create Account</h2>
                            {renderFeedback(true)}
                            <form onSubmit={handleSubmit}>
                                <div className="input-with-icon" style={{ position: 'relative' }}>
                                    <User size={18} />
                                    <input
                                        type="text"
                                        placeholder="Username (e.g. a - z, 1 - 9, ., _)"
                                        required={isRegistering}
                                        value={username}
                                        onChange={(e) => {
                                            const val = e.target.value.toLowerCase();
                                            const { isValidFormat } = validateUsername(val);

                                            if (isValidFormat) {
                                                setUsername(val);
                                            }
                                        }}
                                        style={{ width: '100%', paddingRight: '100px' }}
                                    />

                                    {isRegistering && (username.trim().length > 0) && (
                                        <div style={{
                                            position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                                            display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px',
                                            borderRadius: '20px',
                                            backgroundColor: isCheckingUsername ? 'rgba(138, 125, 111, 0.1)' : `${usernameStatus.color}26`,
                                            color: isCheckingUsername ? '#8a7d6f' : usernameStatus.color,
                                            fontSize: '11px', fontWeight: '600', pointerEvents: 'none', transition: 'all 0.2s ease', zIndex: 10
                                        }}>
                                            {isCheckingUsername ? (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: "0px 0px 0px 17px"
                                                }}>
                                                    <Loader2
                                                        size={14}
                                                        style={{
                                                            animation: 'spin 1s linear infinite',
                                                            position: 'absolute',
                                                            left: '7px',
                                                            top: '10px'
                                                        }}
                                                    />
                                                    <span>Checking...</span>
                                                </div>
                                            ) : (
                                                <>
                                                    {usernameStatus.message === 'Available' && <CheckCircle2 size={14} style={{ position: 'static', transform: 'none' }} />}
                                                    {usernameStatus.message === 'Taken' && <XCircle size={14} style={{ position: 'static', transform: 'none' }} />}
                                                    {usernameStatus.message === 'Too short' && <AlertCircle size={14} style={{ position: 'static', transform: 'none' }} />}
                                                    <span>{usernameStatus.message}</span>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="input-with-icon">
                                    <Mail size={18} />
                                    <input type="email" placeholder="Email Address" required={isRegistering} value={email} onChange={(e) => setEmail(e.target.value)} />
                                </div>

                                <div className="input-with-icon" style={{
                                    position: 'relative', overflow: 'hidden', borderRadius: '12px', transform: 'translateZ(0)'
                                }}>
                                    <Lock size={18} />
                                    <input
                                        type="password"
                                        placeholder="Password"
                                        required={isRegistering}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        style={{ width: '100%' }}
                                    />

                                    {/* STRENGTH BAR */}
                                    {isRegistering && password.length > 0 && (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '0',
                                            left: '0',
                                            height: '3px',
                                            width: getPasswordStrength().width,
                                            backgroundColor: getPasswordStrength().color,
                                            transition: 'all 0.3s ease',
                                            zIndex: 5,
                                            overflow: 'hidden',
                                        }} />
                                    )}
                                </div>

                                <div className="input-with-icon">
                                    <Lock size={18} />
                                    <input type="password" placeholder="Confirm Password" required={isRegistering} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                                </div>

                                <div className="form-options" style={{ marginBottom: '15px' }}>
                                    <label><input type="checkbox" required={isRegistering} /> I agree to the Terms & Privacy Policy</label>
                                </div>

                                <button type="submit" className="login-btn">Create Account</button>
                            </form>

                            <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: '#8a7d6f' }}>
                                Already have an account? <span onClick={() => setActivePane('login')} style={{ color: '#C97352', cursor: 'pointer', fontWeight: 'bold' }}>Log in</span>
                            </p>
                        </div>

                        {/* PANE 3: FORGOT PASSWORD */}
                        <div className="auth-form-pane" style={{ width: '33.333%' }}>
                            <h2>Reset Password</h2>
                            <p style={{ fontSize: '14px', color: '#8a7d6f', marginBottom: '20px', lineHeight: '1.5' }}>
                                Enter the email address associated with your account and we'll send you a link to reset your password.
                            </p>

                            {activePane === 'forgot' && feedback.message && (
                                <div style={{
                                    display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 16px', borderRadius: '12px',
                                    backgroundColor: feedback.color === '#4ade80' ? 'rgba(74, 222, 128, 0.08)' : 'rgba(248, 113, 113, 0.08)',
                                    color: feedback.color === '#4ade80' ? '#22c55e' : '#ef4444',
                                    border: `1px solid ${feedback.color === '#4ade80' ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)'}`,
                                    fontSize: '13px', fontWeight: '500', marginBottom: '20px'
                                }}>
                                    <span style={{ lineHeight: '1.4' }}>{feedback.message}</span>
                                </div>
                            )}

                            <form onSubmit={handleForgotPassword}>
                                <div className="input-with-icon">
                                    <Mail size={18} />
                                    <input
                                        type="email"
                                        placeholder="Email Address"
                                        required={activePane === 'forgot'}
                                        value={resetEmail}
                                        onChange={(e) => setResetEmail(e.target.value)}
                                    />
                                </div>

                                <button type="submit" className="login-btn" style={{ marginTop: '10px' }}>
                                    Send Reset Link
                                </button>
                            </form>

                            <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: '#8a7d6f' }}>
                                Remembered your password? <span onClick={() => setActivePane('login')} style={{ color: '#C97352', cursor: 'pointer', fontWeight: 'bold' }}>Back to login</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;