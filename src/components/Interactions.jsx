'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { getInteractions, toggleChat, getChatStatus, getMessages } from '@/lib/api';

function StatusBadge({ status }) {
  const label = status === 'connected' ? 'Connected' : status === 'skipped' ? 'Skipped' : 'Missed';
  const tone =
    status === 'connected' ? 'badge-success' : status === 'skipped' ? 'badge-muted' : 'badge-warning';
  return <span className={`badge ${tone}`}>{label}</span>;
}

export default function Interactions({ socket, socketConnected }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [chatEnabled, setChatEnabled] = useState(false);
  const [waitingMessage, setWaitingMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);

  const load = async () => {
    try {
      const { interactions } = await getInteractions(search);
      setItems(interactions);
      if (interactions.length > 0 && !selected) setSelected(interactions[0]);
    } catch (e) {
      console.error('Interactions load failed', e);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const selectedId = selected?.otherUserId;
  const selectedEncounterId = selected?.id || null;

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
        if (statusRes.mutual) {
          setChatEnabled(true);
          setWaitingMessage('');
        } else {
          setChatEnabled(false);
          setWaitingMessage('Waiting for the other user to enable chat.');
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
        setChatEnabled(true);
        setWaitingMessage('');
      }
    };
    const handleLocked = (payload) => {
      if (payload?.peerId === selectedId) {
        setChatEnabled(false);
        setWaitingMessage('Both users must enable chat.');
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
    socket.on('chat-message', handleChat);
    return () => {
      socket.off('chat-unlocked', handleUnlocked);
      socket.off('chat-locked', handleLocked);
      socket.off('chat-message', handleChat);
    };
  }, [socket, selectedId]);

  const sendMessage = () => {
    if (!input.trim() || !socket || !selectedId || !chatEnabled || !socketConnected) return;
    const text = input.trim();
    socket.emit('chat-message', { targetUserId: selectedId, text, encounterId: selectedEncounterId });
    setInput('');
  };

  const toggle = async (enabled) => {
    if (!selectedId) return;
    try {
      const res = await toggleChat(selectedId, enabled);
      if (res.mutual) {
        setChatEnabled(true);
        setWaitingMessage('');
        if (socket) socket.emit('chat-toggle', { targetUserId: selectedId, enabled: true });
      } else {
        setChatEnabled(false);
        setWaitingMessage('Waiting for the other user to enable chat.');
        if (socket) socket.emit('chat-toggle', { targetUserId: selectedId, enabled });
      }
    } catch {
      setWaitingMessage('Could not update chat setting.');
    }
  };

  const filteredItems = useMemo(() => {
    if (!search) return items;
    return items.filter((i) => i.user.name.toLowerCase().includes(search.toLowerCase()));
  }, [items, search]);

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
              <div className="avatar">
                {item.user.photo ? <img src={item.user.photo} alt={item.user.name} /> : <div className="avatar-fallback" />}
              </div>
              <div className="interaction-info">
                <p className="name">{item.user.name}</p>
                <p className="meta">Last: {new Date(item.lastInteractionAt).toLocaleString()}</p>
              </div>
              <StatusBadge status={item.status} />
            </button>
          ))}
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
                  <p className="meta">{selected.status}</p>
                </div>
                <div className="chat-toggle">
                  <label>
                    <input
                      type="checkbox"
                      checked={chatEnabled}
                      onChange={(e) => toggle(e.target.checked)}
                      disabled={!socketConnected}
                    />
                    Enable chat
                  </label>
                  {!chatEnabled && waitingMessage && <p className="muted">{waitingMessage}</p>}
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
                    disabled={!chatEnabled}
                  />
                  <button type="button" className="btn-solid" onClick={sendMessage} disabled={!chatEnabled}>
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
