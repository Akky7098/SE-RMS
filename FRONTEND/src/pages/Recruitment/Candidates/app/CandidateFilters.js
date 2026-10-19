import React, { useEffect, useRef, useState } from "react";
import { recordId } from "../../Manpower/app/manpowerAppHelpers";

export default function CandidateFilters({ statuses, requirements, status, role, onClose, onApply }) {
  const [draftStatus, setDraftStatus] = useState(status);
  const [draftRole, setDraftRole] = useState(role);
  const [search, setSearch] = useState("");
  const sheet = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sheet.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  const handleKey = event => {
    if (event.key === "Escape") onClose();
    if (event.key !== "Tab") return;
    const elements = [...sheet.current.querySelectorAll('button, input, [tabindex="0"]')]
      .filter(element => !element.disabled);
    const first = elements[0];
    const last = elements[elements.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === sheet.current)) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  return (
    <div className="se-caa-sheet-backdrop" onClick={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="se-caa-sheet" role="dialog" aria-modal="true"
        aria-labelledby="candidate-filter-title" tabIndex={-1} ref={sheet} onKeyDown={handleKey}>
        <header><h2 id="candidate-filter-title">Filter candidates</h2>
          <button type="button" aria-label="Close filters" onClick={onClose}>×</button>
        </header>
        <div className="se-caa-sheet-content">
          <fieldset><legend>Candidate status</legend>
            <div className="se-caa-filter-options">
              {statuses.map(([value, label]) => (
                <label key={value} className={draftStatus === value ? "selected" : ""}>
                  <input type="radio" name="candidate-status" value={value}
                    checked={draftStatus === value} onChange={() => setDraftStatus(value)} />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset><legend>Hiring role</legend>
            <input type="search" aria-label="Find filter role" placeholder="Search roles"
              value={search} onChange={event => setSearch(event.target.value)} />
            <div className="se-caa-filter-roles">
              <label><input type="radio" name="candidate-role" checked={!draftRole}
                onChange={() => setDraftRole("")} />All hiring roles</label>
              {requirements.filter(item => `${item.positionTitle} ${item.requestNumber}`
                .toLowerCase().includes(search.toLowerCase())).map(item => (
                <label key={recordId(item)}>
                  <input type="radio" name="candidate-role" checked={draftRole === recordId(item)}
                    onChange={() => setDraftRole(recordId(item))} />
                  <span>{item.positionTitle}<small>{item.requestNumber}</small></span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <footer>
          <button type="button" className="se-caa-secondary" onClick={() => {
            setDraftStatus("ALL"); setDraftRole(""); setSearch("");
          }}>Reset</button>
          <button type="button" className="se-caa-primary"
            onClick={() => onApply(draftStatus, draftRole)}>Show results</button>
        </footer>
      </section>
    </div>
  );
}
