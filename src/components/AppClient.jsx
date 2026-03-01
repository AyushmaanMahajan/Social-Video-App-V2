'use client';

import React, { useState, useEffect } from 'react';
import ProfileForm from './ProfileForm';
import UserProfile from './UserProfile';
import SettingsPage from './SettingsPage';
import EditProfileModal from './EditProfileModal';
import Encounter from './Encounter';
import Interactions from './Interactions';
import { useVideoSocket } from '@/lib/useVideoSocket';
import VideoChat from './VideoChat';

const NAV_ITEMS = [
  { id: 'encounter', label: 'Encounter' },
  { id: 'interactions', label: 'Interactions' },
  { id: 'profile', label: 'Profile' }
];

export default function AppClient() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('encounter');
  const [showSettings, setShowSettings] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [activeEncounterMatch, setActiveEncounterMatch] = useState(null);
  const [videoActive, setVideoActive] = useState(false);
  const [lastPageBeforeCall, setLastPageBeforeCall] = useState('encounter');
  const { socket, connected: socketConnected } = useVideoSocket();
  const [onlineIds, setOnlineIds] = useState([]);

  useEffect(() => {
    document.body.classList.add('dark-mode');
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.includes('/interactions')) setCurrentPage('interactions');
      if (path.includes('/profile')) setCurrentPage('profile');
    }
  }, []);

  useEffect(() => {
    if (!socket) return () => {};
    const handler = (list) => {
      setOnlineIds((Array.isArray(list) ? list : []).map((id) => Number(id)));
    };
    socket.on('presence-update', handler);
    return () => socket.off('presence-update', handler);
  }, [socket]);

  const handleProfileCreated = (user) => {
    setCurrentUser(user);
    setCurrentPage('encounter');
  };

  const handleSaveProfile = async (updatedData) => {
    setCurrentUser({ ...currentUser, ...updatedData });
  };

  const handleOpenEditProfile = () => {
    setShowSettings(false);
    setShowEditProfile(true);
  };

  const renderNavButtons = () => (
    NAV_ITEMS.map((item) => (
      <button
        key={item.id}
        className={currentPage === item.id ? 'nav-btn active' : 'nav-btn'}
        onClick={() => setCurrentPage(item.id)}
        aria-label={item.label}
      >
        <span className="nav-label">{item.label}</span>
      </button>
    ))
  );

  return (
    <div className="app">
      <header className="app-header">
        <h1>Serendipity Stream</h1>
        {currentUser && (
          <div className="header-actions">
            <nav className="nav nav-desktop" aria-label="Desktop navigation">
              {renderNavButtons()}
            </nav>
            
            <button
              className="settings-btn"
              onClick={() => setShowSettings(true)}
              title="Settings"
            >
              Settings
            </button>
          </div>
        )}
      </header>

      <main className="app-main">
        {!currentUser && <ProfileForm onProfileCreated={handleProfileCreated} />}

        {currentUser && currentPage === 'encounter' && !videoActive && (
          <Encounter
            socket={socket}
            socketConnected={socketConnected}
            onEncounterMatch={(payload) => {
              setActiveEncounterMatch(payload);
              setLastPageBeforeCall(currentPage);
              setVideoActive(true);
            }}
          />
        )}

        {currentUser && currentPage === 'interactions' && (
          <Interactions
            socket={socket}
            socketConnected={socketConnected}
            onlineIds={onlineIds}
          />
        )}

        {currentUser && currentPage === 'profile' && <UserProfile currentUser={currentUser} />}
      </main>

      {currentUser && (
        <nav className="nav nav-mobile" aria-label="Mobile navigation">
          {renderNavButtons()}
        </nav>
      )}

      {showSettings && (
        <SettingsPage onEditProfile={handleOpenEditProfile} onClose={() => setShowSettings(false)} />
      )}

      {showEditProfile && currentUser && (
        <EditProfileModal
          user={currentUser}
          onClose={() => setShowEditProfile(false)}
          onSave={handleSaveProfile}
        />
      )}

      {currentUser && videoActive && (
        <div className={`video-host ${currentPage !== 'encounter' ? 'floating' : 'full'}`}>
          <VideoChat
            socket={socket}
            socketConnected={socketConnected}
            encounterMatch={activeEncounterMatch}
            onConsumeEncounterMatch={() => setActiveEncounterMatch(null)}
            onExit={() => {
              setVideoActive(false);
              setActiveEncounterMatch(null);
              setCurrentPage(lastPageBeforeCall || 'encounter');
            }}
            layoutMode={currentPage !== 'encounter' ? 'floating' : 'full'}
          />
        </div>
      )}
    </div>
  );
}


