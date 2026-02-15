'use client';
import React, { useState, useEffect, useRef } from 'react';
import { getProfiles, addToPool, reportUser } from '@/lib/api';
import ProfileContent from './ProfileContent';

function Browse({ currentUser }) {
  const [profiles, setProfiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swipeDirection, setSwipeDirection] = useState(null);

  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const [swipeType, setSwipeType] = useState(null);

  const cardRef = useRef(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const data = await getProfiles();
      setProfiles(data);
    } catch (error) {
      console.error('Failed to load profiles', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = async (direction) => {
    if (currentIndex >= profiles.length) return;

    setSwipeDirection(direction);

    if (direction === 'right') {
      try {
        await addToPool(profiles[currentIndex].id);
      } catch (error) {
        console.error('Failed to add to pool');
      }
    }

    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      setSwipeDirection(null);
      resetDrag();
    }, 300);
  };

  const handleReport = async () => {
    const reason = prompt('Please enter reason for reporting:');
    if (!reason) return;

    try {
      await reportUser(profiles[currentIndex].id, reason);
      alert('Report submitted');
      setCurrentIndex((prev) => prev + 1);
    } catch (error) {
      alert('Failed to submit report');
    }
  };

  const resetDrag = () => {
    setIsDragging(false);
    setStartPos({ x: 0, y: 0 });
    setCurrentPos({ x: 0, y: 0 });
    setSwipeType(null);
  };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    setStartPos({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchMove = (e) => {
    if (!startPos.x && !startPos.y) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - startPos.x;
    const deltaY = touch.clientY - startPos.y;

    if (!swipeType) {
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
          setSwipeType('horizontal');
          setIsDragging(true);
        } else {
          setSwipeType('vertical');
        }
      }
    }

    if (swipeType === 'horizontal') {
      e.preventDefault();
      setCurrentPos({ x: deltaX, y: deltaY * 0.1 });
    }
  };

  const handleTouchEnd = () => {
    if (swipeType === 'horizontal' && isDragging) {
      const threshold = 100;

      if (currentPos.x > threshold) {
        handleSwipe('right');
      } else if (currentPos.x < -threshold) {
        handleSwipe('left');
      } else {
        resetDrag();
      }
    } else {
      resetDrag();
    }
  };

  const handleMouseDown = (e) => {
    setStartPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (!startPos.x && !startPos.y) return;

    const deltaX = e.clientX - startPos.x;
    const deltaY = e.clientY - startPos.y;

    if (!swipeType && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        setSwipeType('horizontal');
        setIsDragging(true);
      }
    }

    if (swipeType === 'horizontal') {
      setCurrentPos({ x: deltaX, y: deltaY * 0.1 });
    }
  };

  const handleMouseUp = () => {
    if (swipeType === 'horizontal' && isDragging) {
      const threshold = 100;

      if (currentPos.x > threshold) {
        handleSwipe('right');
      } else if (currentPos.x < -threshold) {
        handleSwipe('left');
      } else {
        resetDrag();
      }
    } else {
      resetDrag();
    }
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'ArrowLeft') handleSwipe('left');
      if (e.key === 'ArrowRight') handleSwipe('right');
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, profiles]);

  if (loading) {
    return <div className="loading">Loading profiles...</div>;
  }

  if (profiles.length === 0 || currentIndex >= profiles.length) {
    return (
      <div className="empty-state">
        <h2>No more profiles to discover</h2>
        <p>Check back later for new people!</p>
      </div>
    );
  }

  const currentProfile = profiles[currentIndex];

  const rotation = swipeType === 'horizontal' ? currentPos.x / 20 : 0;
  const opacity = isDragging ? 1 - Math.abs(currentPos.x) / 300 : 1;

  return (
    <div className="browse-container">
      <div className="swipe-header">
        <h2>Discover</h2>
        <div className="header-info">
          <span className="remaining-count">
            {profiles.length - currentIndex}
          </span>
          <span className="remaining-text">remaining</span>
        </div>
      </div>

      <div className="swipe-card-wrapper">
        <div
          ref={cardRef}
          className={`swipe-card ${
            swipeDirection ? `swipe-${swipeDirection}` : ''
          } ${isDragging ? 'dragging' : ''}`}
          style={{
            transform:
              swipeType === 'horizontal'
                ? `translateX(${currentPos.x}px) translateY(${currentPos.y}px) rotate(${rotation}deg)`
                : 'none',
            opacity: swipeType === 'horizontal' ? opacity : 1,
            transition: isDragging
              ? 'none'
              : 'transform 0.3s ease, opacity 0.3s ease'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <ProfileContent profile={currentProfile} />
        </div>

        <div className="swipe-actions">
          <button
            className="swipe-btn swipe-btn-pass"
            onClick={() => handleSwipe('left')}
          >
            ✕
          </button>

          <button
            className="swipe-btn swipe-btn-report"
            onClick={handleReport}
          >
            ⚠
          </button>

          <button
            className="swipe-btn swipe-btn-like"
            onClick={() => handleSwipe('right')}
          >
            ♥
          </button>
        </div>
      </div>
    </div>
  );
}

export default Browse;
