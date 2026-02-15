'use client';
import React, { useState } from 'react';

function SettingsPage({ onEditProfile, onClose }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This cannot be undone.')) {
      // Handle account deletion
      alert('Account deletion would be processed here');
    }
  };

  const menuItems = [
    { icon: '✏️', label: 'Edit Profile', action: onEditProfile },
    { icon: '👤', label: 'Account Info', action: () => alert('Account info') },
    { icon: '🔒', label: 'Privacy Controls', action: () => alert('Privacy controls') },
    { icon: '🔔', label: 'Notifications', action: () => alert('Notifications') },
    { icon: '💬', label: 'Support', action: () => alert('Support') },
    { icon: '📋', label: 'Community Guidelines', action: () => alert('Guidelines') },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="settings-content">
          <div className="settings-menu">
            {menuItems.map((item, index) => (
              <button
                key={index}
                className="settings-menu-item"
                onClick={item.action}
              >
                <span className="menu-icon">{item.icon}</span>
                <span className="menu-label">{item.label}</span>
                <span className="menu-arrow">›</span>
              </button>
            ))}
          </div>

          <div className="settings-footer">
            <button
              className="delete-account-btn"
              onClick={handleDeleteAccount}
            >
              Delete Account
            </button>
            <p className="app-version">Version 1.0.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;