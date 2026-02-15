import React, { forwardRef } from 'react';
import PhotoCarousel from './PhotoCarousel';

const ProfileContent = forwardRef(({ profile }, ref) => {
  return (
    <div className="swipe-scroll-content" ref={ref}>
      <PhotoCarousel photos={profile.photos} />
      
      <div className="profile-details">
        <div className="profile-header-info">
          <h2>{profile.name}, {profile.age}</h2>
          <p className="location">📍 {profile.location}</p>
        </div>

        {profile.prompts && profile.prompts.length > 0 && (
          <div className="prompts-section">
            {profile.prompts.map((prompt, index) => (
              <div key={index} className="prompt-card">
                <h4>{prompt.question}</h4>
                <p>{prompt.answer}</p>
              </div>
            ))}
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