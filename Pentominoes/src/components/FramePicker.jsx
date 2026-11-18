import React, { useState } from 'react';
import { BOARDS } from '../core/boards.js';
import { Dialog } from './Dialog.jsx';

export function FramePicker({ current, onClose, onChoose, description, title = 'Choose a gameboard', eyebrow = 'GAME BOARD' }) {
  const [choice, setChoice] = useState(current);
  return (
    <Dialog title={title} eyebrow={eyebrow} description={description} onClose={onClose} wide>
      <div className="board-options" role="radiogroup" aria-label="Board layouts">
        {BOARDS.map((option) => (
          <label className="board-option" key={option.id}>
            <input type="radio" name="game-board" value={option.id} checked={choice === option.id} onChange={() => setChoice(option.id)} />
            <svg aria-hidden="true" viewBox={`0 0 ${option.width} ${option.height}`} preserveAspectRatio="xMidYMid meet">
              {Array.from({ length: option.width * option.height }, (_, i) => (
                <rect key={i} x={i % option.width} y={Math.floor(i / option.width)} width="1" height="1" fill="var(--well)" stroke="var(--line-strong)" strokeWidth=".06" />
              ))}
              {option.blocked.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" className="blocked-square" />)}
            </svg>
            <span>{option.name}</span>
          </label>
        ))}
      </div>
      <div className="dialog-actions">
        <button className="btn btn-light" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={() => onChoose(choice)}>Use board</button>
      </div>
    </Dialog>
  );
}
