import React, { useState } from "react";
import api from "../../../../services/api";
import { formatTime } from "../utils/attendanceHelpers";
import { messageOf } from "./attendanceAppData";

// Attendance's current server route is /location/:employeeId. Keep the mobile
// adapter local so the existing desktop service remains unchanged.
export default function AttendanceLocations({ record }) {
  const [state, setState] = useState({ loading: false, loaded: false, error: "", points: [] });
  const load = async () => {
    setState({ loading: true, loaded: false, error: "", points: [] });
    try {
      const response = await api.get(`/attendance/location/${record.employeeId?._id || record.employeeId}`, { params: { businessDate: record.businessDate, limit: 500 } });
      const payload = response?.data?.data || response?.data || {};
      setState({ loading: false, loaded: true, error: "", points: Array.isArray(payload) ? payload : payload.items || payload.history || [] });
    } catch (failure) { setState({ loading: false, loaded: false, error: messageOf(failure), points: [] }); }
  };
  return (
    <section className="se-ata-location">
      <button type="button" className="se-ata-outline" disabled={state.loading} onClick={load}>{state.loading ? "Loading locations…" : state.loaded ? "↻ Refresh locations" : "View recorded locations"}</button>
      {state.error && <p role="alert" className="se-ata-error">{state.error}</p>}
      {state.loaded && !state.points.length && <p>No recorded locations for this date.</p>}
      {state.points.length >= 500 && <p>Showing the latest 500 location points.</p>}
      {state.points.map((point, index) => {
        const lat = point.latitude;
        const lng = point.longitude;
        const valid = lat !== null && lat !== undefined && lng !== null && lng !== undefined && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && Math.abs(Number(lat)) <= 90 && Math.abs(Number(lng)) <= 180;
        return <div key={point._id || index} className="se-ata-location-point"><span><strong>{formatTime(point.capturedAt)}</strong><small>{String(point.source || "Location").replaceAll("_", " ")}</small><p>{point.locationAddress || point.address || "Street address unavailable"}</p>{valid && <small>{Number(lat).toFixed(6)}, {Number(lng).toFixed(6)}{point.accuracyMeters != null ? ` · Accuracy ±${Math.round(point.accuracyMeters)} m` : ""}</small>}</span>{valid && <a href={`https://www.google.com/maps?q=${Number(lat)},${Number(lng)}`} target="_blank" rel="noreferrer">Open map ↗</a>}</div>;
      })}
    </section>
  );
}
