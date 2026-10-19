import React, { useMemo } from "react";
import { calendarDays, dateOf, dayStatus, calendarTone } from "./attendanceAppData";

export default function AttendanceCalendar({ month, records, today, onMonth, onDay, loading = false, personal = false }) {
  const indexed = useMemo(() => new Map(records.map(record => [dateOf(record), record])), [records]);
  const summary = useMemo(() => {
    const values = records.filter(record => dateOf(record).startsWith(month));
    return [
      ["Present", values.filter(record => ["Present", "Checked in"].includes(dayStatus(record, dateOf(record), today))).length],
      ["On leave", values.filter(record => record.presenceStatus === "ON_LEAVE").length],
      ["Missing out", values.filter(record => dayStatus(record, dateOf(record), today) === "Missing checkout").length],
    ];
  }, [records, month, today]);
  const moveMonth = offset => {
    const [year, number] = month.split("-").map(Number);
    const date = new Date(Date.UTC(year, number - 1 + offset, 1));
    onMonth(date.toISOString().slice(0, 7));
  };
  return (
    <section className="se-ata-panel" aria-label="Monthly attendance">
      <header className="se-ata-heading">
        <h2>Attendance calendar</h2>
        <button type="button" onClick={() => onMonth(today.slice(0, 7))}>This month</button>
      </header>
      <div className="se-ata-month">
        <button type="button" aria-label="Previous month" onClick={() => moveMonth(-1)}>‹</button>
        <label><span className="se-ata-sr">Attendance month</span>
          <input type="month" value={month} required onChange={event => event.target.value && onMonth(event.target.value)} />
        </label>
        <button type="button" aria-label="Next month" onClick={() => moveMonth(1)}>›</button>
      </div>
      {loading ? <p role="status">Loading calendar…</p> : (
        <>
          <div className="se-ata-month-stats">{summary.map(([label, count]) => <div key={label}><strong>{count}</strong><span>{label}</span></div>)}</div>
          <div className="se-ata-calendar">
            {["M", "T", "W", "T", "F", "S", "S"].map((label, index) => <span key={`day-${index}`} className="se-ata-weekday">{label}</span>)}
            {calendarDays(month).map((date, index) => {
              if (!date) return <span key={`blank-${index}`} />;
              const record = indexed.get(date);
              const recordedStatus = dayStatus(record, date, today);
              const missing = ["No record", "Not marked", "Upcoming"].includes(recordedStatus);
              const sunday = new Date(`${date}T00:00:00Z`).getUTCDay() === 0;
              const status = personal && missing
                ? sunday ? "Sunday" : date <= today ? "No attendance" : recordedStatus
                : recordedStatus;
              const tone = personal && (status === "Sunday" || status === "Week off")
                ? "personal-off"
                : status === "No attendance" ? "absent" : calendarTone(status);
              return (
                <button key={date} type="button" className={`se-ata-day ${tone} ${date === today ? "today" : ""}`}
                  aria-label={`${date}: ${status}`} onClick={() => onDay({ date, record })}>
                  <strong>{Number(date.slice(-2))}</strong>
                  <span aria-hidden="true">{status === "Upcoming" ? "—" : status === "No record" || status === "Not marked" ? "·" : status === "Present" ? "✓" : status === "Checked in" ? "●" : status === "Missing checkout" ? "!" : status.slice(0, 1)}</span>
                </button>
              );
            })}
          </div>
          <div className="se-ata-legend">
            {[["present", "Present"], ["absent", personal ? "Absent / No attendance" : "Absent"], ["leave", "Leave"],
              ["half", "Half day"], [personal ? "personal-off" : "off", "Sunday / Week off"],
              ["holiday", "Holiday"], ["missing", "No checkout"],
              ["unknown", "No record / Upcoming"]].map(([tone, label]) => (
              <span key={tone}><i className={`se-ata-key ${tone}`} aria-hidden="true" />{label}</span>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
