import React from 'react';

function ProfileView({ user, onEdit }) {
  const photos = (user.photos || []).filter(Boolean);
  const prompts = (user.prompts || []).filter((prompt) => prompt?.question || prompt?.answer);

  return (
    <div className="profile-view">
      <div className="profile-view-header">
        <div className="view-tabs">
          <button className="tab-btn active">View Profile</button>
          <button className="tab-btn" onClick={onEdit}>Edit Profile</button>
        </div>
      </div>

      <div className="profile-content-scroll">
        <div className="profile-info-section">
          <h1 className="profile-name">
            {user.name}{user.age && user.showAge !== false ? `, ${user.age}` : ''}
          </h1>
          {user.location && user.showLocation !== false && (
            <p className="profile-location">{user.location}</p>
          )}
          {user.gender && (user.gender_visible ?? user.genderVisible) !== false && (
            <p className="profile-location">{String(user.gender).replace(/_/g, ' ')}</p>
          )}
        </div>

        {(prompts.length > 0 || photos.length > 0) && (
          <div className="prompts-display">
            <div className="profile-flow">
              {photos[0] && (
                <div className="profile-inline-photo">
                  <img
                    className="profile-photo-media"
                    src={photos[0]}
                    alt={`${user.name} photo 1`}
                    loading="lazy"
                  />
                </div>
              )}

              {prompts.map((prompt, index) => (
                <React.Fragment key={`prompt-${index}`}>
                  <div className="prompt-display-card">
                    <h4 className="prompt-question">{prompt.question || 'Prompt'}</h4>
                    <p className="prompt-answer">{prompt.answer || ''}</p>
                  </div>
                  {photos[index + 1] && (
                    <div className="profile-inline-photo">
                      <img
                        className="profile-photo-media"
                        src={photos[index + 1]}
                        alt={`${user.name} photo ${index + 2}`}
                        loading="lazy"
                      />
                    </div>
                  )}
                </React.Fragment>
              ))}

              {prompts.length === 0 && photos.slice(1).map((photo, index) => (
                <div key={`photo-only-${index + 2}`} className="profile-inline-photo">
                  <img className="profile-photo-media" src={photo} alt={`${user.name} photo ${index + 2}`} loading="lazy" />
                </div>
              ))}
            </div>
          </div>
        )}

        {user.about && (
          <div className="profile-card">
            <h3 className="card-title">About Me</h3>
            <p className="card-text">{user.about}</p>
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
