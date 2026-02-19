'use client';
import React, { useState } from 'react';

function PhotoGridEditor({ photos, onChange }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  const handleAddPhoto = () => {
    const url = prompt('Enter photo URL:');
    if (url && url.trim()) {
      onChange([...photos, url.trim()]);
    }
  };

  const handleRemovePhoto = (index) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onChange(newPhotos);
  };

  const handleReplacePhoto = (index) => {
    const url = prompt('Enter new photo URL:', photos[index]);
    if (url && url.trim()) {
      const newPhotos = [...photos];
      newPhotos[index] = url.trim();
      onChange(newPhotos);
    }
  };

  const slots = Array(6).fill(null);

  return (
    <div className="photo-grid-editor">
      {slots.map((_, index) => {
        const photo = photos[index];
        return (
          <div
            key={index}
            className={`photo-slot ${photo ? 'filled' : 'empty'}`}
            onMouseEnter={() => setHoverIndex(index)}
            onMouseLeave={() => setHoverIndex(null)}
          >
            {photo ? (
              <>
                <img src={photo} alt={`Photo ${index + 1}`} />
                {hoverIndex === index && (
                  <div className="photo-actions">
                    <button
                      className="photo-action-btn"
                      onClick={() => handleReplacePhoto(index)}
                      title="Replace"
                    >
                      Replace
                    </button>
                    <button
                      className="photo-action-btn"
                      onClick={() => handleRemovePhoto(index)}
                      title="Remove"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button className="add-photo-btn" onClick={handleAddPhoto}>
                Add Photo
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default PhotoGridEditor;
