'use client';

import React, { useMemo, useState } from 'react';
import { completeOnboarding } from '@/lib/api';

const STEPS = ['username', 'birthdate', 'gender', 'safety', 'photo'];

const GENDER_OPTIONS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

function OnboardingFlow({ onCompleted, initialUsername = '' }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [username, setUsername] = useState(initialUsername);
  const [birthdate, setBirthdate] = useState('');
  const [gender, setGender] = useState('female');
  const [genderVisible, setGenderVisible] = useState(true);
  const [safetyConfirmed, setSafetyConfirmed] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const activeStep = STEPS[stepIndex];
  const progress = useMemo(() => ((stepIndex + 1) / STEPS.length) * 100, [stepIndex]);

  const validateCurrentStep = () => {
    if (activeStep === 'username') {
      const normalized = username.trim();
      if (!/^[A-Za-z0-9_]{3,20}$/.test(normalized)) {
        setError('Username must be 3-20 characters with letters, numbers, or underscores.');
        return false;
      }
    }

    if (activeStep === 'birthdate') {
      if (!birthdate) {
        setError('Birthdate is required.');
        return false;
      }
      const today = new Date();
      const date = new Date(`${birthdate}T00:00:00.000Z`);
      if (Number.isNaN(date.getTime())) {
        setError('Birthdate is invalid.');
        return false;
      }
      if (date > today) {
        setError('Birthdate cannot be in the future.');
        return false;
      }
    }

    if (activeStep === 'safety' && !safetyConfirmed) {
      setError('You must confirm the safety acknowledgement.');
      return false;
    }

    setError('');
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    setStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1));
    setInfo('');
  };

  const handleBack = () => {
    setError('');
    setInfo('');
    setStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be 5MB or smaller.');
      return;
    }
    setError('');
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoUrl('');
  };

  const uploadPhoto = async () => {
    if (!photoFile) return '';
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', photoFile);
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error || 'Photo upload failed.');
      }
      setPhotoUrl(payload.url);
      return payload.url;
    } catch (uploadError) {
      setError(uploadError?.message || 'Photo upload failed.');
      return '';
    } finally {
      setUploading(false);
    }
  };

  const handleFinish = async () => {
    if (!validateCurrentStep()) return;

    setSubmitting(true);
    setError('');
    setInfo('');

    try {
      let finalPhotoUrl = photoUrl;
      if (photoFile && !finalPhotoUrl) {
        finalPhotoUrl = await uploadPhoto();
        if (!finalPhotoUrl) {
          setSubmitting(false);
          return;
        }
      }

      const result = await completeOnboarding({
        username,
        birthdate,
        gender,
        genderVisible,
        safetyAcknowledged: safetyConfirmed,
        profilePhotoUrl: finalPhotoUrl || undefined,
      });
      onCompleted(result.user);
    } catch (submitError) {
      setError(submitError?.response?.data?.error || 'Could not complete onboarding.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="profile-form-container">
      <div className="profile-form-card onboarding-card">
        <h2>Complete onboarding</h2>
        <p className="muted onboarding-inline-note">Step {stepIndex + 1} of {STEPS.length}</p>
        <div className="timer-bar onboarding-progress">
          <span style={{ width: `${progress}%` }} />
        </div>

        {error && <div className="error-message">{error}</div>}
        {info && <div className="encounter-status">{info}</div>}

        {activeStep === 'username' && (
          <div className="form-group">
            <label>Choose a unique username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your_username"
              autoFocus
            />
            <p className="muted onboarding-inline-note">
              3-20 characters, letters/numbers/underscores only.
            </p>
          </div>
        )}

        {activeStep === 'birthdate' && (
          <div className="form-group">
            <label>Birthdate</label>
            <input
              type="date"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
            />
            <p className="muted onboarding-inline-note">
              This information is used to calculate your age and cannot be changed later.
            </p>
          </div>
        )}

        {activeStep === 'gender' && (
          <div className="form-group">
            <label>Gender</label>
            <select value={gender} onChange={(e) => setGender(e.target.value)}>
              {GENDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <label className="toggle-item onboarding-toggle">
              <span>Show gender on profile</span>
              <input
                type="checkbox"
                className="toggle-checkbox"
                checked={genderVisible}
                onChange={(e) => setGenderVisible(e.target.checked)}
              />
            </label>
            <p className="muted onboarding-inline-note">Gender cannot be changed later.</p>
          </div>
        )}

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
              <input
                type="checkbox"
                className="toggle-checkbox"
                checked={safetyConfirmed}
                onChange={(e) => setSafetyConfirmed(e.target.checked)}
              />
            </label>
          </div>
        )}

        {activeStep === 'photo' && (
          <div className="form-group">
            <label>Profile photo (optional)</label>
            <input type="file" accept="image/*" onChange={handlePhotoChange} />
            <p className="muted onboarding-inline-note">
              Adding a photo improves trust. Uploaded photos pass moderation checks.
            </p>
            {photoPreview && (
              <div className="onboarding-photo-preview">
                <img src={photoPreview} alt="Profile preview" />
              </div>
            )}
          </div>
        )}

        <div className="onboarding-actions">
          <button
            type="button"
            className="btn-ghost"
            onClick={handleBack}
            disabled={stepIndex === 0 || submitting || uploading}
          >
            Back
          </button>
          {stepIndex < STEPS.length - 1 ? (
            <button
              type="button"
              className="btn-solid"
              onClick={handleNext}
              disabled={submitting || uploading}
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              className="btn-solid"
              onClick={handleFinish}
              disabled={submitting || uploading}
            >
              {submitting || uploading ? 'Finishing...' : 'Enter encounter pool'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default OnboardingFlow;
