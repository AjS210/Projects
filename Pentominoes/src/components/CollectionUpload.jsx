import React, { useRef, useState } from 'react';
import { ArrowUpRight, Images, UploadCloud } from 'lucide-react';
import { PHOTO_TYPES } from '../core/photo.js';

// One ordinary image picker (no capture attribute): mobile browsers may offer
// both camera and files. Every source, including a dropped file, goes to review.
export function CollectionUpload({ photo, onUpload, onReview }) {
  const file = useRef(null),
    depth = useRef(0);
  const [dragging, setDragging] = useState(false);
  return (
    <section
      className={`panel upload-panel ${dragging ? 'is-dragging' : ''}`}
      aria-labelledby="upload-title"
      onDragEnter={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          depth.current++;
          setDragging(true);
        }
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }
      }}
      onDragLeave={() => {
        if (depth.current > 0 && --depth.current === 0) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        depth.current = 0;
        setDragging(false);
        if (e.dataTransfer.files[0]) onUpload(e.dataTransfer.files[0]);
      }}
    >
      <div className="panel-heading">
        <div className="section-title">
          <span className="heading-icon">
            <Images size={17} />
          </span>
          <h2 id="upload-title">Collection Upload</h2>
        </div>
      </div>
      <div className="upload-body">
        <p>
          Choose a photo of your puzzle or a screenshot of several boards. You’ll review it before
          saving.
        </p>
        <input
          hidden
          type="file"
          aria-label="Upload solution photo"
          ref={file}
          accept={PHOTO_TYPES}
          onChange={(e) => {
            const f = e.target.files[0];
            e.target.value = '';
            if (f) onUpload(f);
          }}
        />
        <button className="upload-zone" onClick={() => file.current?.click()}>
          <span className="upload-icon">
            <UploadCloud size={22} />
          </span>
          <span className="upload-copy">
            <strong>{dragging ? 'Drop your photo here' : 'Upload a photo or screenshot'}</strong>
            <span>
              <em>Choose an image</em> or drop it here
            </span>
          </span>
          <span className="filetypes">JPG, PNG, WEBP</span>
        </button>
        {photo && (
          <div className="last-upload">
            <span title={photo.name}>{photo.name}</span>
            <button className="text-btn" onClick={onReview}>
              Review last upload <ArrowUpRight size={14} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
