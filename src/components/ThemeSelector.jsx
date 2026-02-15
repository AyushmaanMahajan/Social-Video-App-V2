import React from 'react';

const THEMES = [
  { id: 'cyan', name: 'Cyan Glow', color: '#00E5FF' },
  { id: 'violet', name: 'Violet Edge', color: '#9C27B0' },
  { id: 'sunset', name: 'Sunset Soft', color: '#FF6B6B' },
  { id: 'midnight', name: 'Midnight Blue', color: '#1E3A8A' },
  { id: 'minimal', name: 'Minimal White', color: '#6B7280' }
];

function ThemeSelector({ selected, onChange }) {
  return (
    <div className="theme-selector">
      {THEMES.map((theme) => (
        <button
          key={theme.id}
          className={`theme-option ${selected === theme.id ? 'selected' : ''}`}
          onClick={() => onChange(theme.id)}
          style={{
            '--theme-color': theme.color
          }}
        >
          <div className="theme-preview" style={{ background: theme.color }}></div>
          <span className="theme-name">{theme.name}</span>
          {selected === theme.id && <span className="check-mark">✓</span>}
        </button>
      ))}
    </div>
  );
}

export default ThemeSelector;