'use client';

import React, { useEffect, useMemo, useState } from 'react';

const POSITIONS = [
  { top: '9%', left: '13%' },
  { top: '18%', left: '62%' },
  { top: '37%', left: '26%' },
  { top: '56%', left: '68%' },
  { top: '74%', left: '18%' },
];

export default function WatermarkOverlay({ username = 'Member', sessionTag = '' }) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * POSITIONS.length));
  const label = useMemo(() => `${username} - CNXR${sessionTag ? ` - ${sessionTag}` : ''}`, [username, sessionTag]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((prev) => {
        let next = Math.floor(Math.random() * POSITIONS.length);
        if (next === prev) next = (next + 1) % POSITIONS.length;
        return next;
      });
    }, 7000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="video-watermark" style={POSITIONS[index]}>
      {label}
    </div>
  );
}
