import React, { useEffect, useRef, useState } from "react";
import { getManpowerRequirement, approveManpowerRequirement, rejectManpowerRequirement } from "../../../../services/manpowerService";
import { getApiErrorMessage, formatRecruitmentDate, getManpowerStatusMeta, getPriorityMeta } from "../../utils/recruitmentHelpers";
import { recordId } from "./manpowerAppHelpers";
export default function ManpowerAppDetail({
  id,
  approvalIds,
  userId,
  onChanged,
  onBack
}) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [action, setAction] = useState("");
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setRecord(null);
    setAction("");
    getManpowerRequirement(id).then(result => {
      if (active) setRecord(result);
    }).catch(failure => {
      if (active) setError(getApiErrorMessage(failure, "Request could not load."));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [id, retry]);
  const act = async event => {
    event.preventDefault();
    if (pending.current) return;
    if (action === "reject" && !remarks.trim()) {
      setError("Enter a rejection reason.");
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const result = action === "approve" ? await approveManpowerRequirement(id, {
        remarks: remarks.trim()
      }) : await rejectManpowerRequirement(id, {
        reason: remarks.trim()
      });
      setRecord(result);
      setAction("");
      setRemarks("");
      onChanged();
    } catch (failure) {
      setError(getApiErrorMessage(failure, "The action could not be completed."));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  if (loading) return <p
    className="se-mpa-state"
    role="status"
  >
    Loading request…
  </p>;
  if (!record) return <div
    className="se-mpa-error"
    role="alert"
  >
    {error || "Request unavailable."}
    <button
      type="button"
      onClick={() => setRetry(retry + 1)}
    >
      Retry
    </button>
  </div>;
  const status = getManpowerStatusMeta(record.status);
  const priority = getPriorityMeta(record.priority);
  const canApprove = record.status === "PENDING_APPROVAL" && approvalIds.has(id) && recordId(record.requestedBy) !== userId;
  const monthly = value => value == null ? "—" : new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0
  }).format(value / 12);
  return <article className="se-mpa-detail">
    <button
      type="button"
      className="se-mpa-text-button"
      onClick={onBack}
      disabled={busy}
    >
      ← All requests
    </button>
    {error && <p
      className="se-mpa-error"
      role="alert"
    >
      {error}
    </p>}
    <div className="se-mpa-detail-hero">
      <span>
        {record.requestNumber}
      </span>
      <h2>
        {record.positionTitle}
      </h2>
      <p>
        {record.department?.name || "Department not specified"}
      </p>
      <div className="se-mpa-badges">
        <span data-tone={status.tone}>
          {status.label}
        </span>
        <span data-tone={priority.tone}>
          {priority.label}
          priority
        </span>
      </div>
    </div>
    <section className="se-mpa-detail-section">
      <h3>
        Position details
      </h3>
      <dl>
        <div>
          <dt>
            Openings
          </dt>
          <dd>
            {record.numberOfOpenings}
          </dd>
        </div>
        <div>
          <dt>
            Required by
          </dt>
          <dd>
            {formatRecruitmentDate(record.requiredByDate)}
          </dd>
        </div>
        <div>
          <dt>
            Location
          </dt>
          <dd>
            {record.location || "—"}
          </dd>
        </div>
        <div>
          <dt>
            Employment
          </dt>
          <dd>
            {String(record.employmentType || "—").replaceAll("_", " ")}
          </dd>
        </div>
        <div>
          <dt>
            Experience
          </dt>
          <dd>
            {record.minimumExperienceYears ?? 0}
            – 
            {record.maximumExperienceYears ?? "Not specified"}
            years
          </dd>
        </div>
        <div>
          <dt>
            Monthly salary
          </dt>
          <dd>
            {monthly(record.budgetMin)}
            – 
            {monthly(record.budgetMax)}
            {record.currency || "INR"}
          </dd>
        </div>
      </dl>
      {record.requiredSkills?.length > 0 && <div className="se-mpa-skills">
        {record.requiredSkills.map(skill => <span key={skill}>
          {skill}
        </span>)}
      </div>}
    </section>
    <section className="se-mpa-detail-section">
      <h3>
        Business reason
      </h3>
      <p>
        {record.reason || "—"}
      </p>
    </section>
    <section className="se-mpa-detail-section">
      <h3>
        People & approval
      </h3>
      <dl>
        <div>
          <dt>
            Requested by
          </dt>
          <dd>
            {record.requestedBy?.displayName || "—"}
          </dd>
        </div>
        <div>
          <dt>
            Approver
          </dt>
          <dd>
            {record.currentApprover?.displayName || record.approvedBy?.displayName || "—"}
          </dd>
        </div>
        <div>
          <dt>
            Hiring owner
          </dt>
          <dd>
            {record.assignedHr?.displayName || "Not assigned"}
          </dd>
        </div>
      </dl>
      {record.rejectionReason && <p className="se-mpa-error">
        {record.rejectionReason}
      </p>}
    </section>
    {canApprove && !action && <div className="se-mpa-form-actions">
      <button
        type="button"
        className="se-mpa-secondary"
        onClick={() => {
        setAction("reject");
        setRemarks("");
        }}
      >
        Reject
      </button>
      <button
        type="button"
        className="se-mpa-primary"
        onClick={() => {
        setAction("approve");
        setRemarks("");
        }}
      >
        Approve
      </button>
    </div>}
    {canApprove && action && <form
      className="se-mpa-detail-section"
      onSubmit={act}
    >
      <h3>
        {action === "approve" ? "Approve this request?" : "Reject this request?"}
      </h3>
      <label className="se-mpa-field">
        <span>
          {action === "approve" ? "Remarks (optional)" : "Rejection reason *"}
        </span>
        <textarea
          value={remarks}
          onChange={event => setRemarks(event.target.value)}
          required={action === "reject"}
          disabled={busy}
          rows={3}
        />
      </label>
      <div className="se-mpa-form-actions">
        <button
          type="button"
          className="se-mpa-secondary"
          onClick={() => setAction("")}
          disabled={busy}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="se-mpa-primary"
          disabled={busy}
        >
          {busy ? "Saving…" : `Confirm ${action === "approve" ? "approval" : "rejection"}`}
        </button>
      </div>
    </form>}
  </article>;
}
