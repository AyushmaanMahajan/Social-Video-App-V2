'use client';
import React, { useState } from 'react';

const PROMPT_OPTIONS = [
  "Two truths and a lie",
  "My real-life superpower",
  "A typical Sunday",
  "The one thing you should know about me",
  "I'm weirdly attracted to",
  "My most irrational fear",
  "A review of me from a friend",
  "I'm looking for someone who",
  "The topic I can talk about for hours",
  "A hill I'll die on",
  "Currently obsessed with",
  "My most random skill",
  "A question I love being asked",
  "The best adventure I've been on",
  "Deep dive topic I'm into right now",
  "Unpopular opinion I'll defend"
];

function PromptSelectorModal({ onClose, onSelect }) {
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [answer, setAnswer] = useState('');

  const handleSave = () => {
    if (selectedPrompt && answer.trim()) {
      onSelect({ question: selectedPrompt, answer: answer.trim() });
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="prompt-selector-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{selectedPrompt ? 'Your Answer' : 'Choose a Prompt'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {!selectedPrompt ? (
          <div className="prompt-list">
            {PROMPT_OPTIONS.map((prompt, index) => (
              <button
                key={index}
                className="prompt-option-card"
                onClick={() => setSelectedPrompt(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        ) : (
          <div className="prompt-answer-section">
            <div className="selected-prompt">{selectedPrompt}</div>
            <textarea
              className="prompt-answer-input"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Your answer..."
              rows="8"
              maxLength="300"
            />
            <div className="char-counter">{answer.length}/300</div>
            <div className="prompt-actions">
              <button className="btn-back" onClick={() => setSelectedPrompt(null)}>
                Back
              </button>
              <button
                className="btn-save-prompt"
                onClick={handleSave}
                disabled={!answer.trim()}
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PromptSelectorModal;