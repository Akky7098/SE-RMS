import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyHiring } from "../../../../services/manpowerService";
import { formatRecruitmentDate, getApiErrorMessage, getManpowerStatusMeta, getPriorityMeta } from "../../utils/recruitmentHelpers";
import { recordId } from "../../Manpower/app/manpowerAppHelpers";
import "./MyHiringApp.css";

const PAGE_SIZE = 50;
const normalize = (value) => String(value || "").trim().toUpperCase();
const matches = (item, filter) => {
  if (filter === "READY") return normalize(item.status) === "APPROVED";
  if (filter === "ACTIVE") return normalize(item.status) === "HIRING_IN_PROGRESS";
  if (filter === "URGENT") return normalize(item.priority) === "URGENT";
  return true;
};

export default function MyHiringApp({ search = "" }) {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const requestVersion = useRef(0);
  const listHeading = useRef(null);

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    setError("");
    try {
      const result = await getMyHiring();
      if (version === requestVersion.current) setRecords(Array.isArray(result) ? result : []);
    } catch (failure) {
      if (version === requestVersion.current) setError(getApiErrorMessage(failure, "Assigned roles could not load."));
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    return () => { requestVersion.current += 1; };
  }, [load]);

  useEffect(() => { setPage(1); }, [search, filter]);

  const keyword = search.trim().toLowerCase();
  const visible = records.filter((item) => matches(item, filter) && [
    item.requestNumber, item.positionTitle, item.department?.name, item.departmentName,
    ...(Array.isArray(item.requiredSkills) ? item.requiredSkills : []),
  ].filter(Boolean).join(" ").toLowerCase().includes(keyword));
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;

  useEffect(() => { setPage((value) => Math.min(value, totalPages)); }, [totalPages]);

  const changePage = (value) => {
    setPage(Math.max(1, Math.min(value, totalPages)));
    listHeading.current?.scrollIntoView?.({ block: "start" });
    listHeading.current?.focus({ preventScroll: true });
  };

  const filters = [
    ["ALL", "All roles"],
    ["READY", "Ready to start"],
    ["ACTIVE", "Hiring"],
    ["URGENT", "Urgent"],
  ];

  return (
    <section className="se-mha" aria-label="My assigned hiring roles">
      <header className="se-mha-hero">
        <span>MY HIRING</span>
        <h2>Your assigned roles.</h2>
        <button
          type="button"
          className="se-mha-candidates"
          onClick={() => navigate("/dashboard?app=recruitment&page=candidates")}
        >
          View candidates →
        </button>
        <div className="se-mha-metrics" aria-label="Filter assigned roles">
          {filters.map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              <strong>{loading ? "—" : records.filter((item) => matches(item, key)).length}</strong>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </header>

      <div className="se-mha-list-heading" ref={listHeading} tabIndex={-1}>
        <h2>{loading ? "Loading roles…" : `${visible.length} assigned role${visible.length === 1 ? "" : "s"}`}</h2>
        <button type="button" onClick={load} disabled={loading}>Refresh</button>
      </div>

      {error ? (
        <div className="se-mha-error" role="alert">
          {error}
          <button type="button" onClick={load}>Retry</button>
        </div>
      ) : loading ? (
        <p className="se-mha-empty" role="status">Loading your assigned roles…</p>
      ) : (
        <>
          <div className="se-mha-cards">
            {visible.slice(start, start + PAGE_SIZE).map((item) => {
              const status = normalize(item.status);
              const state = status === "APPROVED" ? "ready" : status === "HIRING_IN_PROGRESS" ? "active" : status === "FILLED" ? "filled" : "other";
              const statusLabel = state === "ready" ? "Ready to start" : state === "active" ? "Hiring in progress" : getManpowerStatusMeta(item.status).label;
              const skills = Array.isArray(item.requiredSkills) ? item.requiredSkills : [];
              const priority = getPriorityMeta(item.priority);
              return (
                <article key={recordId(item)} className="se-mha-card" data-state={state}>
                  <div className="se-mha-card-top">
                    <span>{item.requestNumber || "Request"}</span>
                    <span className="se-mha-priority" data-tone={priority.tone}>{priority.label}</span>
                  </div>
                  <h3>{item.positionTitle || "Untitled role"}</h3>
                  <p>{item.department?.name || item.departmentName || "Department not specified"}</p>
                  <div className="se-mha-facts">
                    <span><strong>{item.numberOfOpenings ?? 0}</strong>{Number(item.numberOfOpenings) === 1 ? "opening" : "openings"}</span>
                    <span>Due<strong>{formatRecruitmentDate(item.requiredByDate)}</strong></span>
                  </div>
                  {skills.length > 0 && (
                    <div className="se-mha-skills" aria-label="Required skills">
                      {skills.slice(0, 2).map((skill, index) => <span key={`${skill}-${index}`}>{skill}</span>)}
                      {skills.length > 2 && <span>+{skills.length - 2} more</span>}
                    </div>
                  )}
                  <footer className="se-mha-card-footer">
                    <span className="se-mha-status">{statusLabel}</span>
                    <button
                      type="button"
                      aria-label={`Open hiring for ${item.positionTitle || "role"}`}
                      onClick={() => navigate(`/dashboard?app=recruitment&page=hiring-workspace&id=${encodeURIComponent(recordId(item))}&from=my-hiring`)}
                    >
                      Open hiring →
                    </button>
                  </footer>
                </article>
              );
            })}
          </div>
          {!visible.length && (
            <div className="se-mha-empty">
              <h3>{records.length ? "No matching roles" : "No roles assigned yet"}</h3>
              <p>{records.length ? "Try another filter or search." : "Your assigned hiring roles will appear here."}</p>
            </div>
          )}
          {visible.length > 0 && (
            <nav className="se-mha-pagination" aria-label="My hiring pagination">
              <div><strong>{`${start + 1}–${Math.min(start + PAGE_SIZE, visible.length)} of ${visible.length}`}</strong><span>50 per page</span></div>
              <div className="se-mha-page-controls">
                <button type="button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => changePage(currentPage - 1)}>← Previous</button>
                <select aria-label="Go to assigned roles page" value={currentPage} onChange={(event) => changePage(Number(event.target.value))}>
                  {Array.from({ length: totalPages }, (_, index) => <option key={index + 1} value={index + 1}>{`Page ${index + 1} of ${totalPages}`}</option>)}
                </select>
                <button type="button" aria-label="Next page" disabled={currentPage === totalPages} onClick={() => changePage(currentPage + 1)}>Next →</button>
              </div>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
