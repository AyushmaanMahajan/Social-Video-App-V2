import React from 'react';

function MutualSection({ matches, onMatchClick }) {
  if (matches.length === 0) {
    return (
      <div className="section mutual-section">
        <h3 className="section-title">🔥 Matched With You</h3>
        <div className="empty-section">
          <p>No mutual matches yet. Keep swiping!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="section mutual-section">
      <h3 className="section-title">🔥 Matched With You</h3>
      <div className="mutual-scroll">
        {matches.map((match) => (
          <div
            key={match.id}
            className="mutual-card"
            onClick={() => onMatchClick(match)}
          >
            <div className="mutual-avatar-wrapper">
              <img
                src={match.photos?.[0] || 'https://via.placeholder.com/150'}
                alt={match.name}
                className="mutual-avatar"
              />
              <div className="active-indicator"></div>
            </div>
            <p className="mutual-name">{match.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MutualSection;