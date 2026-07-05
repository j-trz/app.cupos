import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function Tooltip({ children, label, placement = 'right' }) {
  const [visible, setVisible] = useState(false);
  const [styles, setStyles] = useState({ top: 0, left: 0, transform: '' });
  const wrapperRef = useRef(null);
  const idRef = useRef(`tooltip-${Math.random().toString(36).slice(2, 9)}`);

  useEffect(() => {
    if (!visible || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const gap = 8;
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
      // Center above the element on mobile
      const top = rect.top - gap;
      const left = rect.left + rect.width / 2;
      setStyles({ top: Math.round(top), left: Math.round(left), transform: 'translateX(-50%) translateY(-100%)' });
    } else {
      const top = rect.top + rect.height / 2;
      const left = placement === 'right' ? rect.right + gap : rect.left - gap;
      setStyles({ top: Math.round(top), left: Math.round(left), transform: 'translateY(-50%)' });
    }
  }, [visible, placement]);

  const handleShow = () => setVisible(true);
  const handleHide = () => setVisible(false);

  return (
    <span
      ref={wrapperRef}
      className="relative inline-flex"
      onMouseEnter={handleShow}
      onMouseLeave={handleHide}
      onFocus={handleShow}
      onBlur={handleHide}
      aria-describedby={visible ? idRef.current : undefined}
    >
      {children}
      {visible &&
        createPortal(
          <div
            id={idRef.current}
            role="tooltip"
            className="pointer-events-none z-50 transform-gpu animate-fade-in rounded-md bg-slate-900 px-3 py-1 text-xs text-white shadow-lg"
            style={{ position: 'fixed', top: styles.top, left: styles.left, transform: styles.transform }}
          >
            {label}
          </div>,
          document.body,
        )}
    </span>
  );
}

