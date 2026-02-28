'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getEncounterProfile,
  skipEncounterProfile,
  recordInteraction,
  getPassedEncounterProfiles,
  restorePassedEncounterProfiles,
} from '@/lib/api';
import VideoChat from './VideoChat';

const ENCOUNTER_SECONDS = 30;
const SESSION_PASS_RESET_KEY = 'encounter-pass-reset-v1';

function formatSkippedAt(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
}

function InlineProfile({ profile }) {
  const photos = (profile?.photos || []).filter(Boolean);
  const prompts = (profile?.prompts || []).filter((p) => p?.question || p?.answer);

  return (
    <div className="encounter-body">
      <div className="encounter-flow">
        {photos[0] && (
          <div className="encounter-photo">
            <img src={photos[0]} alt={`${profile.name} photo 1`} />
          </div>
        )}

        {prompts.map((prompt, index) => (
          <React.Fragment key={`prompt-${index}`}>
            <div className="encounter-prompt">
              <h4>{prompt.question || 'Prompt'}</h4>
              <p>{prompt.answer || ''}</p>
            </div>
            {photos[index + 1] && (
              <div className="encounter-photo">
                <img src={photos[index + 1]} alt={`${profile.name} photo ${index + 2}`} />
              </div>
            )}
          </React.Fragment>
        ))}

        {prompts.length === 0 &&
          photos.slice(1).map((photo, index) => (
            <div key={`photo-${index}`} className="encounter-photo">
              <img src={photo} alt={`${profile.name} photo ${index + 2}`} />
            </div>
          ))}
      </div>

      {profile.about && (
        <div className="encounter-section">
          <h4>About</h4>
          <p>{profile.about}</p>
        </div>
      )}

      {profile.interests && profile.interests.length > 0 && (
        <div className="encounter-section">
          <h4>Interests</h4>
          <div className="encounter-interests">
            {profile.interests.map((interest, index) => (
              <span key={index} className="encounter-chip">
                {interest}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Encounter({ socket, socketConnected, currentUser }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(ENCOUNTER_SECONDS);
  const [requesting, setRequesting] = useState(false);
  const [encounterMatch, setEncounterMatch] = useState(null);
  const [inVideo, setInVideo] = useState(false);
  const [passedProfiles, setPassedProfiles] = useState([]);
  const [showPassedList, setShowPassedList] = useState(false);
  const [restoringPassed, setRestoringPassed] = useState(false);
  const timerRef = useRef(null);
  const advanceLockRef = useRef(false);
  const pendingConnectRef = useRef(false);
  const didSessionResetRef = useRef(false);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSecondsLeft(ENCOUNTER_SECONDS);
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const loadPassedProfiles = useCallback(async () => {
    try {
      const profiles = await getPassedEncounterProfiles();
      setPassedProfiles(profiles);
    } catch {
      setPassedProfiles([]);
    }
  }, []);

  const loadNext = useCallback(async () => {
    advanceLockRef.current = true;
    pendingConnectRef.current = false;
    setLoading(true);
    setStatusMessage('');
    setRequesting(false);
    setEncounterMatch(null);
    setInVideo(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    try {
      if (typeof window !== 'undefined' && !didSessionResetRef.current) {
        didSessionResetRef.current = true;
        if (!window.sessionStorage.getItem(SESSION_PASS_RESET_KEY)) {
          window.sessionStorage.setItem(SESSION_PASS_RESET_KEY, '1');
          await restorePassedEncounterProfiles().catch(() => {});
        }
      }

      const nextProfile = await getEncounterProfile();
      setProfile(nextProfile);
      if (nextProfile) {
        setPassedProfiles([]);
        setShowPassedList(false);
        resetTimer();
      } else {
        setSecondsLeft(0);
        await loadPassedProfiles();
      }
    } catch {
      setStatusMessage('Could not load encounters right now.');
    } finally {
      setLoading(false);
      advanceLockRef.current = false;
    }
  }, [resetTimer, loadPassedProfiles]);

  const restorePassedProfiles = useCallback(async () => {
    setRestoringPassed(true);
    try {
      await restorePassedEncounterProfiles();
      setPassedProfiles([]);
      setShowPassedList(false);
      await loadNext();
    } catch {
      setStatusMessage('Could not restore passed profiles right now.');
    } finally {
      setRestoringPassed(false);
    }
  }, [loadNext]);

  useEffect(() => {
    loadNext();
  }, [loadNext]);

  const handleTimerFinish = useCallback(async () => {
    if (!profile || advanceLockRef.current) return;
    advanceLockRef.current = true;
    try {
      await skipEncounterProfile(profile.id);
      await recordInteraction(profile.id, 'timeout');
    } catch {
      // ignore
    }
    await loadNext();
  }, [profile, loadNext]);

  useEffect(() => {
    if (secondsLeft === 0) {
      handleTimerFinish();
    }
  }, [secondsLeft, handleTimerFinish]);

  const handlePass = useCallback(async () => {
    if (!profile || advanceLockRef.current) return;
    advanceLockRef.current = true;
    try {
      await skipEncounterProfile(profile.id);
      await recordInteraction(profile.id, 'skipped');
    } catch {
      // ignore
    }
    await loadNext();
  }, [profile, loadNext]);

  const sendEncounterRequest = useCallback(
    (targetProfile) => {
      if (!targetProfile || !socket) return;
      console.info('[video:call-request:ok] encounter-request emitted', { targetUserId: targetProfile.id });
      socket.emit('client-diagnostic', {
        stage: 'call-request',
        status: 'ok',
        message: 'encounter-request emitted by client',
        meta: { targetUserId: targetProfile.id },
      });
      setRequesting(true);
      setStatusMessage('Waiting for the other person to connect...');
      socket.emit('encounter-request', { targetUserId: targetProfile.id });
    },
    [socket]
  );

  const handleConnect = useCallback(() => {
    if (!profile || !socket) {
      setStatusMessage('Connect to the encounter network to continue.');
      return;
    }
    if (!socketConnected && !socket.connected) {
      pendingConnectRef.current = true;
      setRequesting(true);
      setStatusMessage('Connecting to encounter network...');
      socket.connect();
      return;
    }

    pendingConnectRef.current = false;
    sendEncounterRequest(profile);
  }, [socket, profile, socketConnected, sendEncounterRequest]);

  useEffect(() => {
    if (!socket) return () => {};

    const onTimeout = async () => {
      pendingConnectRef.current = false;
      setStatusMessage('No mutual connect. Loading someone new.');
      setRequesting(false);
      if (profile) {
        try {
          await skipEncounterProfile(profile.id);
          await recordInteraction(profile.id, 'timeout');
        } catch {
          // ignore
        }
      }
      setTimeout(() => loadNext(), 600);
    };

    const handleMatch = (payload) => {
      pendingConnectRef.current = false;
      setStatusMessage('Connection established. Starting video.');
      setRequesting(false);
      setEncounterMatch(payload);
      setInVideo(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    const onSocketConnect = () => {
      if (pendingConnectRef.current && profile) {
        pendingConnectRef.current = false;
        sendEncounterRequest(profile);
      }
    };

    const onSocketConnectError = () => {
      pendingConnectRef.current = false;
      setRequesting(false);
      setStatusMessage('Encounter network unavailable. Try Connect again.');
    };

    socket.on('encounter-timeout', onTimeout);
    socket.on('encounter-match', handleMatch);
    socket.on('connect', onSocketConnect);
    socket.on('connect_error', onSocketConnectError);

    return () => {
      socket.off('encounter-timeout', onTimeout);
      socket.off('encounter-match', handleMatch);
      socket.off('connect', onSocketConnect);
      socket.off('connect_error', onSocketConnectError);
    };
  }, [socket, loadNext, profile, sendEncounterRequest]);

  useEffect(() => {
    if (!socket || !socketConnected) return () => {};
    socket.emit('encounter-ready');
    return () => {
      socket.emit('encounter-exit');
    };
  }, [socket, socketConnected]);

  useEffect(() => () => {
    pendingConnectRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const progress = useMemo(() => (secondsLeft / ENCOUNTER_SECONDS) * 100, [secondsLeft]);

  const handleVideoEnd = () => {
    setInVideo(false);
    setEncounterMatch(null);
    loadNext();
  };

  if (inVideo) {
    return (
      <VideoChat
        currentUser={currentUser}
        socket={socket}
        socketConnected={socketConnected}
        encounterMatch={encounterMatch}
        onConsumeEncounterMatch={() => setEncounterMatch(null)}
        onExit={handleVideoEnd}
      />
    );
  }

  if (loading) {
    return <div className="encounter-shell">Loading encounters...</div>;
  }

  if (!profile) {
    return (
      <div className="encounter-shell empty">
        <h2>No one is available right now</h2>
        <p>
          {passedProfiles.length > 0
            ? "You've passed everyone currently available."
            : 'Stay tuned, check back in a moment.'}
        </p>
        <div className="encounter-empty-actions">
          <button type="button" className="btn-solid" onClick={loadNext}>
            Refresh
          </button>
          {passedProfiles.length > 0 && (
            <>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setShowPassedList((prev) => !prev)}
              >
                {showPassedList
                  ? 'Hide passed profiles'
                  : `See passed profiles (${passedProfiles.length})`}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={restorePassedProfiles}
                disabled={restoringPassed}
              >
                {restoringPassed ? 'Restoring...' : 'Bring passed profiles back'}
              </button>
            </>
          )}
        </div>
        {showPassedList && passedProfiles.length > 0 && (
          <div className="encounter-passed-list">
            {passedProfiles.map((passed) => (
              <div key={passed.id} className="encounter-passed-item">
                {passed.photo && (
                  <img
                    src={passed.photo}
                    alt={`${passed.name} profile`}
                    className="encounter-passed-avatar"
                  />
                )}
                <div className="encounter-passed-meta">
                  <strong>
                    {passed.name}
                    {passed.age ? `, ${passed.age}` : ''}
                  </strong>
                  {passed.location && <p className="muted">{passed.location}</p>}
                  {formatSkippedAt(passed.skippedAt) && (
                    <p className="muted">Passed on {formatSkippedAt(passed.skippedAt)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="encounter-shell">
      <div className="encounter-header">
        <div>
          <p className="eyebrow">Encounter</p>
          <h2>
            {profile.name}
            {profile.age ? `, ${profile.age}` : ''}
          </h2>
          {profile.location && <p className="muted">{profile.location}</p>}
        </div>
        <div className="encounter-timer">
          <div className="timer-label">
            <span>{secondsLeft}s</span>
            <span className="muted">to decide</span>
          </div>
          <div className="timer-bar">
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="encounter-card">
        <InlineProfile profile={profile} />
      </div>

      {statusMessage && <div className="encounter-status">{statusMessage}</div>}
      {!statusMessage && !socketConnected && (
        <div className="encounter-status">Encounter network reconnecting...</div>
      )}

      <div className="encounter-actions">
        <button type="button" className="btn-ghost" onClick={handlePass} disabled={requesting}>
          Pass
        </button>
        <button
          type="button"
          className="btn-solid"
          onClick={handleConnect}
          disabled={requesting}
        >
          Connect
        </button>
      </div>
    </div>
  );
}

