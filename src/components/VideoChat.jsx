'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getMatches, getToken } from '@/lib/api';
import { useVideoSocket } from '@/lib/useVideoSocket';
import { getIceServers } from '@/lib/webrtcConfig';

const CALL_TIMEOUT_MS = 45000;

function VideoChat({ currentUser }) {
  const { socket, connected: socketConnected } = useVideoSocket();
  const [mutualMatches, setMutualMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [callState, setCallState] = useState('idle'); // idle | calling | incoming | connecting | connected | rejected | ended
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null); // { callId, callerId, callerName }
  const [messages, setMessages] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const isCallerRef = useRef(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

  // Testing: ?videoTest=ice_failure | timeout | disconnect
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
    setSelectedMatch(null);
    setIncomingCall(null);
    setMessages([]);
    setCallState('idle');
  }, []);

  const loadMatches = useCallback(async () => {
    try {
      const list = await getMatches();
      setMutualMatches(list);
    } catch (e) {
      console.error('Failed to load matches', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  useEffect(() => {
    if (!socket) return;

    socket.on('incoming-call', (data) => {
      if (testMode === 'timeout') return; // simulate: never accept
      setIncomingCall({ callId: data.callId, callerId: data.callerId, callerName: data.callerName });
      setCallState('incoming');
    });
    socket.on('call-request-sent', () => {
      setCallState('calling');
      setConnectionStatus('Ringing...');
    });
    socket.on('call-accepted', () => {
      setCallState('connecting');
      setConnectionStatus('Connecting...');
    });
    socket.on('call-rejected', (data) => {
      setErrorMessage(data?.reason || 'Call rejected');
      setCallState('rejected');
      cleanup();
    });
    socket.on('call-timeout', () => {
      setErrorMessage('Call timed out');
      setCallState('ended');
      cleanup();
    });
    socket.on('call-ended', (data) => {
      setErrorMessage(data?.reason === 'disconnected' ? 'Call ended' : data?.reason || 'Call ended');
      setCallState('ended');
      cleanup();
    });
    socket.on('chat-message', (data) => {
      setMessages((prev) => [...prev, { from: data.fromUserId, text: data.text }]);
    });
    socket.on('error', (data) => {
      setErrorMessage(data?.message || 'Error');
    });

    return () => {
      socket.off('incoming-call');
      socket.off('call-request-sent');
      socket.off('call-accepted');
      socket.off('call-rejected');
      socket.off('call-timeout');
      socket.off('call-ended');
      socket.off('chat-message');
      socket.off('error');
    };
  }, [socket, cleanup, testMode]);

  // WebRTC signaling
  useEffect(() => {
    if (!socket || callState !== 'connecting' && callState !== 'connected') return;

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
  }, [socket, callState, selectedMatch, incomingCall, testMode, cleanup]);

  const requestMediaThenCall = useCallback(
    async (match) => {
      setErrorMessage('');
      setSelectedMatch(match);
      isCallerRef.current = true;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        if (!socket) {
          setErrorMessage('Not connected. Try again.');
          return;
        }
        socket.emit('call-request', {
          receiverId: match.id,
          callerName: currentUser?.name || 'Someone',
        });
      } catch (e) {
        setErrorMessage('Camera/microphone access needed');
        setSelectedMatch(null);
        isCallerRef.current = false;
      }
    },
    [socket, currentUser]
  );

  const acceptCall = useCallback(async () => {
    if (!incomingCall || !socket) return;
    isCallerRef.current = false;
    setSelectedMatch({ id: incomingCall.callerId, name: incomingCall.callerName });
    setCallState('connecting');
    setConnectionStatus('Connecting...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      socket.emit('call-accept', {
        callId: incomingCall.callId,
        callerId: incomingCall.callerId,
      });
      setIncomingCall(null);
    } catch (e) {
      setErrorMessage('Camera/microphone access needed');
      socket.emit('call-reject', { callId: incomingCall.callId, callerId: incomingCall.callerId });
      setIncomingCall(null);
      setCallState('idle');
    }
  }, [incomingCall, socket]);

  const rejectCall = useCallback(() => {
    if (!incomingCall || !socket) return;
    socket.emit('call-reject', { callId: incomingCall.callId, callerId: incomingCall.callerId });
    setIncomingCall(null);
    setCallState('idle');
  }, [incomingCall, socket]);

  const endCall = useCallback(() => {
    if (socket) socket.emit('disconnect-call', {});
    cleanup();
  }, [socket, cleanup]);

  // Test mode: auto-disconnect after 3s when connected
  useEffect(() => {
    if (testMode !== 'disconnect' || callState !== 'connected') return;
    const t = setTimeout(() => endCall(), 3000);
    return () => clearTimeout(t);
  }, [testMode, callState, endCall]);

  const sendChat = useCallback(
    (text) => {
      if (!socket || !text.trim()) return;
      socket.emit('chat-message', { text: text.trim() });
      setMessages((prev) => [...prev, { from: currentUser?.id, text: text.trim() }]);
    },
    [socket, currentUser]
  );

  if (loading) {
    return <div className="video-loading">Loading your matches...</div>;
  }

  if (mutualMatches.length === 0) {
    return (
      <div className="video-empty-state">
        <h2>No mutual matches yet</h2>
        <p>Keep swiping to find connections!</p>
      </div>
    );
  }

  // Incoming call overlay
  if (callState === 'incoming' && incomingCall) {
    return (
      <div className="video-incoming-overlay">
        <div className="video-incoming-card">
          <p className="video-incoming-label">Incoming call from</p>
          <h3>{incomingCall.callerName}</h3>
          <div className="video-incoming-actions">
            <button type="button" className="btn-accept-call" onClick={acceptCall}>
              Accept
            </button>
            <button type="button" className="btn-reject-call" onClick={rejectCall}>
              Reject
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active call view: left = videos (local top, remote bottom), right = chat
  if (callState === 'calling' || callState === 'connecting' || callState === 'connected') {
    return (
      <ActiveCallView
        localVideoRef={localVideoRef}
        remoteVideoRef={remoteVideoRef}
        selectedMatch={selectedMatch}
        currentUser={currentUser}
        connectionStatus={connectionStatus}
        callState={callState}
        messages={messages}
        sendChat={sendChat}
        endCall={endCall}
        errorMessage={errorMessage}
      />
    );
  }

  // Idle: match list with Start and connection status
  return (
    <div className="video-chat-container">
      <div className="video-status-bar">
        <span className={`video-connection-dot ${socketConnected ? 'connected' : 'disconnected'}`} />
        {socketConnected ? 'Connected' : 'Connecting...'}
      </div>
      <h2>Your Mutual Matches</h2>
      <p className="subtitle">Start a video call with anyone you&apos;ve matched with</p>
      {(callState === 'rejected' || callState === 'ended') && errorMessage && (
        <div className="video-error-toast">{errorMessage}</div>
      )}
      {testMode && (
        <div className="video-test-banner">
          Test mode: <code>{testMode}</code> (ice_failure | timeout | disconnect)
        </div>
      )}
      <div className="matches-grid">
        {mutualMatches.map((match) => (
          <div key={match.id} className="match-card">
            <img src={match.photos?.[0] || match.photo} alt={match.name} />
            <div className="match-info">
              <h3>{match.name}</h3>
              <p className="match-bio">{match.about || match.bio || ''}</p>
              <button
                type="button"
                className="btn-video-call"
                onClick={() => requestMediaThenCall(match)}
                disabled={!socketConnected}
              >
                Start
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Split active call into a sub-component so we can use useState for chat input
function ActiveCallView({
  localVideoRef,
  remoteVideoRef,
  selectedMatch,
  currentUser,
  connectionStatus,
  callState,
  messages,
  sendChat,
  endCall,
  errorMessage,
}) {
  const [chatInput, setChatInput] = useState('');
  return (
    <div className="video-active-layout">
      <div className="video-active-left">
        <div className="video-stack">
          <div className="video-window video-local">
            <video ref={localVideoRef} autoPlay muted playsInline />
            <span className="video-label">You</span>
          </div>
          <div className="video-window video-remote">
            <video ref={remoteVideoRef} autoPlay playsInline />
            <span className="video-label">{selectedMatch?.name || 'Remote'}</span>
          </div>
        </div>
        <div className="video-controls-bar">
          <span className={`video-status video-status-${callState}`}>{connectionStatus || callState}</span>
          <button type="button" className="btn-end-call" onClick={endCall}>
            End
          </button>
        </div>
      </div>
      <div className="video-active-right">
        <div className="video-chat-messages">
          {messages.map((m, i) => (
            <div key={i} className={m.from === currentUser?.id ? 'chat-msg self' : 'chat-msg'}>
              {m.text}
            </div>
          ))}
        </div>
        <div className="video-chat-input-wrap">
          <input
            type="text"
            className="video-chat-input"
            placeholder="Type a message..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                sendChat(chatInput);
                setChatInput('');
              }
            }}
          />
          <button type="button" className="btn-send-chat" onClick={() => { sendChat(chatInput); setChatInput(''); }}>
            Send
          </button>
        </div>
      </div>
      {errorMessage && <div className="video-error-toast">{errorMessage}</div>}
    </div>
  );
};
export default VideoChat;

// Re-read the component - I had started to return the active layout inline with useState inside the same component which is invalid. I'll refactor so that when we're in calling/connecting/connected we return <ActiveCallView ... /> and ActiveCallView holds the chat input state.
// </think>
// Refactoring VideoChat: moving the active-call UI into ActiveCallView and fixing the duplicate return.
// <｜tool▁calls▁begin｜><｜tool▁call▁begin｜>
// StrReplace