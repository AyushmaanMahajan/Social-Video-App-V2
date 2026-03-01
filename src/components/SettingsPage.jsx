'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

function SettingsPage({ onEditProfile, onSupport, onLogout, onDeleteAccount, onClose }) {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (!onLogout || isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await onLogout();
    } catch (error) {
      console.error('Logout failed', error);
      setIsLoggingOut(false);
    }
  };

  const handleDelete = async () => {
    if (!onDeleteAccount || isDeleting) return;
    const normalized = deleteText.trim().toLowerCase();
    if (normalized !== 'delete') {
      setDeleteError('Type "delete" exactly to confirm.');
      return;
    }

    setDeleteError('');
    setIsDeleting(true);
    try {
      await onDeleteAccount(normalized);
    } catch (error) {
      setDeleteError(error?.response?.data?.error || 'Failed to delete account. Please try again.');
      setIsDeleting(false);
    }
  };

  const menuItems = [
    { label: 'Edit Profile', action: onEditProfile },
    { label: 'Support', action: onSupport },
    {
      label: 'Community Guidelines',
      action: () => {
        onClose();
        router.push('/community-guidelines');
      },
    },
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
            <div className="settings-danger-zone">
              <button
                className="settings-logout-btn"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? 'Logging out...' : 'Log Out'}
              </button>

              {!showDeleteConfirm ? (
                <button
                  className="delete-account-btn"
                  onClick={() => {
                    setShowDeleteConfirm(true);
                    setDeleteText('');
                    setDeleteError('');
                  }}
                >
                  Delete Account
                </button>
              ) : (
                <div className="delete-confirm-card">
                  <p className="delete-confirm-text">Type &quot;delete&quot; to permanently remove your account.</p>
                  <input
                    className="delete-confirm-input"
                    type="text"
                    value={deleteText}
                    onChange={(e) => setDeleteText(e.target.value)}
                    placeholder='Type "delete"'
                    autoComplete="off"
                    aria-label='Type "delete" to confirm account deletion'
                  />
                  <div className="delete-confirm-actions">
                    <button className="delete-confirm-btn" onClick={handleDelete} disabled={isDeleting}>
                      {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                    </button>
                    <button
                      className="delete-cancel-btn"
                      onClick={() => {
                        if (isDeleting) return;
                        setShowDeleteConfirm(false);
                        setDeleteText('');
                        setDeleteError('');
                      }}
                      disabled={isDeleting}
                    >
                      Cancel
                    </button>
                  </div>
                  {deleteError && <p className="settings-error">{deleteError}</p>}
                </div>
              )}
            </div>

            <p className="app-version">Version 1.0.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
