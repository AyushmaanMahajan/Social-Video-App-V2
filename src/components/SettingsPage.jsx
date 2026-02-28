'use client';
import React from 'react';

function SettingsPage({ onEditProfile, onClose }) {
  const menuItems = [
    { label: 'Edit Profile', action: onEditProfile },
    { label: 'Account Info', action: () => alert('Account info') },
    { label: 'Privacy Controls', action: () => alert('Privacy controls') },
    { label: 'Notifications', action: () => alert('Notifications') },
    { label: 'Support', action: () => alert('Support') },
    { label: 'Community Guidelines', action: () => alert('Guidelines') },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close settings">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M18.3 5.7a1 1 0 0 0-1.4-1.4L12 9.17 7.1 4.3a1 1 0 0 0-1.4 1.4L10.83 12l-5.13 5.1a1 1 0 1 0 1.4 1.4L12 14.83l4.9 4.87a1 1 0 0 0 1.4-1.4L13.17 12l5.13-5.1Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>

        <div className="settings-content">
          <div className="settings-menu">
            {menuItems.map((item, index) => (
              <button
                key={index}
                className="settings-menu-item"
                onClick={item.action}
              >
                <span className="menu-label">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="settings-footer">
            <p className="app-version">Version 1.0.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
