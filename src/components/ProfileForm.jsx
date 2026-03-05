'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { signup, login, resendVerification } from '@/lib/api';

// ─── Step definitions ───────────────────────────────────────────────
const STEPS = [
  { id: 'auth',        label: 'Account',     icon: '👤' },
  { id: 'photos',      label: 'Photos',      icon: '📸' },
  { id: 'description', label: 'About you',   icon: '✏️'  },
  { id: 'prompts',     label: 'Prompts',     icon: '💬' },
  { id: 'review',      label: 'Finish',      icon: '✨' },
];

const PROMPT_OPTIONS = [
  "My ideal weekend looks like…",
  "The way to my heart is…",
  "I'm looking for someone who…",
  "A fact about me that surprises people…",
  "My most controversial opinion is…",
  "I'm happiest when…",
  "The best trip I've ever taken was…",
  "Don't hate me if I…",
];

// ─── Helpers ────────────────────────────────────────────────────────
function detectInitialLoginMode() {
  if (typeof window === 'undefined') return false;
  return String(new URLSearchParams(window.location.search).get('auth') || '').toLowerCase() === 'login';
}

// ─── Sub-components ──────────────────────────────────────────────────

function StepBar({ currentStep }) {
  const currentIdx = STEPS.findIndex(s => s.id === currentStep);
  return (
    <div style={styles.stepBar}>
      {STEPS.map((step, i) => {
        const done    = i < currentIdx;
        const active  = i === currentIdx;
        return (
          <React.Fragment key={step.id}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                ...styles.stepDot,
                background: done ? 'var(--accent)' : active ? 'var(--accent)' : 'var(--muted-bg)',
                opacity: done || active ? 1 : 0.4,
                transform: active ? 'scale(1.15)' : 'scale(1)',
                boxShadow: active ? '0 0 0 3px var(--accent-soft)' : 'none',
              }}>
                {done ? '✓' : step.icon}
              </div>
              <span style={{ fontSize: 10, color: active ? 'var(--accent)' : 'var(--text-muted)', fontWeight: active ? 700 : 400 }}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ ...styles.stepLine, background: i < currentIdx ? 'var(--accent)' : 'var(--muted-bg)', opacity: i < currentIdx ? 1 : 0.3 }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function PhotoUploader({ photos, setPhotos }) {
  const inputRef = useRef();
  const MIN = 3;

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    const newPhotos = files.map(f => ({ file: f, url: URL.createObjectURL(f) }));
    setPhotos(prev => [...prev, ...newPhotos].slice(0, 9));
  };

  const removePhoto = (idx) => setPhotos(prev => prev.filter((_, i) => i !== idx));

  return (
    <div>
      <p style={styles.stepHint}>Add at least <strong>{MIN} photos</strong> — show your best self 📸</p>
      <div style={styles.photoGrid}>
        {photos.map((p, i) => (
          <div key={i} style={styles.photoCell}>
            <img src={p.url} alt="" style={styles.photoImg} />
            <button onClick={() => removePhoto(i)} style={styles.photoRemove} type="button">×</button>
          </div>
        ))}
        {photos.length < 9 && (
          <button onClick={() => inputRef.current.click()} style={styles.photoAdd} type="button">
            <span style={{ fontSize: 28, lineHeight: 1 }}>+</span>
            <span style={{ fontSize: 11, marginTop: 4, color: 'var(--text-muted)' }}>Add photo</span>
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: 'none' }} />
      {photos.length < MIN && (
        <p style={styles.requireNote}>⚠ {MIN - photos.length} more photo{photos.length < MIN - 1 ? 's' : ''} required</p>
      )}
    </div>
  );
}

function DescriptionStep({ description, setDescription }) {
  const MIN = 50;
  const remaining = MIN - description.length;
  return (
    <div>
      <p style={styles.stepHint}>Write a short bio so people get to know you</p>
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="I'm a curious human who loves hiking, coffee, and bad puns. Ask me about…"
        style={styles.textarea}
        rows={5}
        maxLength={400}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        {remaining > 0
          ? <span style={styles.requireNote}>⚠ {remaining} more character{remaining !== 1 ? 's' : ''} required</span>
          : <span style={{ fontSize: 12, color: 'var(--accent)' }}>✓ Looking good!</span>
        }
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{description.length}/400</span>
      </div>
    </div>
  );
}

function PromptsStep({ prompts, setPrompts }) {
  const MIN = 2;
  const addPrompt = () => {
    if (prompts.length < 3) setPrompts(prev => [...prev, { question: PROMPT_OPTIONS[0], answer: '' }]);
  };
  const updateQuestion = (i, val) => setPrompts(prev => prev.map((p, idx) => idx === i ? { ...p, question: val } : p));
  const updateAnswer   = (i, val) => setPrompts(prev => prev.map((p, idx) => idx === i ? { ...p, answer:    val } : p));
  const removePrompt   = (i) => setPrompts(prev => prev.filter((_, idx) => idx !== i));

  const answeredCount = prompts.filter(p => p.answer.trim().length >= 10).length;

  return (
    <div>
      <p style={styles.stepHint}>Answer at least <strong>{MIN} prompts</strong> — let your personality shine 💬</p>
      {prompts.map((p, i) => (
        <div key={i} style={styles.promptCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <select
              value={p.question}
              onChange={e => updateQuestion(i, e.target.value)}
              style={styles.promptSelect}
            >
              {PROMPT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {prompts.length > 1 && (
              <button onClick={() => removePrompt(i)} style={styles.promptRemove} type="button">×</button>
            )}
          </div>
          <textarea
            value={p.answer}
            onChange={e => updateAnswer(i, e.target.value)}
            placeholder="Your answer…"
            style={{ ...styles.textarea, minHeight: 70 }}
            rows={3}
            maxLength={150}
          />
          {p.answer.trim().length > 0 && p.answer.trim().length < 10 && (
            <span style={{ ...styles.requireNote, display: 'block', marginTop: 4 }}>⚠ Answer a bit more</span>
          )}
        </div>
      ))}
      {prompts.length < 3 && (
        <button onClick={addPrompt} style={styles.addPromptBtn} type="button">+ Add another prompt</button>
      )}
      {answeredCount < MIN && (
        <p style={styles.requireNote}>⚠ {MIN - answeredCount} more answered prompt{answeredCount < MIN - 1 ? 's' : ''} required</p>
      )}
    </div>
  );
}

function ReviewStep({ username, email, photos, description, prompts }) {
  return (
    <div>
      <p style={styles.stepHint}>You're all set! Here's a preview of your profile.</p>
      <div style={styles.reviewCard}>
        <div style={styles.reviewPhotoStrip}>
          {photos.slice(0, 3).map((p, i) => (
            <img key={i} src={p.url} alt="" style={styles.reviewPhoto} />
          ))}
          {photos.length > 3 && <div style={styles.reviewPhotoMore}>+{photos.length - 3}</div>}
        </div>
        <div style={{ padding: '0 4px' }}>
          <h3 style={{ margin: '12px 0 4px', fontSize: 20 }}>{username}</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 12px' }}>{email}</p>
          <p style={{ fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>{description}</p>
          {prompts.filter(p => p.answer.trim()).map((p, i) => (
            <div key={i} style={styles.reviewPrompt}>
              <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{p.question}</span>
              <p style={{ margin: '4px 0 0', fontSize: 14 }}>{p.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────
function ProfileForm({ onProfileCreated }) {
  const router = useRouter();

  // Auth state
  const [isLogin, setIsLogin]                   = useState(detectInitialLoginMode);
  const [username, setUsername]                 = useState('');
  const [identifier, setIdentifier]             = useState('');
  const [email, setEmail]                       = useState('');
  const [password, setPassword]                 = useState('');
  const [loading, setLoading]                   = useState(false);
  const [error, setError]                       = useState('');
  const [info, setInfo]                         = useState('');
  const [devVerificationUrl, setDevVerificationUrl] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [awaitingVerification, setAwaitingVerification] = useState(false);

  // Profile state
  const [step, setStep]               = useState('auth');
  const [photos, setPhotos]           = useState([]);
  const [description, setDescription] = useState('');
  const [prompts, setPrompts]         = useState([{ question: PROMPT_OPTIONS[0], answer: '' }]);

  const setAuthMode = (nextIsLogin) => {
    setIsLogin(nextIsLogin);
    setNeedsVerification(false);
    setAwaitingVerification(false);
    setError(''); setInfo(''); setDevVerificationUrl('');
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.set('auth', nextIsLogin ? 'login' : 'signup');
      router.replace(`/encounter?${params.toString()}`);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mode = String(new URLSearchParams(window.location.search).get('auth') || '').toLowerCase();
    if (mode === 'login')  setIsLogin(true);
    if (mode === 'signup') setIsLogin(false);
  }, []);

  // ── Auth handlers ────────────────────────────────────────────────
  const handleSignup = async (e) => {
    e.preventDefault();
    setNeedsVerification(false);
    setAwaitingVerification(false);
    setLoading(true); setError(''); setInfo(''); setDevVerificationUrl('');
    try {
      const data = await signup({ username, email, password });
      if (data?.requiresEmailVerification) {
        setNeedsVerification(true);
        setAwaitingVerification(true);
        if (data?.devVerificationUrl) setDevVerificationUrl(data.devVerificationUrl);
        setInfo(data?.emailSent
          ? 'Account created. Verify your email from your inbox, then onboarding will continue.'
          : data?.verificationError || 'Account created, but the verification email could not be sent.');
        return;
      }
      // Move to profile steps instead of finishing
      setStep('photos');
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed.');
    } finally { setLoading(false); }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAwaitingVerification(false);
    setLoading(true); setError(''); setInfo(''); setDevVerificationUrl('');
    try {
      const data = await login(identifier, password);
      onProfileCreated(data.user);
    } catch (err) {
      const rd = err.response?.data || {};
      if (err.response?.status === 403 && rd.requiresEmailVerification) {
        setNeedsVerification(true);
        if (rd.email) setEmail(rd.email);
        setInfo('Verify your email first. You can resend the verification link below.');
      } else {
        setError(rd.error || 'Login failed');
      }
    } finally { setLoading(false); }
  };

  const handleResendVerification = async () => {
    if (!email) { setError('Enter your email to resend verification.'); return; }
    setLoading(true); setError(''); setInfo(''); setDevVerificationUrl('');
    try {
      const data = await resendVerification(email);
      setInfo(data?.emailSent === false
        ? data?.error || 'Verification email could not be sent right now.'
        : 'Verification email sent. Check your inbox and spam folder.');
      if (data?.devVerificationUrl) setDevVerificationUrl(data.devVerificationUrl);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not resend verification email.');
    } finally { setLoading(false); }
  };

  // ── Gate logic ───────────────────────────────────────────────────
  const canProceedFrom = {
    photos:      photos.length >= 3,
    description: description.trim().length >= 50,
    prompts:     prompts.filter(p => p.answer.trim().length >= 10).length >= 2,
    review:      true,
  };

  const nextStep = () => {
    const order = ['auth', 'photos', 'description', 'prompts', 'review'];
    const idx = order.indexOf(step);
    if (idx < order.length - 1) setStep(order[idx + 1]);
  };

  const prevStep = () => {
    const order = ['auth', 'photos', 'description', 'prompts', 'review'];
    const idx = order.indexOf(step);
    if (idx > 0) setStep(order[idx - 1]);
  };

  const handleFinish = () => {
    // In real usage: submit profile data then call onProfileCreated
    onProfileCreated({ username, email, photos, description, prompts });
  };

  // ── Render ───────────────────────────────────────────────────────
  return (
    <>
      <style>{css}</style>
      <div className="profile-form-container">
        <div className="profile-form-card" style={{ maxWidth: 480 }}>

          {/* Step bar (hidden on auth step) */}
          {step !== 'auth' && <StepBar currentStep={step} />}

          {/* ── AUTH STEP ── */}
          {step === 'auth' && (
            <>
              <div className="profile-auth-head">
                <h2>{isLogin ? 'Sign in' : 'Create account'}</h2>
                <button type="button" className="auth-switch-top" onClick={() => setAuthMode(!isLogin)} disabled={loading}>
                  {isLogin ? 'Create account' : 'Sign in'}
                </button>
              </div>

              {!isLogin && (
                <p className="muted onboarding-inline-note">
                  Create your account first. After email verification, onboarding continues with photos, bio, and prompts.
                </p>
              )}

              {error && <div className="error-message">{error}</div>}
              {info  && <div className="encounter-status">{info}</div>}
              {devVerificationUrl && (
                <div className="encounter-status">
                  Dev link: <a href={devVerificationUrl} target="_blank" rel="noreferrer">Open verification</a>
                </div>
              )}

              <form onSubmit={isLogin ? handleLogin : handleSignup} className="profile-form">
                {isLogin ? (
                  <div className="form-group">
                    <label>Username *</label>
                    <input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)}
                      required disabled={loading} autoComplete="username" placeholder="your_username" />
                  </div>
                ) : (
                  <>
                    <div className="form-group">
                      <label>Username *</label>
                      <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                        required disabled={loading || awaitingVerification} autoComplete="username" placeholder="your_username" />
                    </div>
                    <div className="form-group">
                      <label>Email *</label>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                        required disabled={loading || awaitingVerification} autoComplete="email" placeholder="your@email.com" />
                    </div>
                  </>
                )}
                <div className="form-group">
                  <label>Password *</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    required disabled={loading || (!isLogin && awaitingVerification)} autoComplete={isLogin ? 'current-password' : 'new-password'}
                    placeholder={isLogin ? 'Enter your password' : 'At least 8 characters'} minLength="8" />
                </div>
                <button type="submit" className="btn-primary" disabled={loading || (!isLogin && awaitingVerification)}>
                  {loading ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}
                </button>
              </form>

              {!isLogin && (
                <button type="button" className="toggle-auth-btn" onClick={() => setAuthMode(true)} disabled={loading}>
                  {awaitingVerification ? 'Already verified? Sign in' : 'Already have an account? Sign in'}
                </button>
              )}
              {needsVerification && (
                <button type="button" className="toggle-auth-btn" onClick={handleResendVerification} disabled={loading}>
                  {loading ? 'Sending…' : 'Resend verification email'}
                </button>
              )}
            </>
          )}

          {/* ── PHOTOS STEP ── */}
          {step === 'photos' && (
            <>
              <h2 style={styles.stepTitle}>Add your photos</h2>
              <PhotoUploader photos={photos} setPhotos={setPhotos} />
              <div style={styles.navRow}>
                <button type="button" style={styles.backBtn} onClick={prevStep}>← Back</button>
                <button type="button" className="btn-primary" style={canProceedFrom.photos ? {} : styles.disabledBtn}
                  onClick={nextStep} disabled={!canProceedFrom.photos}>
                  Continue →
                </button>
              </div>
            </>
          )}

          {/* ── DESCRIPTION STEP ── */}
          {step === 'description' && (
            <>
              <h2 style={styles.stepTitle}>About you</h2>
              <DescriptionStep description={description} setDescription={setDescription} />
              <div style={styles.navRow}>
                <button type="button" style={styles.backBtn} onClick={prevStep}>← Back</button>
                <button type="button" className="btn-primary" style={canProceedFrom.description ? {} : styles.disabledBtn}
                  onClick={nextStep} disabled={!canProceedFrom.description}>
                  Continue →
                </button>
              </div>
            </>
          )}

          {/* ── PROMPTS STEP ── */}
          {step === 'prompts' && (
            <>
              <h2 style={styles.stepTitle}>Add some prompts</h2>
              <PromptsStep prompts={prompts} setPrompts={setPrompts} />
              <div style={styles.navRow}>
                <button type="button" style={styles.backBtn} onClick={prevStep}>← Back</button>
                <button type="button" className="btn-primary" style={canProceedFrom.prompts ? {} : styles.disabledBtn}
                  onClick={nextStep} disabled={!canProceedFrom.prompts}>
                  Continue →
                </button>
              </div>
            </>
          )}

          {/* ── REVIEW STEP ── */}
          {step === 'review' && (
            <>
              <h2 style={styles.stepTitle}>Your profile</h2>
              <ReviewStep username={username} email={email} photos={photos} description={description} prompts={prompts} />
              <div style={styles.navRow}>
                <button type="button" style={styles.backBtn} onClick={prevStep}>← Edit</button>
                <button type="button" className="btn-primary" onClick={handleFinish}>
                  Start exploring ✨
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}

// ─── Inline styles (non-aesthetic overrides only) ─────────────────
const styles = {
  stepBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 24, gap: 0,
  },
  stepDot: {
    width: 36, height: 36, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16, color: '#fff', fontWeight: 700,
    transition: 'all 0.25s ease',
    cursor: 'default',
  },
  stepLine: {
    flex: 1, height: 2, minWidth: 16, maxWidth: 40,
    transition: 'background 0.25s ease',
  },
  stepTitle:  { margin: '0 0 16px', fontSize: 22, fontWeight: 700 },
  stepHint:   { fontSize: 14, color: 'var(--text-muted)', margin: '0 0 16px', lineHeight: 1.5 },
  requireNote:{ fontSize: 12, color: '#e8875a', margin: '8px 0 0' },
  photoGrid:  { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 },
  photoCell:  { position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden' },
  photoImg:   { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  photoRemove:{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.55)',
                color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22,
                cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  photoAdd:   { aspectRatio: '1', borderRadius: 10, border: '2px dashed var(--muted-bg)',
                background: 'transparent', cursor: 'pointer', display: 'flex',
                flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)', transition: 'border-color 0.2s' },
  textarea:   { width: '100%', boxSizing: 'border-box', background: 'var(--input-bg, #1e1e2e)',
                border: '1.5px solid var(--input-border, #333)', borderRadius: 10,
                color: 'var(--text)', padding: '12px 14px', fontSize: 14, lineHeight: 1.55,
                resize: 'vertical', fontFamily: 'inherit', outline: 'none' },
  promptCard: { background: 'var(--card-bg, rgba(255,255,255,0.04))', borderRadius: 12,
                padding: 14, marginBottom: 12, border: '1px solid var(--border, rgba(255,255,255,0.08))' },
  promptSelect:{ background: 'transparent', border: 'none', color: 'var(--accent)', fontWeight: 700,
                 fontSize: 13, cursor: 'pointer', outline: 'none', flex: 1,
                 fontFamily: 'inherit', maxWidth: 'calc(100% - 32px)' },
  promptRemove:{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20,
                 cursor: 'pointer', lineHeight: 1, padding: '0 4px' },
  addPromptBtn:{ background: 'none', border: '1.5px dashed var(--accent)', color: 'var(--accent)',
                 borderRadius: 10, padding: '10px 16px', cursor: 'pointer', fontSize: 13,
                 fontWeight: 600, width: '100%', marginTop: 4 },
  navRow:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, gap: 12 },
  backBtn:    { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                fontSize: 14, padding: '10px 0', fontFamily: 'inherit' },
  disabledBtn:{ opacity: 0.4, cursor: 'not-allowed' },
  reviewCard: { border: '1px solid var(--border, rgba(255,255,255,0.08))', borderRadius: 16, overflow: 'hidden' },
  reviewPhotoStrip:{ display: 'flex', gap: 2, height: 140 },
  reviewPhoto:{ flex: 1, objectFit: 'cover', display: 'block' },
  reviewPhotoMore:{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 48,
                    background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: 14, fontWeight: 700 },
  reviewPrompt:{ borderTop: '1px solid var(--border, rgba(255,255,255,0.08))', padding: '10px 0' },
};

// Minimal CSS patch so select options are legible in dark mode
const css = `
  .profile-form-card select option { background: #1a1a2e; color: #fff; }
`;

export default ProfileForm;
