'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useVideoSocket } from '@/lib/useVideoSocket';
import { getIceServers } from '@/lib/webrtcConfig';

function VideoChat({
  currentUser,
  socket: externalSocket,
  socketConnected: externalConnected,
  encounterMatch,
  onConsumeEncounterMatch,
  onExit,
}) {
  const { socket: hookSocket, connected: hookConnected } = useVideoSocket(!externalSocket);
  const socket = externalSocket || hookSocket;
  const socketConnected = externalSocket ? externalConnected : hookConnected;

  const [callState, setCallState] = useState('idle'); // idle | connecting | connected | ended
  const [connectionStatus, setConnectionStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [peer, setPeer] = useState(null);
  const [callId, setCallId] = useState(null);

  const isCallerRef = useRef(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

  const testMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('videoTest');

  const cleanup = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    pendingCandidatesRef.current = [];
    setConnectionStatus('');
    setCallState('idle');
    setPeer(null);
    setCallId(null);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 768px)');
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const ensureLocalStream = useCallback(async () => {
    if (localStreamRef.current) {
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
      return localStreamRef.current;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('call-accepted', () => {
      setCallState('connecting');
      setConnectionStatus('Connecting...');
    });
    socket.on('call-rejected', (data) => {
      setErrorMessage(data?.reason || 'Call rejected');
      setCallState('ended');
      cleanup();
      onExit?.();
    });
    socket.on('call-timeout', () => {
      setErrorMessage('Call timed out');
      setCallState('ended');
      cleanup();
      onExit?.();
    });
    socket.on('call-ended', (data) => {
      setErrorMessage(data?.reason === 'disconnected' ? 'Call ended' : data?.reason || 'Call ended');
      setCallState('ended');
      cleanup();
      onExit?.();
    });
    socket.on('error', (data) => {
      setErrorMessage(data?.message || 'Error');
    });

    return () => {
      socket.off('call-accepted');
      socket.off('call-rejected');
      socket.off('call-timeout');
      socket.off('call-ended');
      socket.off('error');
    };
  }, [socket, cleanup, onExit]);

  useEffect(() => {
    if (!socket || (callState !== 'connecting' && callState !== 'connected')) return;

    const pc = new RTCPeerConnection(getIceServers());

    if (testMode === 'ice_failure') {
      pc.close();
      setConnectionStatus('ICE failed (test)');
      socket.emit('ice-failure', {});
      setCallState('ended');
      cleanup();
      return;
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit('webrtc-ice', e.candidate);
    };
    pc.oniceconnectionstatechange = () => {
      setConnectionStatus(pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed') {
        socket.emit('ice-failure', {});
        cleanup();
      }
      if (pc.iceConnectionState === 'connected') setCallState('connected');
    };
    pc.ontrack = (e) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
    };

    peerConnectionRef.current = pc;

    const attachStream = (stream) => {
      if (!stream || !pc) return;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    };

    if (localStreamRef.current) attachStream(localStreamRef.current);

    socket.on('webrtc-offer', async (offer) => {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc-answer', answer);
        pendingCandidatesRef.current.forEach((c) => pc.addIceCandidate(c));
        pendingCandidatesRef.current = [];
      } catch (err) {
        console.error('Answer error', err);
      }
    });
    socket.on('webrtc-answer', async (answer) => {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        pendingCandidatesRef.current.forEach((c) => pc.addIceCandidate(c));
        pendingCandidatesRef.current = [];
      } catch (err) {
        console.error('Set remote answer error', err);
      }
    });
    socket.on('webrtc-ice', async (candidate) => {
      if (pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Add ICE candidate error', e);
        }
      } else {
        pendingCandidatesRef.current.push(candidate);
      }
    });

    if (isCallerRef.current) {
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => socket.emit('webrtc-offer', pc.localDescription))
        .catch((err) => {
          console.error('Offer error', err);
          cleanup();
        });
    }

    return () => {
      socket.off('webrtc-offer');
      socket.off('webrtc-answer');
      socket.off('webrtc-ice');
    };
  }, [socket, callState, cleanup, testMode]);

  useEffect(() => {
    if (!encounterMatch || !socket || callState !== 'idle') return;
    const { peerId, peerName, shouldOffer, callId: matchCallId } = encounterMatch;
    setPeer({ id: peerId, name: peerName });
    setCallId(matchCallId || null);
    isCallerRef.current = shouldOffer;
    setErrorMessage('');
    ensureLocalStream()
      .then(() => {
        setCallState('connecting');
        setConnectionStatus('Connecting...');
      })
      .catch(() => {
        setErrorMessage('Camera/microphone access needed');
      })
      .finally(() => {
        onConsumeEncounterMatch?.();
      });
  }, [encounterMatch, socket, callState, ensureLocalStream, onConsumeEncounterMatch]);

  const endCall = useCallback(() => {
    if (socket) socket.emit('disconnect-call', { callId });
    cleanup();
    onExit?.();
  }, [socket, cleanup, onExit, callId]);

  useEffect(() => {
    if (testMode !== 'disconnect' || callState !== 'connected') return;
    const t = setTimeout(() => endCall(), 3000);
    return () => clearTimeout(t);
  }, [testMode, callState, endCall]);

  if (!socketConnected) {
    return (
      <div className="video-shell">
        <p className="muted">Connecting to network...</p>
      </div>
    );
  }

  if (callState === 'idle') {
    return (
      <div className="video-shell">
        <p className="muted">Waiting for a connection...</p>
        {errorMessage && <div className="video-error-toast">{errorMessage}</div>}
      </div>
    );
  }

  return (
    <div className="video-shell">
      <div className={`video-vertical ${isMobile ? 'mobile' : ''}`}>
        <div className="video-remote-pane">
          <video ref={remoteVideoRef} autoPlay playsInline className="video-remote" />
          <div className="video-overlay">
            <span className="muted">{peer?.name || 'Remote user'}</span>
          </div>
        </div>
        <div className="video-local-pane">
          <video ref={localVideoRef} autoPlay muted playsInline className="video-local" />
          <span className="muted">You</span>
        </div>
      </div>
      <div className="video-controls-stack">
        <span className="connection-text">{connectionStatus || callState}</span>
        <button type="button" className="btn-end-call" onClick={endCall}>
          End
        </button>
      </div>
      {errorMessage && <div className="video-error-toast">{errorMessage}</div>}
    </div>
  );
}

export default VideoChat;
