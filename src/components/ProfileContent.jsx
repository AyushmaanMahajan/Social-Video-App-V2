import React, { forwardRef } from 'react';

const ProfileContent = forwardRef(({ profile }, ref) => {
  const photos = (profile.photos || []).filter(Boolean);
  const prompts = (profile.prompts || []).filter((prompt) => prompt?.question || prompt?.answer);

  return (
    <div className="swipe-scroll-content" ref={ref}>
      <div className="profile-details">
        <div className="profile-header-info">
          <h2>{profile.name}, {profile.age}</h2>
          <p className="location">{profile.location}</p>
        </div>

        {(prompts.length > 0 || photos.length > 0) && (
          <div className="prompts-section">
            <div className="profile-flow">
              {photos[0] && (
                <div className="profile-inline-photo">
                  <img
                    className="profile-photo-media"
                    src={photos[0]}
                    alt={`${profile.name} photo 1`}
                    loading="lazy"
                  />
                </div>
              )}

              {prompts.map((prompt, index) => (
                <React.Fragment key={`prompt-${index}`}>
                  <div className="prompt-card">
                    <h4>{prompt.question || 'Prompt'}</h4>
                    <p>{prompt.answer || ''}</p>
                  </div>
                  {photos[index + 1] && (
                    <div className="profile-inline-photo">
                      <img
                        className="profile-photo-media"
                        src={photos[index + 1]}
                        alt={`${profile.name} photo ${index + 2}`}
                        loading="lazy"
                      />
                    </div>
                  )}
                </React.Fragment>
              ))}

              {prompts.length === 0 && photos.slice(1).map((photo, index) => (
                <div key={`photo-only-${index + 2}`} className="profile-inline-photo">
                  <img
                    className="profile-photo-media"
                    src={photo}
                    alt={`${profile.name} photo ${index + 2}`}
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {profile.about && (
          <div className="about-section">
            <h3>About Me</h3>
            <p>{profile.about}</p>
          </div>
        )}

        {profile.interests && profile.interests.length > 0 && (
          <div className="interests-section">
            <h3>Interests</h3>
            <div className="interests">
              {profile.interests.map((interest, index) => (
                <span key={index} className="interest-tag">
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="profile-end-indicator">
          <div className="end-line"></div>
          <p>End of profile</p>
          <div className="end-line"></div>
        </div>
      </div>
    </div>
  );
});

ProfileContent.displayName = 'ProfileContent';

export default ProfileContent;
