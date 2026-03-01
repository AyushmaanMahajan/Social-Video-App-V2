'use client';
import React, { useEffect, useRef, useState } from 'react';
import { getToken } from '@/lib/api';

function PhotoUploader({ photos, onChange }) {
  const MAX_PHOTOS = 6;
  const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
  const [previews, setPreviews] = useState(photos || []);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const fileInputRef = useRef(null);
  const targetIndexRef = useRef(null);

  useEffect(() => {
    setPreviews(Array.isArray(photos) ? photos : []);
  }, [photos]);

  const parseError = async (res, fallbackMessage) => {
    try {
      const body = await res.json();
      return body?.error || fallbackMessage;
    } catch {
      return fallbackMessage;
    }
  };

  const handlePhotoUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      throw new Error(await parseError(res, 'Upload failed. Please try again.'));
    }

    const data = await res.json();
    if (!data?.url) {
      throw new Error('Upload succeeded but image URL was missing.');
    }
    return data.url;
  };

  const persistPhotos = async (nextPhotos) => {
    const token = getToken();
    const res = await fetch('/api/users/me', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        photos: nextPhotos,
      }),
    });

    if (!res.ok) {
      throw new Error(await parseError(res, 'Failed to save photo to profile.'));
    }
  };

  const openFilePicker = (index = null) => {
    if (isUploading) return;
    targetIndexRef.current = index;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const validateImage = (file) => {
    if (!file) return 'No file selected.';
    if (!file.type || !file.type.startsWith('image/')) return 'Please select a valid image file.';
    if (file.size > MAX_FILE_SIZE_BYTES) return 'Image must be 5MB or smaller.';
    return null;
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    const validationError = validateImage(file);
    if (validationError) {
      setUploadError(validationError);
      setUploadStatus('');
      return;
    }
    if (isUploading) return;

    const targetIndex = targetIndexRef.current;
    if (targetIndex === null && previews.length >= MAX_PHOTOS) {
      setUploadError('You can upload up to 6 photos.');
      setUploadStatus('');
      return;
    }

    setUploadError('');
    setUploadStatus('Uploading photo...');
    setIsUploading(true);
    try {
      const uploadedUrl = await handlePhotoUpload(file);
      const newPreviews = [...previews];
      if (targetIndex !== null && targetIndex >= 0 && targetIndex < newPreviews.length) {
        newPreviews[targetIndex] = uploadedUrl;
      } else {
        newPreviews.push(uploadedUrl);
      }

      await persistPhotos(newPreviews);
      setPreviews(newPreviews);
      onChange(newPreviews);
      setUploadStatus('Photo uploaded successfully.');
    } catch (error) {
      setUploadError(error?.message || 'Failed to upload photo.');
      setUploadStatus('');
    } finally {
      setIsUploading(false);
      targetIndexRef.current = null;
    }
  };

  const removePhoto = async (index) => {
    if (isUploading) return;
    setUploadError('');
    setUploadStatus('Updating photos...');
    const newPreviews = previews.filter((_, i) => i !== index);
    try {
      await persistPhotos(newPreviews);
      setPreviews(newPreviews);
      onChange(newPreviews);
      setUploadStatus('Photo removed.');
    } catch (error) {
      setUploadError(error?.message || 'Failed to remove photo.');
      setUploadStatus('');
    }
  };

  const slots = Array(MAX_PHOTOS).fill(null);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      <div className="photo-upload-controls">
        <button
          type="button"
          className="photo-upload-trigger"
          onClick={() => openFilePicker(null)}
          disabled={isUploading || previews.length >= MAX_PHOTOS}
        >
          {isUploading ? 'Uploading...' : 'Upload Image'}
        </button>
        <span className="photo-upload-hint">Images only, max 5MB each</span>
      </div>

      {uploadError && <p className="photo-upload-error">{uploadError}</p>}
      {!uploadError && uploadStatus && <p className="photo-upload-status">{uploadStatus}</p>}

      <div className="photo-uploader">
        {slots.map((_, index) => {
          const photo = previews[index];

          return (
            <div key={index} className="photo-upload-slot">
              {photo ? (
                <div className="photo-preview">
                  <img src={photo} alt={`Photo ${index + 1}`} />
                  <div className="photo-overlay">
                    <button
                      type="button"
                      className="photo-replace-btn"
                      onClick={() => openFilePicker(index)}
                      disabled={isUploading}
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      className="photo-remove-btn"
                      onClick={() => removePhoto(index)}
                      disabled={isUploading}
                    >
                      Remove
                    </button>
                  </div>
                  {index === 0 && <span className="main-badge">Main</span>}
                </div>
              ) : (
                <button
                  type="button"
                  className="photo-add-slot"
                  onClick={() => openFilePicker(null)}
                  disabled={isUploading || previews.length >= MAX_PHOTOS}
                >
                  <div className="add-icon">+</div>
                  <span>Add Photo</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

export default PhotoUploader;
