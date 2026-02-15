'use client';
import React, { useState } from 'react';

const CURATED_PROMPTS = [
  "The topic I can talk about for hours...",
  "A hill I'll die on...",
  "Currently obsessed with...",
  "My most random skill...",
  "A question I love being asked...",
  "The best adventure I've been on...",
  "Deep dive topic I'm into right now...",
  "Unpopular opinion I'll defend...",
  "Ask me about...",
  "Something I'm weirdly competitive about...",
  "A perfect Sunday looks like...",
  "I'll geek out over...",
];

function PromptEditor({ prompts, onChange }) {
  const [editingIndex, setEditingIndex] = useState(null);

  const handleAddPrompt = () => {
    if (prompts.length >= 5) {
      alert('Maximum 5 prompts allowed');
      return;
    }
    
    onChange([
      ...prompts,
      { question: CURATED_PROMPTS[0], answer: '' }
    ]);
  };

  const handleRemovePrompt = (index) => {
    const newPrompts = prompts.filter((_, i) => i !== index);
    onChange(newPrompts);
  };

  const handleQuestionChange = (index, question) => {
    const newPrompts = [...prompts];
    newPrompts[index] = { ...newPrompts[index], question };
    onChange(newPrompts);
  };

  const handleAnswerChange = (index, answer) => {
    const newPrompts = [...prompts];
    newPrompts[index] = { ...newPrompts[index], answer };
    onChange(newPrompts);
  };

  const movePrompt = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= prompts.length) return;
    
    const newPrompts = [...prompts];
    [newPrompts[index], newPrompts[newIndex]] = [newPrompts[newIndex], newPrompts[index]];
    onChange(newPrompts);
  };

  return (
    <div className="prompt-editor">
      {prompts.map((prompt, index) => (
        <div key={index} className="prompt-edit-card">
          <div className="prompt-header">
            <select
              value={prompt.question}
              onChange={(e) => handleQuestionChange(index, e.target.value)}
              className="prompt-question-select"
            >
              {CURATED_PROMPTS.map((q, i) => (
                <option key={i} value={q}>{q}</option>
              ))}
            </select>
            <div className="prompt-controls">
              {index > 0 && (
                <button
                  className="prompt-control-btn"
                  onClick={() => movePrompt(index, -1)}
                  title="Move up"
                >
                  ↑
                </button>
              )}
              {index < prompts.length - 1 && (
                <button
                  className="prompt-control-btn"
                  onClick={() => movePrompt(index, 1)}
                  title="Move down"
                >
                  ↓
                </button>
              )}
              <button
                className="prompt-control-btn remove"
                onClick={() => handleRemovePrompt(index)}
                title="Remove"
              >
                ✕
              </button>
            </div>
          </div>
          <textarea
            value={prompt.answer}
            onChange={(e) => handleAnswerChange(index, e.target.value)}
            placeholder="Your answer..."
            rows="3"
            className="prompt-answer-input"
          />
        </div>
      ))}

      {prompts.length < 5 && (
        <button className="add-prompt-btn" onClick={handleAddPrompt}>
          + Add Prompt
        </button>
      )}
    </div>
  );
}

export default PromptEditor;