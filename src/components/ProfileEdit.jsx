'use client';
import React, { useState } from 'react';
import PhotoUploader from './PhotoUploader';
import PromptSelectorModal from './PromptSelectorModal';

function ProfileEdit({ user, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: user.name || '',
    age: user.age || '',
    location: user.location || '',
    photos: user.photos || [],
    about: user.about || '',
    prompts: user.prompts || [],
    interests: user.interests || []
  });

  const [showPromptModal, setShowPromptModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddPrompt = (prompt) => {
    if (formData.prompts.length < 3) {
      setFormData(prev => ({
        ...prev,
        prompts: [...prev.prompts, prompt]
      }));
    }
  };

  const handleRemovePrompt = (index) => {
    setFormData(prev => ({
      ...prev,
      prompts: prev.prompts.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false);
  };

  return (
    <div className="profile-edit">
      <div className="profile-view-header">
        <div className="view-tabs">
          <button className="tab-btn" onClick={onCancel}>View Profile</button>
          <button className="tab-btn active">Edit Profile</button>
        </div>
      </div>

      <div className="edit-content-scroll">
        <div className="edit-section">
          <h3 className="section-title">Photos</h3>
          <p className="section-hint">Add up to 6 photos. First photo is your main photo.</p>
          <PhotoUploader
            photos={formData.photos}
            onChange={(photos) => handleChange('photos', photos)}
          />
        </div>

        <div className="edit-section">
          <h3 className="section-title">Basic Info</h3>
          <div className="form-row">
            <div className="form-field">
              <label>Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>Age</label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => handleChange('age', parseInt(e.target.value))}
                min="18"
              />
            </div>
          </div>
          <div className="form-field">
            <label>Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="City, State"
            />
          </div>
        </div>

        <div className="edit-section">
          <h3 className="section-title">About Me</h3>
          <textarea
            className="about-input"
            value={formData.about}
            onChange={(e) => handleChange('about', e.target.value)}
            placeholder="Tell people about yourself..."
            rows="6"
            maxLength="500"
          />
          <div className="char-counter">{formData.about.length}/500</div>
        </div>

        <div className="edit-section">
          <h3 className="section-title">Prompts ({formData.prompts.length}/3)</h3>
          <div className="prompts-edit-list">
            {formData.prompts.map((prompt, index) => (
              <div key={index} className="prompt-edit-item">
                <div className="prompt-edit-content">
                  <h4>{prompt.question}</h4>
                  <p>{prompt.answer}</p>
                </div>
                <button
                  className="prompt-remove"
                  onClick={() => handleRemovePrompt(index)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          {formData.prompts.length < 3 && (
            <button
              className="add-prompt-large"
              onClick={() => setShowPromptModal(true)}
            >
              + Add Prompt
            </button>
          )}
        </div>

        <div className="edit-section">
          <h3 className="section-title">Interests</h3>
          <input
            type="text"
            value={formData.interests.join(', ')}
            onChange={(e) => handleChange('interests', e.target.value.split(',').map(i => i.trim()).filter(i => i))}
            placeholder="Photography, Travel, Music"
            className="interests-input"
          />
        </div>
      </div>

      <div className="edit-footer">
        <button className="btn-cancel" onClick={onCancel}>Cancel</button>
        <button
          className="btn-save-profile"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {showPromptModal && (
        <PromptSelectorModal
          onClose={() => setShowPromptModal(false)}
          onSelect={handleAddPrompt}
        />
      )}
    </div>
  );
}

export default ProfileEdit;