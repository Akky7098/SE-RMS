import React, { useEffect, useRef, useState } from "react";
import { assignHrToRequirement, getAvailableHrEmployees } from "../../../../services/manpowerService";
import { getApiErrorMessage } from "../../utils/recruitmentHelpers";
import { recordId } from "../../Manpower/app/manpowerAppHelpers";
export default function HiringOwnerApp({
  requirement,
  onCancel,
  onAssigned
}) {
  const [members, setMembers] = useState([]);
  const [selected, setSelected] = useState(recordId(requirement.assignedHr));
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const pending = useRef(false);
  const heading = useRef(null);
  useEffect(() => {
    heading.current?.focus();
    let active = true;
    setLoading(true);
    setError("");
    getAvailableHrEmployees().then(result => {
      if (active) setMembers(Array.isArray(result) ? result : []);
    }).catch(failure => {
      if (active) setError(getApiErrorMessage(failure, "HR team could not load."));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [retry]);
  const assign = async event => {
    event.preventDefault();
    if (pending.current || !selected || selected === recordId(requirement.assignedHr)) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const updated = await assignHrToRequirement(recordId(requirement), selected);
      onAssigned(updated);
    } catch (failure) {
      setError(getApiErrorMessage(failure, "HR owner could not be assigned."));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const visible = members.filter(member => {
    const person = member.user || member;
    return [person.displayName, person.name, person.email, member.departmentRole].join(" ").toLowerCase().includes(search.trim().toLowerCase());
  });
  return <form
    className="se-hqa-panel"
    onSubmit={assign}
  >
    <button
      type="button"
      className="se-hqa-text"
      onClick={onCancel}
      disabled={busy}
    >
      ← Back to queue
    </button>
    <span className="se-hqa-eyebrow">
      HIRING OWNER
    </span>
    <h2
      ref={heading}
      tabIndex={-1}
    >
      Choose your HR owner
    </h2>
    <p>
      {requirement.positionTitle}
      · 
      {requirement.requestNumber}
    </p>
    <label className="se-hqa-search">
      <span>
        Find an HR colleague
      </span>
      <input
        type="search"
        value={search}
        onChange={event => setSearch(event.target.value)}
        placeholder="Name or email"
        disabled={busy}
      />
    </label>
    {error && <div
      className="se-hqa-error"
      role="alert"
    >
      {error}
      <button
        type="button"
        onClick={() => setRetry(retry + 1)}
        disabled={busy}
      >
        Retry team list
      </button>
    </div>}
    {loading ? <p role="status">
      Loading HR team…
    </p> : <fieldset
      className="se-hqa-members"
      disabled={busy}
    >
      <legend>
        Select HR owner
      </legend>
      {visible.map(member => {
      const person = member.user || member;
      const id = recordId(person);
        return <label
        key={id}
        className={selected === id ? "is-selected" : ""}
      >
        <span className="se-hqa-avatar">
          {(person.displayName || person.name || "H").charAt(0)}
        </span>
        <span className="se-hqa-member-copy">
          <strong>
            {person.displayName || person.name || "HR employee"}
          </strong>
          <small>
            {person.email || "HR team"}
          </small>
        </span>
        <input
          type="radio"
          name="hr-owner"
          value={id}
          checked={selected === id}
          onChange={() => setSelected(id)}
        />
      </label>;
      })}
      {!visible.length && <p className="se-hqa-empty">
        {search ? "No colleagues match your search." : "No HR employees are available."}
      </p>}
    </fieldset>}
    <div className="se-hqa-actions">
      <button
        type="button"
        className="se-hqa-secondary"
        onClick={onCancel}
        disabled={busy}
      >
        Cancel
      </button>
      <button
        type="submit"
        className="se-hqa-primary"
        disabled={busy || loading || !selected || selected === recordId(requirement.assignedHr)}
      >
        {busy ? "Assigning…" : "Assign owner"}
      </button>
    </div>
  </form>;
}
