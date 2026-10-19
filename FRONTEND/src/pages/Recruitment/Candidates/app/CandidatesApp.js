import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { buildCandidateDetailUrl, getApiErrorMessage, getCandidateStatusMeta } from "../../utils/recruitmentHelpers";
import { recordId } from "../../Manpower/app/manpowerAppHelpers";
import AddCandidateDrawer from "./AddCandidateApp";
import { candidateGroup, canAddForRequirement, loadCandidateAppData } from "./candidateAppData";
import "../CandidateEntry.css";
import "./CandidatesApp.css";
import CandidateFilters from "./CandidateFilters";
const PAGE_SIZE = 50;
const filters = [["ALL", "All statuses"], ["ACTIVE", "In process"], ["INTERVIEW", "Interview"], ["SELECTED", "Selected"], ["HOLD", "On hold"], ["REJECTED", "Rejected"]];
export default function CandidatesApp({
  search = ""
}) {
  const navigate = useNavigate();
  const [data, setData] = useState({
    candidates: [],
    requirements: [],
    partial: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [role, setRole] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pickingRole, setPickingRole] = useState(false);
  const [roleSearch, setRoleSearch] = useState("");
  const [selectedRequirement, setSelectedRequirement] = useState(null);
  const version = useRef(0);
  const heading = useRef(null);
  const load = useCallback(async () => {
    const current = ++version.current;
    setLoading(true);
    setError("");
    try {
      const result = await loadCandidateAppData();
      if (current === version.current) setData(result);
    } catch (failure) {
      if (current === version.current) setError(getApiErrorMessage(failure, "Candidates could not load."));
    } finally {
      if (current === version.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
    return () => {
      version.current += 1;
    };
  }, [load]);
  useEffect(() => {
    setPage(1);
  }, [search, filter, role]);
  const keyword = search.trim().toLowerCase();
  const visible = data.candidates.filter(candidate => {
    const requirement = candidate._requirement || candidate.manpowerRequirement || {};
    if (filter !== "ALL" && candidateGroup(candidate.status) !== filter) return false;
    if (role && recordId(requirement) !== role) return false;
    return [candidate.candidateNumber, candidate.fullName, candidate.mobile, candidate.phone, candidate.email, candidate.currentCompany, candidate.currentDesignation, candidate.status, requirement.positionTitle, requirement.requestNumber, requirement.department?.name].filter(Boolean).join(" ").toLowerCase().includes(keyword);
  });
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  useEffect(() => {
    setPage(value => Math.min(value, totalPages));
  }, [totalPages]);
  const changePage = value => {
    setPage(Math.max(1, Math.min(value, totalPages)));
    heading.current?.scrollIntoView?.({
      block: "start"
    });
    heading.current?.focus({
      preventScroll: true
    });
  };
  const eligibleRoles = data.requirements.filter(canAddForRequirement).filter(item => [item.positionTitle, item.requestNumber, item.department?.name].join(" ").toLowerCase().includes(roleSearch.trim().toLowerCase()));
  return <section
    className="se-caa"
    aria-label="Mobile candidates"
  >
    {pickingRole ? <section className="se-caa-role-picker">
      <button
        type="button"
        className="se-caa-secondary"
        onClick={() => setPickingRole(false)}
      >
        ← Back to candidates
      </button>
      <h2>
        Add a candidate
      </h2>
      <p>
        Choose the hiring role.
      </p>
      <label className="se-caa-picker-search">
        <span>
          Find a hiring role
        </span>
        <input
          type="search"
          value={roleSearch}
          onChange={event => setRoleSearch(event.target.value)}
          placeholder="Position or request number"
        />
      </label>
      {eligibleRoles.map(item => <button
        key={recordId(item)}
        type="button"
        className="se-caa-role-choice"
        onClick={() => {
        setSelectedRequirement(item);
        setPickingRole(false);
        }}
      >
        <strong>
          {item.positionTitle}
        </strong>
        <span>
          {item.requestNumber}
          · 
          {item.department?.name || "Department"}
        </span>
        <span className="se-caa-choice-action">
          Add to this role →
        </span>
      </button>)}
      {!eligibleRoles.length && <p className="se-caa-empty">
        {roleSearch ? "No matching roles." : "No approved hiring roles with an HR owner are available."}
      </p>}
    </section> : <>
      <header className="se-caa-toolbar">
        <button type="button" className="se-caa-primary" disabled={loading || Boolean(error)}
          onClick={() => { setPickingRole(true); setRoleSearch(""); }}>
          + Add candidate
        </button>
        <button type="button" className="se-caa-secondary" aria-label="Filter candidates"
          onClick={() => setFiltersOpen(true)}>
          Filters{filter !== "ALL" || role ? ` (${Number(filter !== "ALL") + Number(Boolean(role))})` : ""}
        </button>
        <button type="button" className="se-caa-refresh" aria-label="Refresh" onClick={load} disabled={loading}>↻</button>
      </header>
      {filtersOpen && <CandidateFilters statuses={filters} requirements={data.requirements}
        status={filter} role={role} onClose={() => setFiltersOpen(false)}
        onApply={(nextStatus, nextRole) => {
          setFilter(nextStatus);
          setRole(nextRole);
          setFiltersOpen(false);
        }} />}
      <div
        className="se-caa-list-heading"
        ref={heading}
        tabIndex={-1}
      >
        <h2>
          {loading ? "Loading candidates…" : `${visible.length} candidate${visible.length === 1 ? "" : "s"}`}
        </h2>
        {(filter !== "ALL" || role) && <button
          type="button"
          onClick={() => {
          setFilter("ALL");
          setRole("");
          }}
        >
          Clear filters
        </button>}
      </div>
      {data.partial && !loading && !error && <p
        className="se-caa-warning"
        role="status"
      >
        Some hiring roles could not load. Refresh to retry.
      </p>}
      {error ? <div
        className="se-caa-error"
        role="alert"
      >
        {error}
        <button
          type="button"
          onClick={load}
        >
          Retry
        </button>
      </div> : loading ? <p
        className="se-caa-empty"
        role="status"
      >
        Loading candidate records…
      </p> : <>
        <div className="se-caa-cards">
          {visible.slice(start, start + PAGE_SIZE).map(candidate => {
          const requirement = candidate._requirement || candidate.manpowerRequirement || {};
          const status = getCandidateStatusMeta(candidate.status);
          const phone = String(candidate.mobile || candidate.phone || "");
          const callNumber = phone.replace(/[^\d+]/g, "");
          const group = candidateGroup(candidate.status);
            return <article
            key={recordId(candidate)}
            className="se-caa-card"
            data-group={group}
          >
            <button type="button" className="se-caa-card-main"
              aria-label={`View ${candidate.fullName || "candidate"}`}
              onClick={() => navigate(buildCandidateDetailUrl(recordId(candidate)))}>
              <span className="se-caa-person">
                <span className="se-caa-avatar">{(candidate.fullName || "C").charAt(0)}</span>
                <span className="se-caa-identity">
                  <strong>{candidate.fullName || "Candidate"}</strong>
                  <span>{requirement.positionTitle || candidate.positionTitle || "Position"}</span>
                </span>
                <span className="se-caa-chevron" aria-hidden="true">›</span>
              </span>
              <span className="se-caa-card-meta">
                <span className="se-caa-status">{status.label}</span>
                <span>{candidate.totalExperienceYears ?? "—"} yrs experience</span>
              </span>
            </button>
            <footer className="se-caa-card-actions">
              <span className="se-caa-number">{candidate.candidateNumber || "Candidate"}</span>
              {callNumber && <a className="se-caa-call" href={`tel:${callNumber}`}
                aria-label={`Call ${candidate.fullName || "candidate"}`}>☎ Call</a>}
              <button type="button" className="se-caa-open"
                onClick={() => navigate(buildCandidateDetailUrl(recordId(candidate)))}
                aria-label={`Open details for ${candidate.fullName || "candidate"}`}>Details ›</button>
            </footer>
          </article>;
          })}
        </div>
        {!visible.length && <div className="se-caa-empty">
          <h3>
            No candidates found
          </h3>
          <p>
            {search || role || filter !== "ALL" ? "Try another search or filter." : "Add a candidate to an eligible hiring role."}
          </p>
        </div>}
        {visible.length > 0 && <nav
          className="se-caa-pagination"
          aria-label="Candidate pagination"
        >
          <div>
            <strong>
              {`${start + 1}–${Math.min(start + PAGE_SIZE, visible.length)} of ${visible.length}`}
            </strong>
            <span>
              50 per page
            </span>
          </div>
          <div className="se-caa-page-controls">
            <button
              type="button"
              aria-label="Previous page"
              disabled={currentPage === 1}
              onClick={() => changePage(currentPage - 1)}
            >
              ← Previous
            </button>
            <select
              aria-label="Go to candidate page"
              value={currentPage}
              onChange={event => changePage(Number(event.target.value))}
            >
              {Array.from({
              length: totalPages
              }, (_, index) => <option
                key={index + 1}
                value={index + 1}
              >
                {`Page ${index + 1} of ${totalPages}`}
              </option>)}
            </select>
            <button
              type="button"
              aria-label="Next page"
              disabled={currentPage === totalPages}
              onClick={() => changePage(currentPage + 1)}
            >
              Next →
            </button>
          </div>
        </nav>}
      </>}
    </>}
    <div className="se-caa-entry">
      <AddCandidateDrawer
        open={Boolean(selectedRequirement)}
        requirement={selectedRequirement}
        onClose={() => setSelectedRequirement(null)}
        onCreated={candidate => {
        setSelectedRequirement(null);
        load();
        if (recordId(candidate)) navigate(buildCandidateDetailUrl(recordId(candidate)));
        }}
      />
    </div>
  </section>;
}
