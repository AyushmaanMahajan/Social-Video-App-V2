'use client';
import React, { useState } from 'react';

function AccountSettings({ user, onUpdateNotifications, onBack }) {
  const [notifications, setNotifications] = useState(
    user.notifications || { push: true, email: true, matches: true }
  );

  const handleToggle = async (key) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    await onUpdateNotifications(updated);
  };

  return (
    <div className="account-settings">
      <div className="settings-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h2>Account & Settings</h2>
      </div>

      <div className="settings-content">
        <div className="settings-card">
          <h3 className="settings-card-title">Account Information</h3>
          <div className="info-list">
            <div className="info-item">
              <span className="info-label">Name</span>
              <span className="info-value">{user.name}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Age</span>
              <span className="info-value">{user.age}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Location</span>
              <span className="info-value">{user.location || 'Not set'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Email</span>
              <span className="info-value">{user.email || 'Not set'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Member Since</span>
              <span className="info-value">
                {new Date(user.created_at).toLocaleDateString()}
              </span>
            </div>
            <details className="expandable-section">
              <summary>Advanced Info</summary>
              <div className="info-item">
                <span className="info-label">User ID</span>
                <span className="info-value mono">{user.id}</span>
              </div>
            </details>
          </div>
        </div>

        <div className="settings-card">
          <h3 className="settings-card-title">Notifications</h3>
          <div className="toggle-list">
            <div className="toggle-item">
              <div className="toggle-info">
                <span className="toggle-label">Push Notifications</span>
                <span className="toggle-hint">Get notified about new matches</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notifications.push}
                  onChange={() => handleToggle('push')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="toggle-item">
              <div className="toggle-info">
                <span className="toggle-label">Email Notifications</span>
                <span className="toggle-hint">Receive updates via email</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notifications.email}
                  onChange={() => handleToggle('email')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="toggle-item">
              <div className="toggle-info">
                <span className="toggle-label">New Matches Alerts</span>
                <span className="toggle-hint">Get instant match notifications</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notifications.matches}
                  onChange={() => handleToggle('matches')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AccountSettings;