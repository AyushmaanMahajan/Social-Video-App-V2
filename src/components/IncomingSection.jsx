import React from 'react';

function IncomingSection({ incoming, onAccept, onPass, onViewProfile }) {
  const getTimeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (incoming.length === 0) {
    return (
      <div className="section incoming-section">
        <h3 className="section-title">💬 Wants to Connect</h3>
        <div className="empty-section">
          <p>No incoming connections yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="section incoming-section">
      <h3 className="section-title">💬 Wants to Connect</h3>
      <div className="incoming-grid">
        {incoming.map((profile) => (
          <div key={profile.id} className="incoming-card">
            <div className="incoming-image">
              <img
                src={profile.photos?.[0] || 'https://via.placeholder.com/300'}
                alt={profile.name}
              />
              <div className="pulse-border"></div>
              <span className="time-badge">{getTimeAgo(profile.addedAt)}</span>
            </div>
            <div className="incoming-info">
              <h4>{profile.name}, {profile.age}</h4>
              {profile.location && <p className="location-text">📍 {profile.location}</p>}
              <div className="incoming-actions">
                <button
                  className="btn-accept"
                  onClick={() => onAccept(profile.id)}
                >
                  Accept
                </button>
                <button
                  className="btn-view"
                  onClick={() => onViewProfile(profile)}
                >
                  View
                </button>
                <button
                  className="btn-pass-small"
                  onClick={() => onPass(profile.id)}
                >
                  Pass
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default IncomingSection;