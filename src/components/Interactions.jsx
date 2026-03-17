'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  getInteractions,
  toggleChat,
  getChatStatus,
  getMessages,
  getPresenceStatus,
  getPresenceVisibility,
  setPresenceVisibility,
} from '@/lib/api';

function StatusBadge({ status }) {
  const label = status === 'connected' ? 'Connected' : status === 'skipped' ? 'Skipped' : 'Missed';
  const tone =
    status === 'connected' ? 'badge-success' : status === 'skipped' ? 'badge-muted' : 'badge-warning';
  return <span className={`badge ${tone}`}>{label}</span>;
}

function formatStatus(status) {
  return status === 'connected' ? 'Connected' : status === 'skipped' ? 'Skipped' : 'Missed';
}

function formatLastInteraction(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function Interactions({ socket, socketConnected, onlineIds = [] }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [chatState, setChatState] = useState(new Map()); // userId -> { me: bool, them: bool }
  const [waitingMessage, setWaitingMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [statuses, setStatuses] = useState(new Map());
  const [showStatus, setShowStatus] = useState(true);

  const load = async () => {
    try {
      const { interactions = [] } = await getInteractions(search);
      setItems(interactions);
      setSelected((prev) => {
        if (!interactions?.length) return null;
        const previousId = prev?.otherUserId;
        if (!previousId) return interactions[0];
        return interactions.find((item) => item.otherUserId === previousId) || interactions[0];
      });
    } catch (e) {
      console.error('Interactions load failed', e);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    getPresenceVisibility()
      .then((value) => setShowStatus(Boolean(value)))
      .catch(() => setShowStatus(true));
  }, []);

  const selectedId = selected?.otherUserId;
  const selectedEncounterId = selected?.id || null;
  const currentChatState = selectedId ? chatState.get(selectedId) || { me: false, them: false } : { me: false, them: false };
  const chatEnabled = currentChatState.me;
  const peerEnabled = currentChatState.them;
  const mutualChat = chatEnabled && peerEnabled;
  const chatHint = mutualChat ? 'Chat unlocked. You can message now.' : waitingMessage || 'Enable chat to start messaging.';

  useEffect(() => {
    let active = true;
    if (!selectedId) return () => {};
    setLoadingMessages(true);
    Promise.all([
      getChatStatus(selectedId),
      getMessages(selectedId, selectedEncounterId),
    ])
      .then(([statusRes, history]) => {
        if (!active) return;
        setChatState((prev) => {
          const next = new Map(prev);
          next.set(selectedId, { me: Boolean(statusRes?.meEnabled), them: Boolean(statusRes?.themEnabled) });
          return next;
        });
        if (statusRes.mutual) {
          setWaitingMessage('');
        } else if (statusRes?.themEnabled && !statusRes?.meEnabled) {
          setWaitingMessage('They enabled chat. Slide to unlock yours.');
        } else if (!statusRes?.themEnabled && statusRes?.meEnabled) {
          setWaitingMessage('Waiting for the other user to enable chat.');
        } else {
          setWaitingMessage('Enable chat to start messaging.');
        }
        const mapped = (history || []).map((m) => ({
          id: m.id,
          from: m.sender_id === selectedId ? 'them' : 'me',
          text: m.message_text,
          createdAt: m.created_at,
        }));
        setMessages(mapped);
      })
      .catch(() => {
        if (active) {
          setWaitingMessage('Could not load chat status.');
          setMessages([]);
        }
      })
      .finally(() => {
        if (active) setLoadingMessages(false);
      });
    return () => {
      active = false;
      setMessages([]);
    };
  }, [selectedId, selectedEncounterId]);

  useEffect(() => {
    if (!socket) return () => {};
    const handleUnlocked = (payload) => {
      if (payload?.peerId === selectedId) {
        setChatState((prev) => {
          const next = new Map(prev);
          next.set(selectedId, { me: true, them: true });
          return next;
        });
        setWaitingMessage('');
      }
    };
    const handleLocked = (payload) => {
      if (payload?.peerId === selectedId) {
        setChatState((prev) => {
          const next = new Map(prev);
          next.set(selectedId, { me: false, them: false });
          return next;
        });
        setWaitingMessage('Both users must enable chat.');
      }
    };
    const handlePeerEnabled = (payload) => {
      if (payload?.peerId === selectedId) {
        setChatState((prev) => {
          const next = new Map(prev);
          const existing = next.get(selectedId) || { me: false, them: false };
          next.set(selectedId, { ...existing, them: true });
          return next;
        });
        if (!chatEnabled) {
          setWaitingMessage('They enabled chat. Slide to unlock yours.');
        }
      }
    };
    const handleChat = (payload) => {
      if (!payload) return;
      const { fromUserId, toUserId } = payload;
      if (fromUserId !== selectedId && toUserId !== selectedId) return;
      const direction = fromUserId === selectedId ? 'them' : 'me';
      setMessages((prev) => {
        if (payload.id && prev.some((m) => m.id === payload.id)) return prev;
        return [
          ...prev,
          {
            id: payload.id || `local-${Date.now()}`,
            from: direction,
            text: payload.text,
            createdAt: payload.createdAt || new Date().toISOString(),
          },
        ];
      });
    };
    socket.on('chat-unlocked', handleUnlocked);
    socket.on('chat-locked', handleLocked);
    socket.on('chat-peer-enabled', handlePeerEnabled);
    socket.on('chat-message', handleChat);
    return () => {
      socket.off('chat-unlocked', handleUnlocked);
      socket.off('chat-locked', handleLocked);
      socket.off('chat-peer-enabled', handlePeerEnabled);
      socket.off('chat-message', handleChat);
    };
  }, [socket, selectedId, chatEnabled]);

  const sendMessage = () => {
    if (!input.trim() || !socket || !selectedId || !mutualChat || !socketConnected) return;
    const text = input.trim();
    socket.emit('chat-message', { targetUserId: selectedId, text, encounterId: selectedEncounterId });
    setInput('');
  };

  const toggle = async (enabled) => {
    if (!selectedId) return;
    try {
      const res = await toggleChat(selectedId, enabled);
      setChatState((prev) => {
        const next = new Map(prev);
        next.set(selectedId, { me: enabled, them: Boolean(res?.themEnabled) });
        return next;
      });
      if (socket) socket.emit('chat-toggle', { targetUserId: selectedId, enabled });
      if (res.mutual) {
        setWaitingMessage('');
      } else if (res?.themEnabled && enabled) {
        setWaitingMessage('They enabled chat. Slide to unlock yours.');
      } else if (!res?.themEnabled && enabled) {
        setWaitingMessage('Waiting for the other user to enable chat.');
      } else {
        setWaitingMessage('Enable chat to start messaging.');
      }
    } catch {
      setWaitingMessage('Could not update chat setting.');
    }
  };

  useEffect(() => {
    const otherIds = items.map((i) => i.otherUserId);
    if (!otherIds.length) return;
    getPresenceStatus(otherIds)
      .then((rows) => {
        const map = new Map();
        rows.forEach((r) =>
          map.set(Number(r.userId), { online: Boolean(r.online), showStatus: r.showStatus !== false })
        );
        setStatuses(map);
      })
      .catch(() => {});
  }, [items, onlineIds]);

  const filteredItems = useMemo(() => {
    const base = search
      ? items.filter((i) => i.user.name.toLowerCase().includes(search.toLowerCase()))
      : items;
    return base;
  }, [items, search]);

  const isOnline = (userId) => {
    const status = statuses.get(userId);
    if (status) {
      if (!status.showStatus) return false;
      return status.online || onlineIds.includes(userId);
    }
    return onlineIds.includes(userId);
  };

  return (
    <div className="interactions-page">
      <div className="interactions-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h2>Interactions</h2>
        </div>
        <div className="interaction-search">
          <input
            type="search"
            placeholder="Search by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="presence-toggle">
          <label className="presence-toggle-switch">
            <input
              type="checkbox"
              checked={showStatus}
              onChange={async (e) => {
                const next = e.target.checked;
                setShowStatus(next);
                try {
                  await setPresenceVisibility(next);
                } catch {
                  // ignore
                }
              }}
            />
            <span className="presence-toggle-track">
              <span className="presence-toggle-thumb" />
              <span className="presence-toggle-text">
                {showStatus ? 'Online status: ON' : 'Online status: OFF'}
              </span>
            </span>
          </label>
        </div>
      </div>

      <div className="interactions-body">
        <div className="interactions-list">
          {filteredItems.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`interaction-row ${selectedId === item.otherUserId ? 'active' : ''}`}
              onClick={() => {
                setSelected(item);
                setMessages([]);
              }}
            >
              <div className="status-avatar">
                <div className="avatar">
                  {item.user.photo ? <img src={item.user.photo} alt={item.user.name} /> : <div className="avatar-fallback" />}
                </div>
                <span
                  className={`presence-dot ${isOnline(item.otherUserId) ? 'online' : 'offline'}`}
                  aria-label={isOnline(item.otherUserId) ? 'Online' : 'Offline'}
                />
              </div>
              <div className="interaction-info">
                <p className="name">{item.user.name}</p>
                <p className="meta">Last: {formatLastInteraction(item.lastInteractionAt)}</p>
              </div>
              <StatusBadge status={item.status} />
            </button>
          ))}
          {filteredItems.length === 0 && (
            <div className="interactions-list-empty">Only connected users appear here.</div>
          )}
        </div>

        <div className="interaction-detail">
          {selected ? (
            <>
              <div className="detail-header">
                <div className="avatar large">
                  {selected.user.photo ? <img src={selected.user.photo} alt={selected.user.name} /> : <div className="avatar-fallback" />}
                </div>
                <div>
                  <h3>{selected.user.name}</h3>
                  <p className="meta">{formatStatus(selected.status)}</p>
                </div>
                <div className="chat-toggle">
                  <label className="chat-toggle-switch">
                    <input
                      type="checkbox"
                      checked={chatEnabled}
                      onChange={(e) => toggle(e.target.checked)}
                      disabled={!socketConnected}
                    />
                    <span className="toggle-track">
                      <span className="toggle-thumb">
                        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            d="M12 3c-3.866 0-7 2.91-7 6.5 0 4.75 6.06 10.08 6.33 10.31a1 1 0 0 0 1.34 0C12.94 19.58 19 14.25 19 9.5 19 5.91 15.866 3 12 3Zm0 8.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z"
                            fill="currentColor"
                          />
                        </svg>
                      </span>
                      <span className="toggle-label">Chat</span>
                    </span>
                  </label>
                  <p className="muted chat-toggle-note">{chatHint}</p>
                </div>
              </div>

              <div className="chat-window">
              <div className="chat-messages">
                {loadingMessages && <div className="chat-placeholder">Loading conversation...</div>}
                {!loadingMessages &&
                  messages.map((m) => (
                    <div key={m.id} className={`chat-bubble ${m.from === 'me' ? 'self' : 'peer'}`}>
                      {m.text}
                    </div>
                  ))}
                {!loadingMessages && messages.length === 0 && (
                  <div className="chat-placeholder">
                    {chatEnabled ? 'Chat is unlocked. Say hello.' : waitingMessage || 'Enable chat to begin.'}
                  </div>
                )}
              </div>
                <div className="chat-input">
                  <input
                    type="text"
                    value={input}
                    placeholder="Type a message..."
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    disabled={!mutualChat}
                  />
                  <button type="button" className="btn-solid" onClick={sendMessage} disabled={!mutualChat}>
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="interaction-empty">Select an interaction to view details.</div>
          )}
        </div>
      </div>
    </div>
  );
}
