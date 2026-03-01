'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useVideoSocket } from '@/lib/useVideoSocket';
import { getIceServers } from '@/lib/webrtcConfig';

function VideoChat({
  socket: externalSocket,
  socketConnected: externalConnected,
  encounterMatch,
  onConsumeEncounterMatch,
  onExit,
  layoutMode = 'full',
  floatingPos = { x: 12, y: 12 },
  onFloatingPosChange = () => {},
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
  const [forceTurn, setForceTurn] = useState(true);

  const isCallerRef = useRef(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const connectedConfirmedRef = useRef(false);
  const terminalIceFailureReportedRef = useRef(false);
  const disconnectedTimerRef = useRef(null);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, origin: floatingPos });

  const testMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('videoTest');
  const emitDiagnostic = useCallback((stage, status, message, meta = null, explicitCallId = null) => {
    console.log(`[video:${stage}:${status}] ${message}`, meta || {});
    if (!socket) return;
    socket.emit('client-diagnostic', {
      stage,
      status,
      message,
      callId: explicitCallId || callId || null,
      meta,
    });
  }, [socket, callId]);

  const cleanup = useCallback(() => {
    if (disconnectedTimerRef.current) {
      clearTimeout(disconnectedTimerRef.current);
      disconnectedTimerRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    pendingCandidatesRef.current = [];
    connectedConfirmedRef.current = false;
    terminalIceFailureReportedRef.current = false;
    setConnectionStatus('');
    setCallState('idle');
    setPeer(null);
    setCallId(null);
    setForceTurn(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 768px)');
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    dragRef.current.origin = floatingPos;
  }, [floatingPos]);

  const clampFloating = useCallback((x, y) => {
    if (typeof window === 'undefined') return { x, y };
    const shellWidth = Math.min(420, window.innerWidth * 0.92);
    const shellHeight = Math.max(240, Math.min(560, window.innerHeight * 0.7));
    const maxX = Math.max(0, window.innerWidth - shellWidth - 8);
    const maxY = Math.max(0, window.innerHeight - shellHeight - 8);
    return {
      x: Math.min(Math.max(8, x), maxX),
      y: Math.min(Math.max(8, y), maxY),
    };
  }, []);

  const startDrag = useCallback(
    (event) => {
      if (layoutMode !== 'floating') return;
      const pt = event.touches ? event.touches[0] : event;
      dragRef.current = {
        active: true,
        startX: pt.clientX,
        startY: pt.clientY,
        origin: floatingPos,
      };
    },
    [layoutMode, floatingPos]
  );

  const onDragMove = useCallback(
    (event) => {
      if (!dragRef.current.active || layoutMode !== 'floating') return;
      const pt = event.touches ? event.touches[0] : event;
      const dx = pt.clientX - dragRef.current.startX;
      const dy = pt.clientY - dragRef.current.startY;
      const next = clampFloating(dragRef.current.origin.x + dx, dragRef.current.origin.y + dy);
      onFloatingPosChange(next);
    },
    [layoutMode, clampFloating, onFloatingPosChange]
  );

  const endDrag = useCallback(() => {
    dragRef.current.active = false;
  }, []);

  useEffect(() => {
    if (layoutMode !== 'floating') return undefined;
    const handleMove = (e) => onDragMove(e);
    const handleEnd = () => endDrag();
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchend', handleEnd);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [layoutMode, onDragMove, endDrag]);

  const ensureLocalStream = useCallback(async () => {
    if (localStreamRef.current) {
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
      return localStreamRef.current;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      emitDiagnostic('get_user_media', 'ok', 'getUserMedia success');
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch (error) {
      console.error('getUserMedia error:', error);
      emitDiagnostic('get_user_media', 'fail', 'getUserMedia failed', {
        name: error?.name,
        message: error?.message,
      });
      throw error;
    }
  }, [emitDiagnostic]);

  useEffect(() => {
    if (!socket) return;

    socket.on('call-accepted', () => {
      emitDiagnostic('call-accept', 'ok', 'call-accepted received from server');
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
      emitDiagnostic('call-accept', 'fail', 'call-ended received', data || null);
      setErrorMessage(data?.reason === 'disconnected' ? 'Call ended' : data?.reason || 'Call ended');
      setCallState('ended');
      cleanup();
      onExit?.();
    });
    socket.on('error', (data) => {
      emitDiagnostic('client_event', 'fail', 'Socket error event', data || null);
      setErrorMessage(data?.message || 'Error');
    });

    return () => {
      socket.off('call-accepted');
      socket.off('call-rejected');
      socket.off('call-timeout');
      socket.off('call-ended');
      socket.off('error');
    };
  }, [socket, cleanup, onExit, emitDiagnostic]);

  useEffect(() => {
    if (!socket || (callState !== 'connecting' && callState !== 'connected')) return;

    const pc = new RTCPeerConnection(getIceServers({ forceTurn }));
    emitDiagnostic(
      'ice_state',
      'info',
      forceTurn ? 'PeerConnection created with TURN fallback' : 'PeerConnection created with default ICE servers'
    );

    if (testMode === 'ice_failure') {
      pc.close();
      setConnectionStatus('ICE failed (test)');
      socket.emit('ice-failure', {});
      setCallState('ended');
      cleanup();
      return;
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        emitDiagnostic('ice_candidate', 'ok', 'Local ICE candidate emitted');
        socket.emit('webrtc-ice', e.candidate);
      }
    };
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      setConnectionStatus(state);
      emitDiagnostic('ice_state', 'info', `ICE state changed: ${state}`);
      if (state === 'connected' || state === 'completed') {
        if (disconnectedTimerRef.current) {
          clearTimeout(disconnectedTimerRef.current);
          disconnectedTimerRef.current = null;
        }
        setCallState('connected');
        if (!connectedConfirmedRef.current) {
          connectedConfirmedRef.current = true;
          emitDiagnostic('call-connected-confirmed', 'ok', 'ICE connected; notifying server');
          socket.emit('call-connected-confirmed');
        }
        return;
      }
      if (state === 'disconnected') {
        if (disconnectedTimerRef.current) return;
        emitDiagnostic('ice_state', 'warn', 'ICE disconnected; waiting before failure');
        disconnectedTimerRef.current = setTimeout(() => {
          disconnectedTimerRef.current = null;
          const currentState = pc.iceConnectionState;
          if (currentState !== 'disconnected' && currentState !== 'failed') return;
          if (terminalIceFailureReportedRef.current) return;
          terminalIceFailureReportedRef.current = true;
          emitDiagnostic('ice_state', 'fail', `ICE remained in terminal state: ${currentState}`);
          socket.emit('ice-failure', { forceTurn, iceConnectionState: currentState });
          cleanup();
        }, 180000);
        return;
      }
      if (state === 'failed') {
        if (terminalIceFailureReportedRef.current) return;
        terminalIceFailureReportedRef.current = true;
        if (disconnectedTimerRef.current) {
          clearTimeout(disconnectedTimerRef.current);
          disconnectedTimerRef.current = null;
        }
        emitDiagnostic('ice_state', 'fail', `ICE entered terminal state: ${state}`);
        socket.emit('ice-failure', { forceTurn, iceConnectionState: state });
        cleanup();
      }
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
        emitDiagnostic('webrtc_offer', 'ok', 'webrtc-offer received');
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        emitDiagnostic('webrtc_answer', 'ok', 'webrtc-answer emitted');
        socket.emit('webrtc-answer', answer);
        pendingCandidatesRef.current.forEach((c) => pc.addIceCandidate(c));
        pendingCandidatesRef.current = [];
      } catch (err) {
        emitDiagnostic('webrtc_answer', 'fail', 'Failed processing webrtc-offer', { message: err?.message });
        console.error('Answer error', err);
      }
    });
    socket.on('webrtc-answer', async (answer) => {
      try {
        emitDiagnostic('webrtc_answer', 'ok', 'webrtc-answer received');
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        pendingCandidatesRef.current.forEach((c) => pc.addIceCandidate(c));
        pendingCandidatesRef.current = [];
      } catch (err) {
        emitDiagnostic('webrtc_answer', 'fail', 'Failed processing webrtc-answer', { message: err?.message });
        console.error('Set remote answer error', err);
      }
    });
    socket.on('webrtc-ice', async (candidate) => {
      if (pc.remoteDescription) {
        try {
          emitDiagnostic('ice_candidate', 'ok', 'Remote ICE candidate received');
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          emitDiagnostic('ice_candidate', 'fail', 'Failed adding remote ICE candidate', { message: e?.message });
          console.error('Add ICE candidate error', e);
        }
      } else {
        pendingCandidatesRef.current.push(candidate);
      }
    });

    if (isCallerRef.current) {
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          emitDiagnostic('webrtc_offer', 'ok', 'webrtc-offer emitted');
          socket.emit('webrtc-offer', pc.localDescription);
        })
        .catch((err) => {
          emitDiagnostic('webrtc_offer', 'fail', 'Failed creating webrtc-offer', { message: err?.message });
          console.error('Offer error', err);
          cleanup();
        });
    }

    return () => {
      socket.off('webrtc-offer');
      socket.off('webrtc-answer');
      socket.off('webrtc-ice');
    };
  }, [socket, callState, cleanup, testMode, emitDiagnostic, forceTurn]);

  useEffect(() => {
    if (!encounterMatch || !socket || callState !== 'idle') return;
    const { peerId, peerName, shouldOffer, callId: matchCallId } = encounterMatch;
    setPeer({ id: peerId, name: peerName });
    setCallId(matchCallId || null);
    setForceTurn(true);
    connectedConfirmedRef.current = false;
    terminalIceFailureReportedRef.current = false;
    isCallerRef.current = shouldOffer;
    emitDiagnostic('call-request', 'ok', 'Encounter match received; starting WebRTC flow', { shouldOffer }, matchCallId || null);
    setErrorMessage('');
    ensureLocalStream()
      .then(() => {
        setCallState('connecting');
        setConnectionStatus('Connecting...');
      })
      .catch((e) => {
        console.error('getUserMedia error:', e);
        if (socket) {
          socket.emit('disconnect-call', {});
        }
        cleanup();
        setErrorMessage('Camera/microphone access needed');
        onExit?.();
      })
      .finally(() => {
        onConsumeEncounterMatch?.();
      });
  }, [encounterMatch, socket, callState, ensureLocalStream, onConsumeEncounterMatch, emitDiagnostic, cleanup, onExit]);

  const endCall = useCallback(() => {
    emitDiagnostic('call-accept', 'info', 'disconnect-call emitted by client');
    if (socket) socket.emit('disconnect-call', { callId });
    cleanup();
    onExit?.();
  }, [socket, cleanup, onExit, callId, emitDiagnostic]);

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
    <div
      className={`video-shell ${layoutMode === 'floating' ? 'floating' : 'full'}`}
      style={layoutMode === 'floating' ? { left: 0, top: 0, transform: 'none' } : undefined}
      onMouseDown={startDrag}
      onTouchStart={startDrag}
    >
      {layoutMode === 'floating' && <div className="video-drag-handle" role="presentation" />}
      <div className={`video-vertical ${isMobile ? 'mobile' : ''}`}>
        <div className="video-remote-pane">
          <div className="video-frame remote">
            <video ref={remoteVideoRef} autoPlay playsInline className="video-remote" />
            <div className="video-overlay">
              <span className="muted">{peer?.name || 'Remote user'}</span>
            </div>
          </div>
        </div>
        <div className="video-local-pane">
          <div className="video-frame local">
            <video ref={localVideoRef} autoPlay muted playsInline className="video-local" />
          </div>
          <span className="video-self-label muted">You</span>
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
