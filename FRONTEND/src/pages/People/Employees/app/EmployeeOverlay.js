import React, { useEffect, useRef } from "react";

export default function EmployeeOverlay({ title, onClose, busy = false, children }) {
  const dialog = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return (
    <section className="se-ema-overlay" ref={dialog} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}
      onKeyDown={event => {
        if (event.key === "Escape" && !busy) onClose();
        if (event.key !== "Tab") return;
        const controls = [...dialog.current.querySelectorAll("button, a[href], input, select, textarea, summary")]
          .filter(control => !control.disabled && !control.hidden && control.getClientRects().length);
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
          event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first?.focus();
        }
      }}>
      <header className="se-ema-overlay-head">
        <button type="button" aria-label="Back to employees" onClick={onClose} disabled={busy}>← Back</button>
        <h1>{title}</h1>
      </header>
      {children}
    </section>
  );
}
