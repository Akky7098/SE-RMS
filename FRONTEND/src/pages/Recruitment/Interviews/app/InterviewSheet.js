import React, { useEffect, useRef } from "react";

export default function InterviewSheet({ title, children, onClose, busy = false }) {
  const dialog = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  const handleKey = event => {
    if (event.key === "Escape" && !busy) onClose();
    if (event.key !== "Tab") return;
    const controls = [...dialog.current.querySelectorAll("button, input, select, textarea, a[href]")]
      .filter(control => !control.disabled && !control.hidden);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  return (
    <div className="se-iva-sheet-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget && !busy) onClose();
    }}>
      <section className="se-iva-sheet" ref={dialog} tabIndex={-1} role="dialog"
        aria-modal="true" aria-labelledby="interview-sheet-title" onKeyDown={handleKey}>
        <header>
          <h2 id="interview-sheet-title">{title}</h2>
          <button type="button" aria-label="Close panel" disabled={busy} onClick={onClose}>×</button>
        </header>
        {children}
      </section>
    </div>
  );
}
