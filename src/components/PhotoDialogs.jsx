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
} from 'lucide-react';
import { Dialog, Notice } from './Dialog.jsx';
import {
  projector,
  landscapeFrame,
  goodFrame,
  moveLinkedCorner,
  straightenFrame,
} from '../core/recognition.js';

export function AlignDialog({ photo, corners, onClose, onRead }) {
  const [frame, setFrame] = useState(corners);
  const drag = useRef(null),
    svg = useRef(null),
    w = 1000,
    h = (w * photo.height) / photo.width;
  const names = ['Top left', 'Top right', 'Bottom right', 'Bottom left'];
  const valid = goodFrame(frame);
  const project = valid ? projector(landscapeFrame(frame, photo.width, photo.height)) : null;
  const point = ([x, y]) => `${x * w},${y * h}`;
  // Use displacement from the grab point, not the finger's absolute position:
  // grabbing the outside of a handle should not snap the grid underneath it.
  function imagePoint(e) {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(
      svg.current.getScreenCTM().inverse(),
    );
    return [p.x / w, p.y / h];
  }
  function startDrag(e, corner) {
    if (drag.current || e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, start: imagePoint(e), frame, corner };
  }
  function handleMove(e) {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    const [x, y] = imagePoint(e);
    setFrame(moveLinkedCorner(d.frame, d.corner, x - d.start[0], y - d.start[1]));
  }
  function endDrag(e) {
    if (e.pointerId === drag.current?.id) drag.current = null;
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
      description="Drag a corner sideways to move the whole left or right edge, or up and down to move the top or bottom edge. The opposite corner stays put."
      onClose={onClose}
    >
      <div className="align-surface">
        <svg
          ref={svg}
          viewBox={`0 0 ${w} ${h}`}
          className="align-image"
          onPointerMove={handleMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
          aria-label="Adjustable photo frame"
        >
          <image href={photo.url} width={w} height={h} />
          <path d={path} fill="rgba(21,20,34,.46)" fillRule="evenodd" />
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
            points={frame.map(point).join(' ')}
            fill="none"
            stroke={valid ? '#e1d6ff' : '#ffb6a3'}
            strokeWidth="4"
          />
          {frame.map(([x, y], i) => (
            <g
              key={i}
              className="corner-handle"
              transform={`translate(${x * w} ${y * h})`}
              tabIndex="0"
              role="button"
              aria-label={`${names[i]} handle. Drag or use arrow keys.`}
              onKeyDown={(e) => {
                const dx = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0,
                  dy = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
                if (dx || dy) {
                  e.preventDefault();
                  const step = e.shiftKey ? 0.01 : 0.002;
                  setFrame((prev) => moveLinkedCorner(prev, i, dx * step, dy * step));
                }
              }}
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
        <span>Edges are linked. Keep the puzzle rim outside the grid.</span>
        {tilted && (
          <button className="text-btn" onClick={() => setFrame(straightenFrame)}>
            Straighten edges
          </button>
        )}
      </div>
      {!valid && <Notice error>Enlarge the frame to read the grid.</Notice>}
      <div className="dialog-actions">
        <button className="text-btn" disabled={frame === corners} onClick={() => setFrame(corners)}>
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
