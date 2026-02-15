import React from 'react';

function ProfileCard({ profile, onAddToPool, onReport, showActions, isMutual }) {
  const displayPhoto = profile.photos && profile.photos.length > 0 
    ? profile.photos[0] 
    : profile.photo || 'https://via.placeholder.com/500';

  const displayBio = profile.about || profile.bio || '';

  return (
    <div className="profile-card">
      <div className="profile-image">
        <img src={displayPhoto} alt={profile.name} />
        {isMutual && (
          <div className="mutual-badge">
            ✓ Video Unlocked
          </div>
        )}
      </div>
      
      <div className="profile-content">
        <h3>{profile.name}{profile.age ? `, ${profile.age}` : ''}</h3>
        {profile.location && (
          <p className="location">📍 {profile.location}</p>
        )}
        <p className="bio">{displayBio}</p>
        
        {profile.interests && profile.interests.length > 0 && (
          <div className="interests">
            {profile.interests.slice(0, 5).map((interest, index) => (
              <span key={index} className="interest-tag">
                {interest}
              </span>
            ))}
          </div>
        )}

        {showActions && (
          <div className="card-actions">
            <button
              className="btn-primary"
              onClick={() => onAddToPool(profile.id)}
            >
              Add to Pool
            </button>
            <button
              className="btn-secondary"
              onClick={() => onReport(profile.id)}
            >
              Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfileCard;