'use client';
import React, { useState, useEffect } from 'react';
import { getUser, updateUser } from '@/lib/api';
import ProfileView from './ProfileView';
import ProfileEdit from './ProfileEdit';
import AccountSettings from './AccountSettings';
import SupportPage from './SupportPage';

function UserProfile({ currentUser, entryMode = null, onEntryModeConsumed }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('view'); // 'view', 'edit', 'settings', 'support'

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (!entryMode) return;
    setMode(entryMode);
    onEntryModeConsumed?.();
  }, [entryMode, onEntryModeConsumed]);

  const loadUser = async () => {
    try {
      const data = await getUser(currentUser.id);
      setUser(data);
    } catch (error) {
      console.error('Failed to load user', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (updatedData) => {
    try {
      await updateUser(updatedData);
      setUser({ ...user, ...updatedData });
      setMode('view');
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to save changes');
    }
  };

  const handleUpdateNotifications = async (notifications) => {
    try {
      await updateUser({ notifications });
      setUser({ ...user, notifications });
    } catch (error) {
      console.error('Failed to update notifications:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading profile...</div>;
  }

  if (!user) {
    return <div className="empty-state">Profile not found</div>;
  }

  return (
    <div className="user-profile-page">
      {mode === 'view' && (
        <>
          <ProfileView user={user} onEdit={() => setMode('edit')} />
          <div className="profile-actions-menu">
            <button
              className="menu-action-btn"
              onClick={() => setMode('settings')}
            >
              Account & Settings
            </button>
            <button
              className="menu-action-btn"
              onClick={() => setMode('support')}
            >
              Support
            </button>
          </div>
        </>
      )}

      {mode === 'edit' && (
        <ProfileEdit
          user={user}
          onSave={handleSaveProfile}
          onCancel={() => setMode('view')}
        />
      )}

      {mode === 'settings' && (
        <AccountSettings
          user={user}
          onUpdateNotifications={handleUpdateNotifications}
          onBack={() => setMode('view')}
        />
      )}

      {mode === 'support' && (
        <SupportPage
          user={user}
          onBack={() => setMode('view')}
        />
      )}
    </div>
  );
}

export default UserProfile;
