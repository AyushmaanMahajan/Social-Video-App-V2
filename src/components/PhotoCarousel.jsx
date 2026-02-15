'use client';
import React, { useState } from 'react';

function PhotoCarousel({ photos }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!photos || photos.length === 0) {
    return (
      <div className="photo-carousel">
        <div className="photo-placeholder">No photos available</div>
      </div>
    );
  }

  return (
    <div className="photo-carousel-container">
      <div className="photo-carousel">
        {photos.map((photo, index) => (
          <img
            key={index}
            src={photo}
            alt={`Photo ${index + 1}`}
            className={index === currentIndex ? 'active' : ''}
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          />
        ))}
      </div>
      
      <div className="photo-indicators">
        {photos.map((_, index) => (
          <div
            key={index}
            className={`indicator ${index === currentIndex ? 'active' : ''}`}
            onClick={() => setCurrentIndex(index)}
          />
        ))}
      </div>

      {currentIndex > 0 && (
        <button
          className="photo-nav photo-nav-prev"
          onClick={() => setCurrentIndex(currentIndex - 1)}
        >
          ‹
        </button>
      )}
      
      {currentIndex < photos.length - 1 && (
        <button
          className="photo-nav photo-nav-next"
          onClick={() => setCurrentIndex(currentIndex + 1)}
        >
          ›
        </button>
      )}
    </div>
  );
}

export default PhotoCarousel;

