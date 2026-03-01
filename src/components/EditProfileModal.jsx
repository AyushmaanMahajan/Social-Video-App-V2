'use client';
import React, { useState } from 'react';
import PhotoUploader from './PhotoUploader';
import PromptEditor from './PromptEditor';
import ThemeSelector from './ThemeSelector';

function EditProfileModal({ user, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: user.name || '',
    age: user.age || '',
    location: user.location || '',
    photos: user.photos || [],
    about: user.about || '',
    prompts: user.prompts || [],
    interests: user.interests || [],
    currentlyInto: user.currently_into || user.currentlyInto || '',
    askMeAbout: user.ask_me_about || user.askMeAbout || '',
    accentTheme: user.accent_theme || user.accentTheme || 'cyan',
    showAge: (user.show_age ?? user.showAge) !== false,
    showLocation: (user.show_location ?? user.showLocation) !== false,
    showActiveStatus: (user.show_active_status ?? user.showActiveStatus) !== false
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleInterestsChange = (e) => {
    const value = e.target.value;
    const interestsArray = value.split(',').map(i => i.trim()).filter(i => i);
    setFormData(prev => ({ ...prev, interests: interestsArray }));
  };

  // Change handleSave:
    const handleSave = async () => {
    setIsSaving(true);
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    try {
        await onSave(formData);
        setIsSaving(false);
        setShowSuccess(true);
        
        setTimeout(() => {
        setShowSuccess(false);
        onClose();
        }, 1500);
    } catch (error) {
        console.error('Save failed:', error);
        setIsSaving(false);
        alert('Failed to save profile');
    }
    };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="edit-profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Profile</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-scroll-content">
          {/* Identity Layer */}
          <div className="edit-section">
            <h3 className="section-label">Photos</h3>
            <PhotoUploader
              photos={formData.photos}
              onChange={(photos) => handleChange('photos', photos)}
            />
          </div>

          <div className="edit-section">
            <h3 className="section-label">Identity</h3>
            <div className="form-grid">
              <div className="form-field">
                <label>Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div className="form-field">
                <label>Age</label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => handleChange('age', parseInt(e.target.value))}
                  min="18"
                  max="100"
                />
              </div>
              <div className="form-field full-width">
                <label>Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="City, State"
                />
              </div>
            </div>
          </div>

          {/* Narrative Layer */}
          <div className="edit-section">
            <h3 className="section-label">Prompts</h3>
            <PromptEditor
              prompts={formData.prompts}
              onChange={(prompts) => handleChange('prompts', prompts)}
            />
          </div>

          <div className="edit-section">
            <h3 className="section-label">About</h3>
            <textarea
              className="about-textarea"
              value={formData.about}
              onChange={(e) => handleChange('about', e.target.value)}
              placeholder="Tell people about yourself..."
              rows="6"
            />
          </div>

          {/* Personality Layer */}
          <div className="edit-section">
            <h3 className="section-label">Interests</h3>
            <input
              type="text"
              value={formData.interests.join(', ')}
              onChange={handleInterestsChange}
              placeholder="Photography, Travel, Coding (comma separated)"
              className="interests-input"
            />
            <div className="interests-preview">
              {formData.interests.map((interest, index) => (
                <span key={index} className="interest-tag-preview">
                  {interest}
                </span>
              ))}
            </div>
          </div>

          <div className="edit-section">
            <h3 className="section-label">Conversation Starters</h3>
            <div className="form-field">
              <label>Currently into</label>
              <input
                type="text"
                value={formData.currentlyInto}
                onChange={(e) => handleChange('currentlyInto', e.target.value)}
                placeholder="What you're obsessed with right now"
              />
            </div>
            <div className="form-field">
              <label>Ask me about</label>
              <input
                type="text"
                value={formData.askMeAbout}
                onChange={(e) => handleChange('askMeAbout', e.target.value)}
                placeholder="A topic you love discussing"
              />
            </div>
          </div>

          {/* Aesthetic Customization */}
          <div className="edit-section">
            <h3 className="section-label">Profile Theme</h3>
            <ThemeSelector
              selected={formData.accentTheme}
              onChange={(theme) => handleChange('accentTheme', theme)}
            />
          </div>

          {/* Privacy Controls */}
          <div className="edit-section">
            <h3 className="section-label">Visibility</h3>
            <div className="toggle-list">
              <label className="toggle-item">
                <span>Show age</span>
                <input
                  type="checkbox"
                  checked={formData.showAge}
                  onChange={(e) => handleChange('showAge', e.target.checked)}
                  className="toggle-checkbox"
                />
              </label>
              <label className="toggle-item">
                <span>Show location</span>
                <input
                  type="checkbox"
                  checked={formData.showLocation}
                  onChange={(e) => handleChange('showLocation', e.target.checked)}
                  className="toggle-checkbox"
                />
              </label>
              <label className="toggle-item">
                <span>Show active status</span>
                <input
                  type="checkbox"
                  checked={formData.showActiveStatus}
                  onChange={(e) => handleChange('showActiveStatus', e.target.checked)}
                  className="toggle-checkbox"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button 
            className={`btn-save ${isSaving ? 'saving' : ''} ${showSuccess ? 'success' : ''}`}
            onClick={handleSave}
            disabled={isSaving || showSuccess}
          >
            {showSuccess ? (
              <>✓ Saved</>
            ) : isSaving ? (
              <>Saving...</>
            ) : (
              <>Save Changes</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditProfileModal;
