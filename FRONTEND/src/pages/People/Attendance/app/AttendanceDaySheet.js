import React, { useEffect, useState } from "react";
import AttendanceLocations from "./AttendanceLocations";
import Sheet from "../../../Recruitment/Interviews/app/InterviewSheet";
import { attendanceSource, formatDate, formatMinutes, formatTime, todayKey, workModeLabel } from "../utils/attendanceHelpers";
import { checkInOf, checkOutOf, dayStatus, toneOf } from "./attendanceAppData";

export function AttendanceFacts({ record }) {
  const [now, setNow] = useState(Date.now);
  const active = record?.businessDate === todayKey() && checkInOf(record) && !checkOutOf(record);
  useEffect(() => {
    if (!active) return undefined;
    const interval = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(interval);
  }, [active]);
  const elapsed = Math.max(0, Math.floor((now - new Date(checkInOf(record)).getTime()) / 60000));
  return (
    <dl className="se-ata-facts">
      <div><dt>Check in</dt><dd>{formatTime(checkInOf(record))}</dd></div>
      <div><dt>Check out</dt><dd>{formatTime(checkOutOf(record))}</dd></div>
      <div><dt>{active ? "Since check-in" : "Working time"}</dt><dd>{active ? formatMinutes(elapsed) : checkOutOf(record) ? formatMinutes(record?.totalWorkingMinutes) : "—"}</dd></div>
      <div><dt>Work mode</dt><dd>{record ? workModeLabel(record.workMode) : "—"}</dd></div>
    </dl>
  );
}

export default function AttendanceDaySheet({ day, today, onClose, onCorrect, canViewLocation }) {
  const { record, date } = day;
  const status = dayStatus(record, date, today);
  const canCorrect = onCorrect && /^[a-f\d]{24}$/i.test(record?._id || "") && record?.regularization?.status !== "PENDING";
  return (
    <Sheet title={formatDate(date)} onClose={onClose}>
      <div className="se-iva-sheet-body">
        {record?.employeeName && <h3>{record.employeeName}</h3>}
        <span className={`se-ata-status ${toneOf(status)}`}>{status}</span>
        {record ? (
          <>
            <AttendanceFacts record={record} />
            <dl className="se-ata-detail">
              <div><dt>Recorded by</dt><dd>{attendanceSource(record) === "BIOMETRIC" ? "Biometric device" : attendanceSource(record)}</dd></div>
              <div><dt>Shift</dt><dd>{record.shiftName || record.shiftCode || "—"}</dd></div>
              <div><dt>Late by</dt><dd>{formatMinutes(record.lateMinutes)}</dd></div>
              <div><dt>Overtime</dt><dd>{formatMinutes(record.overtimeMinutes)}</dd></div>
              <div><dt>Correction</dt><dd>{record.regularization?.status || (record.wasRegularized ? "Approved" : "None")}</dd></div>
              {canViewLocation && <div><dt>Office / work location</dt><dd>{record.officeName || record.workLocation || "—"}</dd></div>}
              {record.dutyPurpose && <div><dt>Work purpose</dt><dd>{record.dutyPurpose}</dd></div>}
              {record.dutyLocation && <div><dt>Work location</dt><dd>{record.dutyLocation}</dd></div>}
            </dl>
            {canViewLocation && record.employeeId && ["WFH", "FIELD_VISIT", "ON_DUTY"].includes(record.workMode) && <AttendanceLocations record={record} />}
          </>
        ) : <p>{date > today ? "Attendance has not been recorded yet." : "No attendance record is available for this date."}</p>}
      </div>
      <footer>
        <button type="button" className="se-iva-secondary" onClick={onClose}>Close</button>
        {canCorrect && <button type="button" className="se-iva-primary" onClick={() => onCorrect(record)}>Request correction</button>}
      </footer>
    </Sheet>
  );
}
