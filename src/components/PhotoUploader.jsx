'use client';
import React, { useState } from 'react';

function PhotoUploader({ photos, onChange }) {
  const [previews, setPreviews] = useState(photos || []);

  const handleFileChange = async (e, index = null) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const newPreviews = [...previews];
      if (index !== null) {
        newPreviews[index] = reader.result;
      } else {
        newPreviews.push(reader.result);
      }
      setPreviews(newPreviews);
      onChange(newPreviews);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (index) => {
    const newPreviews = previews.filter((_, i) => i !== index);
    setPreviews(newPreviews);
    onChange(newPreviews);
  };

  const slots = Array(6).fill(null);

  return (
    <div className="photo-uploader">
      {slots.map((_, index) => {
        const photo = previews[index];
        
        return (
          <div key={index} className="photo-upload-slot">
            {photo ? (
              <div className="photo-preview">
                <img src={photo} alt={`Photo ${index + 1}`} />
                <div className="photo-overlay">
                  <label className="photo-replace-btn">
                    Replace
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, index)}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <button
                    className="photo-remove-btn"
                    onClick={() => removePhoto(index)}
                  >
                    Remove
                  </button>
                </div>
                {index === 0 && <span className="main-badge">Main</span>}
              </div>
            ) : (
              <label className="photo-add-slot">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e)}
                  style={{ display: 'none' }}
                />
                <div className="add-icon">+</div>
                <span>Add Photo</span>
              </label>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default PhotoUploader;