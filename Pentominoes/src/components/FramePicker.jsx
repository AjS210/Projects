import React from 'react';
import { BOARDS } from '../core/boards.js';
import { Dialog } from './Dialog.jsx';

export function FramePicker({ current, onClose, onChoose, description, title = 'Choose a gameboard', eyebrow = 'GAME BOARD' }) {
  return (
    <Dialog title={title} eyebrow={eyebrow} description={description} onClose={onClose} wide>
      <div className="board-options" role="group" aria-label="Board layouts">
        {BOARDS.map((option) => (
          <button type="button" className="board-option" key={option.id} aria-pressed={current === option.id} onClick={() => onChoose(option.id)}>
            <svg aria-hidden="true" viewBox={`0 0 ${option.width} ${option.height}`} preserveAspectRatio="xMidYMid meet">
              {Array.from({ length: option.width * option.height }, (_, i) => (
                <rect key={i} x={i % option.width} y={Math.floor(i / option.width)} width="1" height="1" fill="var(--well)" stroke="var(--line-strong)" strokeWidth=".06" />
              ))}
              {option.blocked.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" className="blocked-square" />)}
            </svg>
            <span>{option.name}</span>
          </button>
        ))}
      </div>
      <div className="dialog-actions">
        <button className="btn btn-light" onClick={onClose}>Cancel</button>
      </div>
    </Dialog>
  );
}
