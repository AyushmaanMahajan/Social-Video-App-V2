'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { completeOnboarding } from '@/lib/api';
import { detectBrowserLocation } from '@/lib/browserLocation';

// ─── Step config ────────────────────────────────────────────────────────────
const DEFAULT_STEPS        = ['username', 'birthdate', 'gender', 'safety', 'photos', 'description', 'prompts'];
const STEPS_WITHOUT_USERNAME = ['birthdate', 'gender', 'safety', 'photos', 'description', 'prompts'];

const STEP_META = {
  username:    { icon: 'user',          label: 'Username'  },
  birthdate:   { icon: 'calendar',      label: 'Birthdate' },
  gender:      { icon: 'users',         label: 'Gender'    },
  safety:      { icon: 'shield',        label: 'Safety'    },
  photos:      { icon: 'camera',        label: 'Photos'    },
  description: { icon: 'pencil',        label: 'About you' },
  prompts:     { icon: 'message-circle',label: 'Prompts'   },
};

const GENDER_OPTIONS = [
  { value: 'female',           label: 'Female'           },
  { value: 'male',             label: 'Male'             },
  { value: 'non-binary',       label: 'Non-binary'       },
  { value: 'prefer_not_to_say',label: 'Prefer not to say'},
];

const PROMPT_OPTIONS = [
  'My ideal weekend looks like…',
  'The way to my heart is…',
  "I'm looking for someone who…",
  'A fact about me that surprises people…',
  'My most controversial opinion is…',
  "I'm happiest when…",
  'The best trip I\'ve ever taken was…',
  "Don't hate me if I…",
];

function Icon({ name, size = 16, style }) {
  const shared = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' };

  const paths = {
    user: (
      <>
        <circle cx="12" cy="8" r="4" {...shared} />
        <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" {...shared} />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" {...shared} />
        <path d="M8 3v4M16 3v4M3 10h18" {...shared} />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" {...shared} />
        <circle cx="16" cy="9" r="2.5" {...shared} />
        <path d="M3 19c0-3.2 2.8-5.2 6-5.2s6 2 6 5.2" {...shared} />
        <path d="M14 19c0-2.1 1.7-3.4 3.8-3.4 1.2 0 2.3.4 3.2 1.2" {...shared} />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 5 6v5.5c0 4.5 2.9 7.8 7 9.5 4.1-1.7 7-5 7-9.5V6z" {...shared} />
      </>
    ),
    camera: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2.5" {...shared} />
        <path d="M8 7 9.5 4.8h5L16 7" {...shared} />
        <circle cx="12" cy="13.5" r="3.2" {...shared} />
      </>
    ),
    pencil: (
      <>
        <path d="m4 20 4.2-1 9.5-9.5a2.2 2.2 0 0 0 0-3.1l-.1-.1a2.2 2.2 0 0 0-3.1 0L5 15.8 4 20z" {...shared} />
        <path d="m12.8 7.2 4 4" {...shared} />
      </>
    ),
    'message-circle': (
      <>
        <path d="M21 11.5a8.5 8.5 0 1 1-3.1-6.6A8.4 8.4 0 0 1 21 11.5z" {...shared} />
        <path d="M9 20.5 5 22l1.3-3.4" {...shared} />
      </>
    ),
    'check-circle': (
      <>
        <circle cx="12" cy="12" r="9" {...shared} />
        <path d="m8.5 12.3 2.4 2.5 4.6-5" {...shared} />
      </>
    ),
    'alert-triangle': (
      <>
        <path d="M12 4 3.5 19h17L12 4z" {...shared} />
        <path d="M12 9v5M12 17.1h.01" {...shared} />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    >
      {paths[name] || paths.user}
    </svg>
  );
}

