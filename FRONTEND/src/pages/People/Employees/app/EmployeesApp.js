import React, { useCallback, useEffect, useRef, useState } from "react";
import { getEmployees, getEmployeeMeta } from "../../../../services/employeeService";
import EmployeeFilters, { EMPTY_FILTERS } from "./EmployeeFilters";
import EmployeeFormApp from "./EmployeeFormApp";
import EmployeeDetailApp from "./EmployeeDetailApp";
import { departmentName, employeeId, initials, managerName, pretty } from "./employeeAppData";
import "../../../Recruitment/Interviews/app/InterviewsApp.css";
import "./EmployeesApp.css";

export default function EmployeesApp({ search = "" }) {
  const [records, setRecords] = useState([]);
  const [meta, setMeta] = useState({});
  const [metaError, setMetaError] = useState("");
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1, limit: 50 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const version = useRef(0);
  const heading = useRef(null);
  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); setQuery(search.trim()); }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  const loadMeta = useCallback(async () => {
    try { setMeta(await getEmployeeMeta() || {}); setMetaError(""); }
    catch { setMetaError("Filter options could not load. You can still search employees."); }
  }, []);
  useEffect(() => { loadMeta(); }, [loadMeta]);
  const load = useCallback(async () => {
    const request = ++version.current;
    setLoading(true);
    setError("");
    try {
      const params = { page, limit: 50, ...(query ? { search: query } : {}) };
      Object.entries(filters).forEach(([key, value]) => { if (value) params[key] = value; });
      const result = await getEmployees(params);
      if (request !== version.current) return;
      const pages = Math.max(1, Number(result?.pagination?.pages) || 1);
      if (page > pages) { setPage(pages); return; }
      setRecords(Array.isArray(result?.records) ? result.records : []);
      setPagination(result?.pagination || { page, limit: 50, pages: 1, total: result?.records?.length || 0 });
    } catch (failure) {
      if (request === version.current) setError(failure?.response?.data?.message || failure.message || "Employees could not load.");
    } finally {
      if (request === version.current) setLoading(false);
    }
  }, [page, query, filters]);
  useEffect(() => { load(); return () => { version.current += 1; }; }, [load, refresh]);
  const count = Object.values(filters).filter(Boolean).length;
  const pages = Math.max(1, Number(pagination.pages) || 1);
  const total = Number(pagination.total) || 0;
  const start = (page - 1) * 50;
  const changePage = value => {
    setPage(value);
    heading.current?.scrollIntoView?.({ block: "start" });
    heading.current?.focus({ preventScroll: true });
  };

  return (
    <section className="se-iva se-ema" aria-label="Mobile employees">
      <div className="se-iva-toolbar">
        <button type="button" className="se-iva-primary" onClick={() => { setSelected(""); setFormOpen(true); }}>+ Add employee</button>
        <button type="button" className="se-iva-secondary" onClick={() => setFiltersOpen(true)}>Filters{count ? ` (${count})` : ""}</button>
        <button type="button" className="se-iva-refresh" aria-label="Refresh employees" disabled={loading} onClick={() => { load(); loadMeta(); }}>↻</button>
      </div>
      <div className="se-iva-list-heading" ref={heading} tabIndex={-1}>
        <h2>{loading ? "Loading employees…" : `${total} employee${total === 1 ? "" : "s"}`}</h2>
        {count > 0 && <button type="button" onClick={() => { setFilters({ ...EMPTY_FILTERS }); setPage(1); }}>Clear filters</button>}
      </div>
      {metaError && <p className="se-ema-notice" role="status">{metaError}</p>}
      {error ? <div className="se-iva-message" role="alert"><p>{error}</p><button type="button" className="se-iva-primary" onClick={load}>Retry</button></div>
        : loading ? <p className="se-iva-message" role="status">Loading employee directory…</p> : <>
          <div className="se-iva-cards">
            {records.map(employee => {
              const phone = String(employee.mobileNumber || employee.phone || "").replace(/[^\d+]/g, "");
              return <article className="se-iva-card se-ema-card" key={employeeId(employee)}>
                <button type="button" className="se-iva-card-main" aria-label={`View ${employee.fullName}`} onClick={() => setSelected(employeeId(employee))}>
                  <span className="se-iva-person">
                    <span className="se-iva-avatar">{employee.profilePhotoUrl ? <img src={employee.profilePhotoUrl} alt="" /> : initials(employee.fullName)}</span>
                    <span><strong>{employee.fullName}</strong><small>{employee.designation || "Designation not assigned"}</small></span>
                    <span className="se-iva-chevron" aria-hidden="true">›</span>
                  </span>
                  <span className="se-ema-identity"><strong>{employee.employeeCode || "—"}</strong><span>{employee.companyName || pretty(employee.companyCode)}</span></span>
                  <span className="se-ema-department">{departmentName(employee)}{employee.orgUnitCode && pretty(departmentName(employee)) !== pretty(employee.orgUnitCode) ? ` · ${pretty(employee.orgUnitCode)}` : ""}</span>
                  <span className="se-ema-status" data-status={employee.status}>{pretty(employee.status || "ACTIVE")}</span>
                </button>
                <footer className="se-iva-card-footer">
                  <span><small>Reports to</small>{managerName(employee)}</span>
                  {phone && <a href={`tel:${phone}`} className="se-iva-call" aria-label={`Call ${employee.fullName}`}>☎ Call</a>}
                  <button type="button" className="se-iva-primary" onClick={() => setSelected(employeeId(employee))}>Profile ›</button>
                </footer>
              </article>;
            })}
          </div>
          {!records.length && <div className="se-iva-message"><h3>No employees found</h3><p>Try another search or filter.</p></div>}
          {total > 0 && <nav className="se-iva-pagination" aria-label="Employee pagination">
            <span>{`${start + 1}–${Math.min(start + records.length, total)} of ${total}`}<small>50 employees per page</small></span>
            <div>
              <button type="button" aria-label="Previous page" disabled={page === 1} onClick={() => changePage(page - 1)}>←</button>
              <select aria-label="Go to employee page" value={page} onChange={event => changePage(Number(event.target.value))}>
                {Array.from({ length: pages }, (_, index) => <option key={index} value={index + 1}>{`Page ${index + 1} of ${pages}`}</option>)}
              </select>
              <button type="button" aria-label="Next page" disabled={page === pages} onClick={() => changePage(page + 1)}>→</button>
            </div>
          </nav>}
        </>}
      {filtersOpen && <EmployeeFilters filters={filters} meta={meta} onClose={() => setFiltersOpen(false)} onApply={values => {
        setPage(1); setFilters(values); setFiltersOpen(false);
      }} />}
      {selected && !formOpen && <EmployeeDetailApp key={`${selected}:${refresh}`} employeeId={selected} onClose={() => setSelected("")} onEdit={() => setFormOpen(true)} />}
      {formOpen && <EmployeeFormApp employeeId={selected || undefined} onClose={() => setFormOpen(false)} onSaved={id => {
        setFormOpen(false); setSelected(id || ""); setRefresh(value => value + 1);
      }} />}
    </section>
  );
}
