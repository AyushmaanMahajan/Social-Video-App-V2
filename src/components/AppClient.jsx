'use client';

import React, { useState, useEffect } from 'react';
import ProfileForm from './ProfileForm';
import Browse from './Browse';
import Pool from './Pool';
import UserProfile from './UserProfile';
import VideoChat from './VideoChat';
import SettingsPage from './SettingsPage';
import EditProfileModal from './EditProfileModal';

export default function AppClient() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('profile');
  const [darkMode, setDarkMode] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  const handleProfileCreated = (user) => {
    setCurrentUser(user);
    setCurrentPage('browse');
  };

  const handleSaveProfile = async (updatedData) => {
    setCurrentUser({ ...currentUser, ...updatedData });
  };

  const handleOpenEditProfile = () => {
    setShowSettings(false);
    setShowEditProfile(true);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Serendipity Stream</h1>
        {currentUser && (
          <div className="header-actions">
            <nav className="nav">
              <button
                className={currentPage === 'browse' ? 'nav-btn active' : 'nav-btn'}
                onClick={() => setCurrentPage('browse')}
              >
                Discover
              </button>
              <button
                className={currentPage === 'pool' ? 'nav-btn active' : 'nav-btn'}
                onClick={() => setCurrentPage('pool')}
              >
                Matches
              </button>
              <button
                className={currentPage === 'video' ? 'nav-btn active' : 'nav-btn'}
                onClick={() => setCurrentPage('video')}
              >
                Video Chat
              </button>
              <button
                className={currentPage === 'profile' ? 'nav-btn active' : 'nav-btn'}
                onClick={() => setCurrentPage('profile')}
              >
                Profile
              </button>
            </nav>
            <button
              className="dark-mode-toggle"
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? 'Light Mode' : 'Dark Mode'}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button
              className="settings-btn"
              onClick={() => setShowSettings(true)}
              title="Settings"
            >
              ⚙️
            </button>
          </div>
        )}
      </header>

      <main className="app-main">
        {!currentUser && <ProfileForm onProfileCreated={handleProfileCreated} />}

        {currentUser && currentPage === 'browse' && <Browse currentUser={currentUser} />}

        {currentUser && currentPage === 'pool' && <Pool currentUser={currentUser} />}

        {currentUser && currentPage === 'profile' && <UserProfile currentUser={currentUser} />}

        {currentUser && currentPage === 'video' && <VideoChat currentUser={currentUser} />}
      </main>

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
    </div>
  );
}