// ─── Step-bar ────────────────────────────────────────────────────────────────
function StepBar({ steps, currentIndex }) {
  return (
    <div style={s.stepBar}>
      {steps.map((id, i) => {
        const done   = i < currentIndex;
        const active = i === currentIndex;
        return (
          <React.Fragment key={id}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{
                ...s.stepDot,
                background:  done || active ? 'var(--accent)' : 'var(--muted-bg, #2a2a3a)',
                opacity:     done || active ? 1 : 0.35,
                transform:   active ? 'scale(1.18)' : 'scale(1)',
                boxShadow:   active ? '0 0 0 3px var(--accent-soft, rgba(255,140,80,0.25))' : 'none',
                transition:  'all 0.25s ease',
              }}>
                <Icon name={done ? 'check-circle' : STEP_META[id].icon} size={16} />
              </div>
              <span style={{
                fontSize: 9, letterSpacing: 0.3, textTransform: 'uppercase',
                color: active ? 'var(--accent)' : 'var(--text-muted)',
                fontWeight: active ? 700 : 400,
              }}>
                {STEP_META[id].label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: 2, minWidth: 8, maxWidth: 32, marginBottom: 14,
                background: i < currentIndex ? 'var(--accent)' : 'var(--muted-bg, #2a2a3a)',
                opacity: i < currentIndex ? 1 : 0.3,
                transition: 'background 0.25s ease',
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Photos step ─────────────────────────────────────────────────────────────
function PhotosStep({ photos, setPhotos }) {
  const inputRef = useRef();
  const MIN = 3;

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    const next = files
      .filter(f => f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024)
      .map(f => ({ file: f, url: URL.createObjectURL(f) }));
    setPhotos(prev => [...prev, ...next].slice(0, 9));
  };

  const remove = (idx) => setPhotos(prev => prev.filter((_, i) => i !== idx));

  return (
    <div className="form-group">
      <label>Add your photos</label>
      <p className="muted onboarding-inline-note">
        At least <strong>{MIN} photos</strong> required for a complete profile.
      </p>
      <div style={s.photoGrid}>
        {photos.map((p, i) => (
          <div key={i} style={s.photoCell}>
            <img src={p.url} alt="" style={s.photoImg} />
            <button onClick={() => remove(i)} style={s.photoRemove} type="button">×</button>
          </div>
        ))}
        {photos.length < 9 && (
          <button onClick={() => inputRef.current.click()} style={s.photoAdd} type="button">
            <span style={{ fontSize: 26, lineHeight: 1 }}>+</span>
            <span style={{ fontSize: 11, marginTop: 4 }}>Add photo</span>
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: 'none' }} />
      {photos.length < MIN && (
        <p style={s.warn}>
          <Icon name="alert-triangle" size={13} />
          {MIN - photos.length} more photo{photos.length < MIN - 1 ? 's' : ''} needed to continue
        </p>
      )}
    </div>
  );
}

// ─── Description step ─────────────────────────────────────────────────────────
function DescriptionStep({ description, setDescription }) {
  const MIN = 50;
  const left = MIN - description.length;
  return (
    <div className="form-group">
      <label>About you</label>
      <p className="muted onboarding-inline-note">
        Write a short bio — at least <strong>{MIN} characters</strong>
      </p>
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="I'm a curious human who loves hiking, coffee, and bad puns. Ask me about…"
        style={s.textarea}
        rows={5}
        maxLength={400}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        {left > 0
          ? (
            <span style={s.warn}>
              <Icon name="alert-triangle" size={13} />
              {left} more character{left !== 1 ? 's' : ''} needed
            </span>
          )
          : (
            <span style={{ fontSize: 12, color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Icon name="check-circle" size={13} />
              Looking good!
            </span>
          )
        }
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{description.length}/400</span>
      </div>
    </div>
  );
}

// ─── Prompts step ─────────────────────────────────────────────────────────────
function PromptsStep({ prompts, setPrompts }) {
  const MIN = 2;

  const add    = () => { if (prompts.length < 3) setPrompts(p => [...p, { question: PROMPT_OPTIONS[0], answer: '' }]); };
  const setQ   = (i, v) => setPrompts(p => p.map((x, idx) => idx === i ? { ...x, question: v } : x));
  const setA   = (i, v) => setPrompts(p => p.map((x, idx) => idx === i ? { ...x, answer:   v } : x));
  const remove = (i)    => setPrompts(p => p.filter((_, idx) => idx !== i));

  const answered = prompts.filter(p => p.answer.trim().length >= 10).length;

  return (
    <div className="form-group">
      <label>Add prompts</label>
      <p className="muted onboarding-inline-note">
        Answer at least <strong>{MIN} prompts</strong> to complete this section.
      </p>
      {prompts.map((p, i) => (
        <div key={i} style={s.promptCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <select value={p.question} onChange={e => setQ(i, e.target.value)} style={s.promptSelect}>
              {PROMPT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {prompts.length > 1 && (
              <button onClick={() => remove(i)} style={s.promptRemove} type="button">×</button>
            )}
          </div>
          <textarea
            value={p.answer}
            onChange={e => setA(i, e.target.value)}
            placeholder="Your answer…"
            style={{ ...s.textarea, minHeight: 64 }}
            rows={3}
            maxLength={150}
          />
          {p.answer.trim().length > 0 && p.answer.trim().length < 10 && (
            <span style={{ ...s.warn, display: 'inline-flex', marginTop: 4, fontSize: 11 }}>
              <Icon name="alert-triangle" size={12} />
              Answer a bit more
            </span>
          )}
        </div>
      ))}
      {prompts.length < 3 && (
        <button onClick={add} style={s.addPromptBtn} type="button">+ Add another prompt</button>
      )}
      {answered < MIN && (
        <p style={s.warn}>
          <Icon name="alert-triangle" size={13} />
          {MIN - answered} more answered prompt{answered < MIN - 1 ? 's' : ''} needed to continue
        </p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
function OnboardingFlow({ onCompleted, initialUsername = '' }) {
  const normalizedInitialUsername = String(initialUsername || '').trim();
  const steps = useMemo(
    () => (normalizedInitialUsername ? STEPS_WITHOUT_USERNAME : DEFAULT_STEPS),
    [normalizedInitialUsername]
  );

  const [stepIndex,      setStepIndex]      = useState(0);
  const [username,       setUsername]       = useState(normalizedInitialUsername);
  const [birthdate,      setBirthdate]      = useState('');
  const [gender,         setGender]         = useState('female');
  const [genderVisible,  setGenderVisible]  = useState(true);
  const [location,       setLocation]       = useState('');
  const [showLocation,   setShowLocation]   = useState(true);
  const [safetyConfirmed,setSafetyConfirmed]= useState(false);
  const [photos,         setPhotos]         = useState([]);
  const [description,    setDescription]    = useState('');
  const [prompts,        setPrompts]        = useState([{ question: PROMPT_OPTIONS[0], answer: '' }]);
  const [uploading,      setUploading]      = useState(false);
  const [submitting,     setSubmitting]     = useState(false);
  const [locationStatus, setLocationStatus] = useState('idle');
  const [locationError,  setLocationError]  = useState('');
  const [error,          setError]          = useState('');
  const [info,           setInfo]           = useState('');

  const activeStep = steps[stepIndex];
  const progress   = ((stepIndex + 1) / steps.length) * 100;

  const handleDetectLocation = useCallback(async () => {
    setLocationStatus('loading');
    setLocationError('');

    try {
      const detectedLocation = await detectBrowserLocation();
      setLocation(detectedLocation);
      setLocationStatus('ready');
    } catch (detectError) {
      setLocationStatus('error');
      setLocationError(detectError?.message || 'Could not detect location from your browser.');
    }
  }, []);

  useEffect(() => {
    handleDetectLocation();
  }, [handleDetectLocation]);

  // ── Gate logic ──────────────────────────────────────────────────────────────
  const stepCanProceed = {
    username:    /^[A-Za-z0-9_]{3,20}$/.test(username.trim()),
    birthdate:   !!birthdate && !isNaN(new Date(`${birthdate}T00:00:00.000Z`).getTime()) && new Date(`${birthdate}T00:00:00.000Z`) <= new Date(),
    gender:      true,
    safety:      safetyConfirmed,
    photos:      photos.length >= 3,
    description: description.trim().length >= 50,
    prompts:     prompts.filter(p => p.answer.trim().length >= 10).length >= 2,
  };

  const canProceed = stepCanProceed[activeStep] ?? true;

  // ── Validation messages (for explicit Next press when not ready) ─────────────
  const getStepError = () => {
    if (activeStep === 'username'    && !stepCanProceed.username)    return 'Username must be 3-20 characters with letters, numbers, or underscores.';
    if (activeStep === 'birthdate'   && !stepCanProceed.birthdate)   return 'Please enter a valid birthdate.';
    if (activeStep === 'safety'      && !stepCanProceed.safety)      return 'You must confirm the safety acknowledgement.';
    if (activeStep === 'photos'      && !stepCanProceed.photos)      return `Please add at least ${3 - photos.length} more photo${3 - photos.length !== 1 ? 's' : ''}.`;
    if (activeStep === 'description' && !stepCanProceed.description) return `Your bio needs ${50 - description.trim().length} more characters.`;
    if (activeStep === 'prompts'     && !stepCanProceed.prompts)     return 'Please answer at least 2 prompts (10+ characters each).';
    return '';
  };

  const handleNext = () => {
    const err = getStepError();
    if (err) { setError(err); return; }
    setError(''); setInfo('');
    setStepIndex(prev => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setError(''); setInfo('');
    setStepIndex(prev => Math.max(prev - 1, 0));
  };

  const uploadPhotos = async () => {
    setUploading(true);
    try {
      const urls = [];
      for (const p of photos) {
        const formData = new FormData();
        formData.append('file', p.file);
        const res     = await fetch('/api/upload', { method: 'POST', body: formData });
        const payload = await res.json();
        if (!res.ok || !payload?.url) throw new Error(payload?.error || 'Photo upload failed.');
        urls.push(payload.url);
      }
      return urls;
    } finally {
      setUploading(false);
    }
  };

  const handleFinish = async () => {
    const err = getStepError();
    if (err) { setError(err); return; }

    setSubmitting(true); setError(''); setInfo('');
    try {
      const photoUrls = await uploadPhotos();
      const result = await completeOnboarding({
        username,
        birthdate,
        gender,
        genderVisible,
        location,
        showLocation,
        safetyAcknowledged: safetyConfirmed,
        profilePhotoUrl:    photoUrls[0] || undefined,
        additionalPhotos:   photoUrls.slice(1),
        description,
        prompts: prompts.filter(p => p.answer.trim().length >= 10),
      });
      onCompleted(result.user);
    } catch (submitError) {
      setError(submitError?.response?.data?.error || submitError?.message || 'Could not complete onboarding.');
    } finally {
      setSubmitting(false);
    }
  };

  const isLastStep = stepIndex === steps.length - 1;
  const busy       = submitting || uploading;

  return (
    <>
      <style>{css}</style>
      <div className="profile-form-container">
        <div className="profile-form-card onboarding-card">

          <StepBar steps={steps} currentIndex={stepIndex} />

          <h2 style={{ margin: '4px 0 2px', fontSize: 20, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Icon name={STEP_META[activeStep].icon} size={18} />
            {STEP_META[activeStep].label}
          </h2>
          <p className="muted onboarding-inline-note" style={{ marginBottom: 16 }}>
            Step {stepIndex + 1} of {steps.length}
          </p>

          <div className="timer-bar onboarding-progress">
            <span style={{ width: `${progress}%`, transition: 'width 0.35s ease' }} />
          </div>

          {error && <div className="error-message">{error}</div>}
          {info  && <div className="encounter-status">{info}</div>}

          {/* ── USERNAME ── */}
          {activeStep === 'username' && (
            <div className="form-group">
              <label>Choose a unique username</label>
              <input
                type="text" value={username} autoFocus
                onChange={e => setUsername(e.target.value)}
                placeholder="your_username"
              />
              <p className="muted onboarding-inline-note">3-20 characters, letters/numbers/underscores only.</p>
            </div>
          )}

          {/* ── BIRTHDATE ── */}
          {activeStep === 'birthdate' && (
            <div className="form-group">
              <label>Birthdate</label>
              <input
                type="date" value={birthdate}
                onChange={e => setBirthdate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
              />
              <p className="muted onboarding-inline-note">
                Used to calculate your age and cannot be changed later.
              </p>
            </div>
          )}

          {/* ── GENDER ── */}
          {activeStep === 'gender' && (
            <div className="form-group">
              <label>Gender</label>
              <div className="onboarding-gender-grid" role="radiogroup" aria-label="Select your gender">
                {GENDER_OPTIONS.map((o) => {
                  const selected = gender === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setGender(o.value)}
                      className={`onboarding-gender-option${selected ? ' is-active' : ''}`}
                    >
                      <span>{o.label}</span>
                      {selected && (
                        <span className="onboarding-gender-check">
                          <Icon name="check-circle" size={14} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <label className="toggle-item onboarding-toggle">
                <span>Show gender on profile</span>
                <input type="checkbox" className="toggle-checkbox" checked={genderVisible}
                  onChange={e => setGenderVisible(e.target.checked)} />
              </label>
              <div className="form-group" style={{ marginTop: 12 }}>
                <label>Location</label>
                <input
                  type="text"
                  value={location}
                  readOnly
                  placeholder={locationStatus === 'loading' ? 'Detecting your location...' : 'Using your browser location'}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={handleDetectLocation}
                    disabled={locationStatus === 'loading'}
                  >
                    {locationStatus === 'loading' ? 'Detecting...' : 'Use current location'}
                  </button>
                  {location && <span className="muted">Auto-filled from browser</span>}
                </div>
                {locationError && <p className="muted onboarding-inline-note">{locationError}</p>}
              </div>
              <label className="toggle-item onboarding-toggle">
                <span>Show location on profile</span>
                <input type="checkbox" className="toggle-checkbox" checked={showLocation}
                  onChange={e => setShowLocation(e.target.checked)} />
              </label>
              <p className="muted onboarding-inline-note">Gender cannot be changed later.</p>
            </div>
          )}

          {/* ── SAFETY ── */}
          {activeStep === 'safety' && (
            <div className="form-group">
              <label>Safety acknowledgement</label>
              <ul className="onboarding-safety-list">
                <li>The platform enforces respectful conduct.</li>
                <li>Harassment results in immediate bans.</li>
                <li>All encounters can be reported.</li>
                <li>Moderation actively reviews reports.</li>
              </ul>
              <label className="toggle-item onboarding-toggle">
                <span>I understand and agree</span>
                <input type="checkbox" className="toggle-checkbox" checked={safetyConfirmed}
                  onChange={e => setSafetyConfirmed(e.target.checked)} />
              </label>
            </div>
          )}

          {/* ── PHOTOS ── */}
          {activeStep === 'photos' && (
            <PhotosStep photos={photos} setPhotos={setPhotos} />
          )}

          {/* ── DESCRIPTION ── */}
          {activeStep === 'description' && (
            <DescriptionStep description={description} setDescription={setDescription} />
          )}

          {/* ── PROMPTS ── */}
          {activeStep === 'prompts' && (
            <PromptsStep prompts={prompts} setPrompts={setPrompts} />
          )}

          {/* ── NAV ── */}
          <div className="onboarding-actions">
            <button
              type="button" className="btn-ghost"
              onClick={handleBack}
              disabled={stepIndex === 0 || busy}
            >
              Back
            </button>
            {!isLastStep ? (
              <button
                type="button" className="btn-solid"
                onClick={handleNext}
                disabled={busy}
                style={!canProceed ? s.dimBtn : {}}
                title={!canProceed ? getStepError() : undefined}
              >
                Continue
              </button>
            ) : (
              <button
                type="button" className="btn-solid"
                onClick={handleFinish}
                disabled={busy || !canProceed}
                style={!canProceed ? s.dimBtn : {}}
              >
                {busy ? 'Finishing…' : 'Enter encounter pool'}
              </button>
            )}
          </div>

        </div>
      </div>
    </>
  );
}

// ─── Inline styles ─────────────────────────────────────────────────────────
const s = {
  stepBar: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    marginBottom: 20, gap: 0,
  },
  stepDot: {
    width: 34, height: 34, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 15, color: '#fff', fontWeight: 700, cursor: 'default',
  },
  photoGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 4,
  },
  photoCell: {
    position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden',
  },
  photoImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  photoRemove: {
    position: 'absolute', top: 4, right: 4,
    background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none',
    borderRadius: '50%', width: 22, height: 22,
    cursor: 'pointer', fontSize: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  photoAdd: {
    aspectRatio: '1', borderRadius: 10,
    border: '2px dashed var(--muted-bg, #2a2a3a)',
    background: 'transparent', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    color: 'var(--text-muted)', transition: 'border-color 0.2s',
  },
  textarea: {
    width: '100%', boxSizing: 'border-box',
    background: 'var(--input-bg, #1e1e2e)',
    border: '1.5px solid var(--input-border, #333)',
    borderRadius: 10, color: 'var(--text)',
    padding: '12px 14px', fontSize: 14, lineHeight: 1.55,
    resize: 'vertical', fontFamily: 'inherit', outline: 'none',
  },
  promptCard: {
    background: 'var(--card-bg, rgba(255,255,255,0.04))',
    borderRadius: 12, padding: 14, marginBottom: 12,
    border: '1px solid var(--border, rgba(255,255,255,0.08))',
  },
  promptSelect: {
    background: 'transparent', border: 'none',
    color: 'var(--accent)', fontWeight: 700,
    fontSize: 13, cursor: 'pointer', outline: 'none',
    fontFamily: 'inherit', flex: 1, minWidth: 0,
  },
  promptRemove: {
    background: 'none', border: 'none',
    color: 'var(--text-muted)', fontSize: 20,
    cursor: 'pointer', lineHeight: 1, padding: '0 4px', flexShrink: 0,
  },
  addPromptBtn: {
    background: 'none', border: '1.5px dashed var(--accent)',
    color: 'var(--accent)', borderRadius: 10,
    padding: '10px 16px', cursor: 'pointer',
    fontSize: 13, fontWeight: 600, width: '100%', marginTop: 4,
    fontFamily: 'inherit',
  },
  warn:   { fontSize: 12, color: '#e8875a', margin: '8px 0 0', display: 'flex', alignItems: 'center', gap: 6 },
  dimBtn: { opacity: 0.45, cursor: 'not-allowed' },
};

const css = `
  .profile-form-card select option { background: #1a1a2e; color: #fff; }

  .onboarding-gender-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-top: 8px;
  }

  .onboarding-gender-option {
    border: 1.5px solid var(--border, rgba(255, 255, 255, 0.15));
    background: var(--card-bg, rgba(255, 255, 255, 0.04));
    color: var(--text);
    border-radius: 12px;
    min-height: 44px;
    padding: 10px 12px;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: space-between;
    text-align: left;
  }

  .onboarding-gender-option:hover {
    border-color: rgba(147, 210, 255, 0.55);
    background: rgba(147, 210, 255, 0.08);
  }

  .onboarding-gender-option:focus-visible {
    outline: none;
    border-color: var(--accent, #93d2ff);
    box-shadow: 0 0 0 3px rgba(147, 210, 255, 0.2);
  }

  .onboarding-gender-option.is-active {
    border-color: var(--accent, #93d2ff);
    background: rgba(147, 210, 255, 0.14);
  }

  .onboarding-gender-check {
    color: var(--accent, #93d2ff);
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  @media (max-width: 460px) {
    .onboarding-gender-grid {
      grid-template-columns: 1fr;
    }
  }
`;

export default OnboardingFlow;
