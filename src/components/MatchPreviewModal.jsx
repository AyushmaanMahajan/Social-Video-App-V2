import React from 'react';

function MatchPreviewModal({ match, onClose, onStartVideo }) {
  if (!match) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="match-preview-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        
        <div className="modal-content">
          <div className="modal-image">
            <img
              src={match.photos?.[0] || 'https://via.placeholder.com/500'}
              alt={match.name}
            />
          </div>
          
          <div className="modal-info">
            <h2>{match.name}, {match.age}</h2>
            {match.location && <p className="location">📍 {match.location}</p>}
            
            {match.about && (
              <div className="modal-section">
                <h4>About</h4>
                <p>{match.about}</p>
              </div>
            )}
            
            {match.interests && match.interests.length > 0 && (
              <div className="modal-section">
                <h4>Interests</h4>
                <div className="interests">
                  {match.interests.map((interest, index) => (
                    <span key={index} className="interest-tag">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <div className="modal-actions">
              <button className="btn-video-start" onClick={() => onStartVideo(match)}>
                📹 Start Video Chat
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MatchPreviewModal;