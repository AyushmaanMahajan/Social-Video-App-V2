import React from 'react';

function ProfileView({ user, onEdit }) {
  const displayPhoto = user.photos && user.photos.length > 0 
    ? user.photos[0] 
    : 'https://via.placeholder.com/500';

  return (
    <div className="profile-view">
      <div className="profile-view-header">
        <div className="view-tabs">
          <button className="tab-btn active">View Profile</button>
          <button className="tab-btn" onClick={onEdit}>Edit Profile</button>
        </div>
      </div>

      <div className="profile-content-scroll">
        <div className="profile-photos-carousel">
          {user.photos && user.photos.length > 0 ? (
            user.photos.map((photo, index) => (
              <img key={index} src={photo} alt={`Photo ${index + 1}`} />
            ))
          ) : (
            <img src={displayPhoto} alt="Profile" />
          )}
        </div>

        <div className="profile-info-section">
          <h1 className="profile-name">
            {user.name}{user.age && user.showAge !== false ? `, ${user.age}` : ''}
          </h1>
          {user.location && user.showLocation !== false && (
            <p className="profile-location">📍 {user.location}</p>
          )}
        </div>

        {user.about && (
          <div className="profile-card">
            <h3 className="card-title">About Me</h3>
            <p className="card-text">{user.about}</p>
          </div>
        )}

        {user.prompts && user.prompts.length > 0 && (
          <div className="prompts-display">
            {user.prompts.map((prompt, index) => (
              <div key={index} className="prompt-display-card">
                <h4 className="prompt-question">{prompt.question}</h4>
                <p className="prompt-answer">{prompt.answer}</p>
              </div>
            ))}
          </div>
        )}

        {user.interests && user.interests.length > 0 && (
          <div className="profile-card">
            <h3 className="card-title">Interests</h3>
            <div className="interests-display">
              {user.interests.map((interest, index) => (
                <span key={index} className="interest-chip">
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfileView;