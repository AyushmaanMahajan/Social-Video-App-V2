import React from 'react';

function OutgoingSection({ outgoing, mutualIds }) {
  const getTimeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (outgoing.length === 0) {
    return (
      <div className="section outgoing-section">
        <h3 className="section-title">⭐ Your Pool</h3>
        <div className="empty-section">
          <p>Your pool is empty</p>
        </div>
      </div>
    );
  }

  return (
    <div className="section outgoing-section">
      <h3 className="section-title">⭐ Your Pool</h3>
      <div className="outgoing-list">
        {outgoing.map((profile) => {
          const isMutual = mutualIds.includes(profile.id);
          return (
            <div key={profile.id} className="outgoing-item">
              <img
                src={profile.photos?.[0] || 'https://via.placeholder.com/100'}
                alt={profile.name}
                className="outgoing-avatar"
              />
              <div className="outgoing-details">
                <h4>{profile.name}, {profile.age}</h4>
                {profile.location && <p className="location-small">📍 {profile.location}</p>}
              </div>
              <div className="outgoing-status">
                {isMutual ? (
                  <span className="status-badge matched">Matched</span>
                ) : (
                  <span className="status-badge waiting">Waiting</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default OutgoingSection;