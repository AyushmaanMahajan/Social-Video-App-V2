'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getEncounterProfile, skipEncounterProfile, recordInteraction } from '@/lib/api';
import VideoChat from './VideoChat';

const ENCOUNTER_SECONDS = 30;

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
  const timerRef = useRef(null);
  const advanceLockRef = useRef(false);

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

  const loadNext = useCallback(async () => {
    advanceLockRef.current = true;
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
      const nextProfile = await getEncounterProfile();
      setProfile(nextProfile);
      if (nextProfile) {
        resetTimer();
      } else {
        setSecondsLeft(0);
      }
    } catch (e) {
      setStatusMessage('Could not load encounters right now.');
    } finally {
      setLoading(false);
      advanceLockRef.current = false;
    }
  }, [resetTimer]);

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

  const handleConnect = useCallback(() => {
    if (!profile || !socket) {
      setStatusMessage('Connect to the encounter network to continue.');
      return;
    }
    setRequesting(true);
    setStatusMessage('Waiting for the other person to connect...');
    socket.emit('encounter-request', { targetUserId: profile.id });
  }, [socket, profile]);

  useEffect(() => {
    if (!socket) return () => {};

    const onTimeout = async () => {
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
      setStatusMessage('Connection established. Starting video.');
      setRequesting(false);
      setEncounterMatch(payload);
      setInVideo(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    socket.on('encounter-timeout', onTimeout);
    socket.on('encounter-match', handleMatch);
    socket.on('encounter-ready-ack', () => {});

    return () => {
      socket.off('encounter-timeout', onTimeout);
      socket.off('encounter-match', handleMatch);
      socket.off('encounter-ready-ack');
    };
  }, [socket, loadNext, profile]);

  useEffect(() => {
    if (!socket || !socketConnected) return () => {};
    socket.emit('encounter-ready');
    return () => {
      socket.emit('encounter-exit');
    };
  }, [socket, socketConnected]);

  useEffect(() => () => {
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
        <p>Stay tuned—check back in a moment.</p>
        <button type="button" className="btn-solid" onClick={loadNext}>
          Refresh
        </button>
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

      <div className="encounter-actions">
        <button type="button" className="btn-ghost" onClick={handlePass} disabled={requesting}>
          Pass
        </button>
        <button
          type="button"
          className="btn-solid"
          onClick={handleConnect}
          disabled={!socketConnected || requesting}
        >
          Connect
        </button>
      </div>
    </div>
  );
}
