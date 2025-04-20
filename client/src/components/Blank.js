import React from 'react';
import { styled } from '@mui/material';

const BlankSpan = styled('span')(({ forgotten }) => ({
  display: 'inline-block',
  borderBottom: '2px solid #888',
  background: forgotten ? '#ffcccc' : 'transparent',
  color: forgotten ? '#b71c1c' : 'inherit',
  margin: '0 2px',
  minWidth: '40px',
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'background 0.2s, color 0.2s',
}));

export default function Blank({
  idx,
  word,
  forgotten,
  onToggleForgotten
}) {
  // Handle click and double-click
  const handleClick = () => {
    onToggleForgotten(idx, !forgotten);
  };
  // Double click no longer needed
  return (
    <BlankSpan
      forgotten={forgotten ? 1 : 0}
      onClick={handleClick}
      tabIndex={0}
      role="button"
      aria-pressed={forgotten}
      title={forgotten ? 'Forgotten (click to remember)' : 'Click if forgotten'}
    >
      {"_".repeat(Math.max(4, word.length))}
    </BlankSpan>
  );
}
