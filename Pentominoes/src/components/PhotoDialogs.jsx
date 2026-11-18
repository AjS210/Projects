import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  CameraOff,
  ImagePlus,
  LoaderCircle,
  ScanLine,
  RotateCcw,
  Maximize,
  Link2,
  Move,
} from 'lucide-react';
import { Dialog, Notice } from './Dialog.jsx';
import {
  projector,
  landscapeFrame,
  goodFrame,
  moveLinkedCorner,
  straightenFrame,
} from '../core/recognition.js';
import { translateFrame, boardAtFrame, frameBounds } from '../core/photoFrames.js';

export function AlignDialog({ photo, corners, boards, onClose, onRead }) {
  const [frame, setFrame] = useState(corners),
    [resetTo, setResetTo] = useState(corners);
  const activeBoard = boardAtFrame(boards, frame);
  const drag = useRef(null),
    svg = useRef(null),
    w = 1000,
    h = (w * photo.height) / photo.width;
  const names = ['Top left', 'Top right', 'Bottom right', 'Bottom left'];
  const valid = goodFrame(frame);
  const project = valid ? projector(landscapeFrame(frame, photo.width, photo.height)) : null;
  const point = ([x, y]) => `${x * w},${y * h}`;
  const bounds = frameBounds(frame);
  const fillsPhoto = bounds.right - bounds.left > 0.99 && bounds.bottom - bounds.top > 0.99;
  const center = frame.reduce(([x, y], [px, py]) => [x + px / 4, y + py / 4], [0, 0]);
  // Use displacement from the grab point, not the finger's absolute position:
  // grabbing the outside of a handle should not snap the grid underneath it.
  function imagePoint(e) {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(
      svg.current.getScreenCTM().inverse(),
    );
    return [p.x / w, p.y / h];
  }
  function startDrag(e, corner, from = frame) {
    if (drag.current || e.button !== 0) return false;
    e.preventDefault();
    // An inactive board's outline disappears when selected. Capture on the
    // stable SVG so a tap can continue straight into a drag on touch devices.
    svg.current.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, start: imagePoint(e), frame: from, corner };
    return true;
  }
  // A null handle means drag the body. Corner zero is the top-left resize handle.
  function moved(from, corner, dx, dy) {
    return corner === null ? translateFrame(from, dx, dy) : moveLinkedCorner(from, corner, dx, dy);
  }
  function handleMove(e) {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    const [x, y] = imagePoint(e);
    setFrame(moved(d.frame, d.corner, x - d.start[0], y - d.start[1]));
  }
  function endDrag(e) {
    if (e.pointerId === drag.current?.id) drag.current = null;
  }
  function nudge(e, corner) {
    const dx = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    const dy = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    if (!dx && !dy) return;
    e.preventDefault();
    const step = e.shiftKey ? 0.01 : 0.002;
    setFrame((prev) => moved(prev, corner, dx * step, dy * step));
  }
  function jumpTo(i, pointer) {
    if (drag.current || !boards[i]) return;
    const next = (boards[i].review ?? boards[i]).corners;
    if (pointer && !startDrag(pointer, null, next)) return;
    setFrame(next);
    setResetTo(next);
  }
  const tilted =
    frame[0][0] !== frame[3][0] ||
    frame[1][0] !== frame[2][0] ||
    frame[0][1] !== frame[1][1] ||
    frame[3][1] !== frame[2][1];
  const path = `M0 0H${w}V${h}H0Z M${frame.map(point).join('L')}Z`;
  return (
    <Dialog
      wide
      title="Adjust board frame"
      eyebrow="PHOTO ALIGNMENT"
      description="Drag inside the frame to move it to another grid. Drag a corner to resize the linked edges. Read grid scans only the area inside the frame."
      onClose={onClose}
    >
      {boards.length > 1 && (
        <label className="frame-jump">
          Jump to board
          <select value={activeBoard} onChange={(e) => jumpTo(Number(e.target.value))}>
            {activeBoard < 0 && (
              <option value={-1} disabled>
                Custom frame
              </option>
            )}
            {boards.map((_, i) => (
              <option key={i} value={i}>
                Board {i + 1} of {boards.length}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="align-surface">
        <svg
          ref={svg}
          viewBox={`0 0 ${w} ${h}`}
          className="align-image"
          onPointerMove={handleMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={(e) => {
            if (e.target === svg.current) endDrag(e);
          }}
          aria-label="Adjustable photo frame"
        >
          <image href={photo.url} width={w} height={h} />
          <path d={path} fill="rgba(21,20,34,.46)" fillRule="evenodd" />
          {boards.length > 1 &&
            boards.map(
              (b, i) =>
                i !== activeBoard && (
                  <path
                    key={i}
                    className="frame-jump-target"
                    aria-hidden="true"
                    d={`M${b.corners.map(point).join('L')}Z`}
                    vectorEffect="non-scaling-stroke"
                    onPointerDown={(e) => jumpTo(i, e)}
                  >
                    <title>Jump to board {i + 1}</title>
                  </path>
                ),
            )}
          {valid && (
            <g stroke="white" strokeWidth="1.5" strokeOpacity=".65" pointerEvents="none">
              {Array.from({ length: 9 }, (_, i) => (
                <path
                  key={`x${i}`}
                  d={`M${point(project((i + 1) / 10, 0))}L${point(project((i + 1) / 10, 1))}`}
                />
              ))}
              {Array.from({ length: 5 }, (_, i) => (
                <path
                  key={`y${i}`}
                  d={`M${point(project(0, (i + 1) / 6))}L${point(project(1, (i + 1) / 6))}`}
                />
              ))}
            </g>
          )}
          <polygon
            className="frame-body"
            points={frame.map(point).join(' ')}
            fill="transparent"
            stroke={valid ? '#e1d6ff' : '#ffb6a3'}
            strokeWidth="4"
            tabIndex="0"
            role="button"
            aria-label="Move whole frame. Drag or use arrow keys."
            onPointerDown={(e) => startDrag(e, null)}
            onKeyDown={(e) => nudge(e, null)}
          />
          <g pointerEvents="none" aria-hidden="true" transform={`translate(${point(center)})`}>
            <circle r="21" fill="#292238" fillOpacity=".72" />
            <Move x="-15" y="-15" size={30} color="white" />
          </g>
          {frame.map(([x, y], i) => (
            <g
              key={i}
              className="corner-handle"
              transform={`translate(${x * w} ${y * h})`}
              tabIndex="0"
              role="button"
              aria-label={`${names[i]} handle. Drag or use arrow keys.`}
              onKeyDown={(e) => nudge(e, i)}
              onPointerDown={(e) => startDrag(e, i)}
            >
              <circle
                r="12"
                fill="transparent"
                stroke="transparent"
                strokeWidth="36"
                vectorEffect="non-scaling-stroke"
              />
              <circle r="12" fill="#6951c9" stroke="white" strokeWidth="4" />
              <circle r="3.5" fill="white" />
            </g>
          ))}
        </svg>
      </div>
      <div className="align-hint">
        <Link2 size={16} aria-hidden="true" />
        <span>
          {fillsPhoto
            ? 'This frame fills the photo. Drag a corner inward first to make room to move.'
            : boards.length > 1
              ? 'Tap another outlined board to move the frame there.'
              : 'Keep the puzzle rim outside the grid.'}
        </span>
        {tilted && (
          <button className="text-btn" onClick={() => setFrame(straightenFrame)}>
            Straighten edges
          </button>
        )}
      </div>
      {!valid && <Notice error>Enlarge the frame to read the grid.</Notice>}
      <div className="dialog-actions">
        <button className="text-btn" disabled={frame === resetTo} onClick={() => setFrame(resetTo)}>
          <RotateCcw size={14} />
          Reset frame
        </button>
        <button className="btn btn-primary" disabled={!valid} onClick={() => onRead(frame)}>
          <ScanLine size={16} />
          Read grid
        </button>
      </div>
    </Dialog>
  );
}

export function PhotoDialog({ photo, onClose, onAlign }) {
  return (
    <Dialog
      title={photo.sample ? 'Sample board photo' : 'Your board photo'}
      eyebrow="PHOTO PREVIEW"
      wide
      onClose={onClose}
    >
      <img className="expanded-photo" src={photo.url} alt="Full view of the pentomino board" />
      <div className="dialog-actions">
        <span className="file-caption">
          {photo.width} × {photo.height} PX
        </span>
        <button className="btn btn-light" onClick={onAlign}>
          <Maximize size={15} />
          Adjust frame
        </button>
      </div>
    </Dialog>
  );
}
export function CameraDialog({ onClose, onFile, onBrowse }) {
  const video = useRef(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false,
      stream;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia)
          throw new Error('Camera access is unavailable in this browser.');
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        video.current.srcObject = stream;
        await video.current.play();
        if (!cancelled) setReady(true);
      } catch (err) {
        if (!cancelled)
          setError(
            err.name === 'NotAllowedError'
              ? 'Camera access was not granted. Allow camera access in your browser, or choose a photo instead.'
              : 'No camera is available here. You can still upload a photo of your puzzle.',
          );
      }
    })();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  const capture = () => {
    const cam = video.current;
    if (!cam?.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = cam.videoWidth;
    canvas.height = cam.videoHeight;
    canvas.getContext('2d').drawImage(cam, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) onFile(new File([blob], 'Camera capture.jpg', { type: 'image/jpeg' }));
        else setError('The capture was not readable. Try uploading a photo.');
      },
      'image/jpeg',
      0.94,
    );
  };
  return (
    <Dialog
      title="Capture a solution"
      eyebrow="CAMERA"
      description="Keep the whole board in view and hold your camera as square to the puzzle as possible."
      wide
      onClose={onClose}
    >
      <div className="camera-surface">
        <video ref={video} autoPlay muted playsInline aria-label="Live camera preview" />
        {!ready && (
          <div className="camera-message">
            {error ? <CameraOff size={32} /> : <LoaderCircle className="spin" size={30} />}
            <p>{error || 'Waiting for camera permission…'}</p>
          </div>
        )}
      </div>
      <div className="dialog-actions">
        <button onClick={onBrowse} className="btn btn-light">
          <ImagePlus size={16} />
          Choose a photo
        </button>
        <button className="btn btn-primary" disabled={!ready} onClick={capture}>
          <Camera size={16} />
          Take photo
        </button>
      </div>
    </Dialog>
  );
}
