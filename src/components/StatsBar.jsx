import React from 'react';

function StatsBar({ mutualCount, incomingCount, outgoingCount }) {
  return (
    <div className="stats-bar">
      <div className="stat-item">
        <span className="stat-icon">🔥</span>
        <span className="stat-number">{mutualCount}</span>
        <span className="stat-label">Mutual</span>
      </div>
      <div className="stat-item">
        <span className="stat-icon">💬</span>
        <span className="stat-number">{incomingCount}</span>
        <span className="stat-label">Incoming</span>
      </div>
      <div className="stat-item">
        <span className="stat-icon">⭐</span>
        <span className="stat-number">{outgoingCount}</span>
        <span className="stat-label">Waiting</span>
      </div>
    </div>
  );
}

export default StatsBar;