import React, { useEffect, useState } from "react";
import { approveLeave, cancelLeave, getLeaveErrorMessage, getLeaveRequest, rejectLeave } from "../../../../services/leaveService";
import { canCancelLeave, formatDateTime, formatDays, formatLeaveDate, getEmployeeName, getLeaveTypeName } from "../utils/leaveHelpers";
import { durationLabel, idOf, statuses, tone } from "./leaveAppData";
import LeaveDialog from "./LeaveDialog";

export default function LeaveRequestApp({ requestId, employeeId, access, ownIds, onClose, onSaved }) {
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [action, setAction] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setRequest(null);
    setError("");
    getLeaveRequest(requestId).then(result => {
      if (active) {
        if (!result?._id) throw new Error("Leave request was not found.");
        setRequest(result);
      }
    }).catch(failure => active && setError(getLeaveErrorMessage(failure)))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [requestId, version]);
  const own = request && ((Boolean(idOf(employeeId)) && idOf(request.employeeId) === idOf(employeeId)) || ownIds.includes(idOf(request)));
  const canReview = request?.status === "PENDING_APPROVAL" && access.approve && (access.admin || (Boolean(idOf(employeeId)) && idOf(request.currentApproverEmployeeId) === idOf(employeeId)));
  const decide = async event => {
    event.preventDefault();
    if (action !== "approve" && !comment.trim()) { setError("Enter a reason before continuing."); return; }
    setBusy(true);
    setError("");
    try {
      const operation = { approve: approveLeave, reject: rejectLeave, cancel: cancelLeave }[action];
      const result = await operation(request._id, comment.trim());
      const message = action === "cancel" ? result?.status === "CANCEL_REQUESTED" ? "Cancellation request sent for approval." : "Leave request cancelled." : action === "approve" ? "Leave approved." : "Leave rejected.";
      onSaved(message);
    } catch (failure) { setError(getLeaveErrorMessage(failure)); }
    finally { setBusy(false); }
  };
  return (
    <LeaveDialog title={action ? action === "approve" ? "Approve this leave?" : action === "reject" ? "Reject this leave?" : "Cancel this leave?" : "Leave details"} busy={busy} onClose={onClose}>
      {loading ? <div className="se-lva-dialog-body" role="status">Loading leave details…</div> : error && !request ? <div className="se-lva-dialog-body"><p role="alert" className="se-lva-error">{error}</p><button type="button" className="se-lva-secondary" onClick={() => setVersion(value => value + 1)}>Retry</button></div> : request && (
        <form className="se-lva-form" onSubmit={decide}>
          <div className="se-lva-dialog-body">
            {error && <p role="alert" className="se-lva-error">{error}</p>}
            <div className="se-lva-detail-head"><h3>{getEmployeeName(request)}</h3><span className={`se-lva-status ${tone(request.status)}`}>{statuses[request.status] || request.status}</span></div>
            <p className="se-lva-muted">{request.requestNumber} · {request.employeeId?.employeeCode}</p>
            <div className="se-lva-review"><h3>{getLeaveTypeName(request)}</h3><strong>{formatDays(request.totalDays)} {Number(request.totalDays) === 1 ? "day" : "days"}</strong><p>{formatLeaveDate(request.fromDate)} → {formatLeaveDate(request.toDate)}</p><span>{durationLabel(request.durationType)}</span></div>
            <h3>Reason</h3><p>{request.reason || "—"}</p>
            {request.emergency && <p className="se-lva-note"><strong>Emergency:</strong> {request.emergencyReason || "Yes"}</p>}
            {!action ? (
              <>
                <dl className="se-lva-facts">
                  <div><dt>Approver</dt><dd>{request.currentApproverEmployeeId?.fullName || request.approverSnapshot?.name || "Not assigned"}</dd></div>
                  <div><dt>Applied on</dt><dd>{formatDateTime(request.appliedAt)}</dd></div>
                  {request.contactDuringLeave && <div><dt>Contact</dt><dd>{request.contactDuringLeave}</dd></div>}
                  {request.rejectionReason && <div><dt>Rejection reason</dt><dd>{request.rejectionReason}</dd></div>}
                  {request.cancellationReason && <div><dt>Cancellation reason</dt><dd>{request.cancellationReason}</dd></div>}
                </dl>
                {request.attachments?.length > 0 && <section><h3>Documents</h3>{request.attachments.map((file, index) => /^https?:\/\//i.test(file.fileUrl || "") ? <a key={index} href={file.fileUrl} target="_blank" rel="noreferrer" className="se-lva-document">{file.fileName || "Open document"} ↗</a> : <p key={index}>{file.fileName || "Document"}</p>)}</section>}
                {request.approvals?.length > 0 && <details className="se-lva-history"><summary>Request history</summary>{request.approvals.map((entry, index) => <article key={entry._id || index}><strong>{String(entry.action || "Updated").replaceAll("_", " ")}</strong><p>{entry.approverName} · {formatDateTime(entry.actedAt)}</p>{entry.comment && <p>{entry.comment}</p>}</article>)}</details>}
              </>
            ) : (
              <>
                {action === "cancel" && request.status === "APPROVED" && <p className="se-lva-note">Your approved leave stays active until its cancellation is approved.</p>}
                <label>{action === "approve" ? "Comment · optional" : "Reason"}<textarea disabled={busy} required={action !== "approve"} maxLength={2000} rows={3} value={comment} onChange={event => setComment(event.target.value)} /></label>
              </>
            )}
          </div>
          <footer>
            {action ? <><button type="button" disabled={busy} className="se-lva-secondary" onClick={() => { setAction(""); setError(""); }}>Go back</button><button type="submit" disabled={busy} className={action === "approve" ? "se-lva-primary" : "se-lva-danger"}>{busy ? "Saving…" : action === "approve" ? "Confirm approval" : action === "reject" ? "Confirm rejection" : "Confirm cancellation"}</button></> : <>
              {own && canCancelLeave(request) && <button type="button" className="se-lva-secondary" onClick={() => setAction("cancel")}>Cancel leave</button>}
              {canReview && <><button type="button" className="se-lva-secondary" onClick={() => setAction("reject")}>Reject</button><button type="button" className="se-lva-primary" onClick={() => setAction("approve")}>Approve leave</button></>}
              {!canReview && !(own && canCancelLeave(request)) && <button type="button" className="se-lva-secondary" onClick={onClose}>Close</button>}
            </>}
          </footer>
        </form>
      )}
    </LeaveDialog>
  );
}
