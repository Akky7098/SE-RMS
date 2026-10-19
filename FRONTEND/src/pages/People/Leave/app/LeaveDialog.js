import React, { useEffect, useRef } from "react";

export default function LeaveDialog({ title, full = false, busy = false, onClose, children, backLabel = "Back to leaves" }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return (
    <div className="se-lva-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget && !busy) onClose();
    }}>
      <section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}
        className={`se-lva-dialog ${full ? "is-full" : ""}`} onKeyDown={event => {
          if (event.key === "Escape" && !busy) onClose();
          if (event.key !== "Tab") return;
          const controls = [...ref.current.querySelectorAll("button, input, select, textarea, a[href], summary")].filter(control => !control.disabled && control.getClientRects().length);
          const first = controls[0], last = controls[controls.length - 1];
          if (event.shiftKey && [first, ref.current].includes(document.activeElement)) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }}>
        <header>
          <button type="button" disabled={busy} onClick={onClose} aria-label={backLabel}>← Back</button>
          <h2>{title}</h2>
        </header>
        {children}
      </section>
    </div>
  );
}
