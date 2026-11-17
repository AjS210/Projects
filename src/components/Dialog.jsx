import React, { useEffect, useId, useRef } from 'react';
import { X, AlertCircle } from 'lucide-react';

export function Dialog({
  title,
  eyebrow,
  description,
  children,
  onClose,
  wide = false,
  className = '',
}) {
  const ref = useRef(null),
    titleId = useId(),
    descriptionId = useId();
  useEffect(() => {
    const dialog = ref.current,
      prev = document.activeElement,
      overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      prev?.focus?.({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`dialog ${wide ? 'wide' : ''} ${className}`}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) {
          const r = ref.current.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="dialog-header">
        <div>
          {eyebrow && <div className="eyebrow dialog-eyebrow">{eyebrow}</div>}
          <h2 id={titleId}>{title}</h2>
        </div>
        <button className="icon-button close-dialog" onClick={onClose} aria-label="Close dialog">
          <X size={19} />
        </button>
      </div>
      {description && (
        <p className="dialog-desc" id={descriptionId}>
          {description}
        </p>
      )}
      {children}
    </dialog>
  );
}
export function Notice({ children, error = false }) {
  return (
    <div role={error ? 'alert' : 'status'} className={`notice ${error ? 'notice-error' : ''}`}>
      <AlertCircle size={16} />
      <span>{children}</span>
    </div>
  );
}
