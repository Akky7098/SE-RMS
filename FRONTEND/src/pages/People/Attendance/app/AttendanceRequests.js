import React, { useEffect, useState } from "react";
import { getAttendance, approveAttendanceRegularization, rejectAttendanceRegularization, getMyRegularizations, getPendingRegularizations } from "../../../../services/attendanceService";
import Sheet from "../../../Recruitment/Interviews/app/InterviewSheet";
import { formatDate, formatTime } from "../utils/attendanceHelpers";
import { messageOf } from "./attendanceAppData";

export default function AttendanceRequests({ canApprove }) {
  const [review, setReview] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [page, setPage] = useState(1);
  const [decision, setDecision] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const [identity, setIdentity] = useState({ loading: false, name: "" });
  useEffect(() => {
    if (!decision) return undefined;
    let active = true;
    setIdentity({ loading: true, name: "" });
    const item = decision.item;
    getAttendance({ employeeId: item.employeeId?._id || item.employeeId, from: item.businessDate, to: item.businessDate, limit: 1 })
      .then(result => {
        const record = (result.items || result.records || []).find(row => String(row.employeeId?._id || row.employeeId) === String(item.employeeId?._id || item.employeeId));
        if (active) setIdentity({ loading: false, name: record?.employeeName || "" });
      })
      .catch(() => active && setIdentity({ loading: false, name: "" }));
    return () => { active = false; };
  }, [decision]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    (review && canApprove ? getPendingRegularizations() : getMyRegularizations())
      .then(rows => { if (active) { setItems(rows); setPage(1); } })
      .catch(failure => active && setError(messageOf(failure)))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [review, canApprove, version]);
  const decide = async event => {
    event.preventDefault();
    if (!identity.name) return;
    if (!decision.approve && !remarks.trim()) { setError("Enter a reason for rejection."); return; }
    setBusy(true);
    setError("");
    try {
      await (decision.approve ? approveAttendanceRegularization : rejectAttendanceRegularization)(decision.item._id, remarks.trim());
      setDecision(null);
      setVersion(value => value + 1);
    } catch (failure) { setError(messageOf(failure)); }
    finally { setBusy(false); }
  };
  return (
    <section>
      <div className="se-ata-toolbar">
        <div className="se-ata-tabs">
          <button type="button" aria-pressed={!review} onClick={() => setReview(false)}>My requests</button>
          {canApprove && <button type="button" aria-pressed={review} onClick={() => setReview(true)}>To approve</button>}
        </div>
        <button type="button" onClick={() => setVersion(value => value + 1)}>↻ Refresh</button>
      </div>
      {error && !decision && <p role="alert" className="se-ata-error">{error}</p>}
      {loading ? <p role="status">Loading requests…</p> : (
        <>
          {items.length >= 100 && <p className="se-ata-note">Showing the latest 100 requests. Refresh after reviewing to load more pending requests.</p>}
          {!items.length && !error && <div className="se-ata-empty">{review ? "No pending corrections" : "No correction requests"}</div>}
          {items.slice((page - 1) * 50, page * 50).map(item => (
            <article key={item._id} className="se-ata-panel">
              <header className="se-ata-heading"><h3>{item.employeeName || formatDate(item.businessDate)}</h3><span className="se-ata-status warn">{item.status || "Pending"}</span></header>
              {item.employeeName && <p>{formatDate(item.businessDate)}</p>}
              <p>{String(item.type || "Correction").replaceAll("_", " ")}</p>
              <p>{item.reason}</p>
              <dl className="se-ata-detail">
                <div><dt>Check in</dt><dd>{formatTime(item.original?.firstInAt)} → {formatTime(item.requested?.firstInAt)}</dd></div>
                <div><dt>Check out</dt><dd>{formatTime(item.original?.lastOutAt)} → {formatTime(item.requested?.lastOutAt)}</dd></div>
              </dl>
              {review && canApprove && <div className="se-ata-actions">
                <button type="button" className="se-ata-outline" onClick={() => { setError(""); setRemarks(""); setIdentity({ loading: true, name: "" }); setDecision({ item, approve: false }); }}>Reject</button>
                <button type="button" className="se-ata-primary" onClick={() => { setError(""); setRemarks(""); setIdentity({ loading: true, name: "" }); setDecision({ item, approve: true }); }}>Review & approve</button>
              </div>}
            </article>
          ))}
          {items.length > 50 && <div className="se-ata-pagination"><button disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><span>{page} / {Math.ceil(items.length / 50)}</span><button disabled={page * 50 >= items.length} onClick={() => setPage(page + 1)}>Next</button></div>}
        </>
      )}
      {decision && <Sheet title={decision.approve ? "Approve correction?" : "Reject correction?"} busy={busy} onClose={() => setDecision(null)}>
        <form className="se-ata-form" onSubmit={decide}>
          <div className="se-iva-sheet-body">
            <h3>{identity.loading ? "Loading employee…" : identity.name || "Employee could not be verified. Close and try again."}</h3>
            <p>{formatDate(decision.item.businessDate)} · {decision.item.reason}</p>
            <dl className="se-ata-detail">
              <div><dt>Check in: current → requested</dt><dd>{formatTime(decision.item.original?.firstInAt)} → {formatTime(decision.item.requested?.firstInAt)}</dd></div>
              <div><dt>Check out: current → requested</dt><dd>{formatTime(decision.item.original?.lastOutAt)} → {formatTime(decision.item.requested?.lastOutAt)}</dd></div>
            </dl>
            {error && <p role="alert" className="se-ata-error">{error}</p>}
            <label>{decision.approve ? "Remarks · optional" : "Reason for rejection"}<textarea maxLength={2000} required={!decision.approve} value={remarks} onChange={event => setRemarks(event.target.value)} rows={3} /></label>
          </div>
          <footer><button type="button" className="se-iva-secondary" disabled={busy} onClick={() => setDecision(null)}>Cancel</button><button type="submit" className="se-iva-primary" disabled={busy || !identity.name}>{busy ? "Saving…" : decision.approve ? "Confirm approval" : "Confirm rejection"}</button></footer>
        </form>
      </Sheet>}
    </section>
  );
}
