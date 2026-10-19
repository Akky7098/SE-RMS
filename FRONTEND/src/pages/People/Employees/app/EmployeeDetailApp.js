import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getEmployeeById } from "../../../../services/employeeService";
import EmployeeOverlay from "./EmployeeOverlay";
import { departmentName, formatDate, initials, managerName, pretty } from "./employeeAppData";

export default function EmployeeDetailApp({ employeeId, onClose, onEdit }) {
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let current = true;
    setError("");
    getEmployeeById(employeeId).then(result => {
      const record = result?.employee || result?.data || result;
      if (!record) throw new Error("Employee not found.");
      if (current) setEmployee(record);
    }).catch(failure => { if (current) setError(failure?.response?.data?.message || failure.message || "Employee could not load."); });
    return () => { current = false; };
  }, [employeeId, retry]);
  const phone = String(employee?.mobileNumber || "").replace(/[^\d+]/g, "");
  const email = employee?.officialEmail || employee?.personalEmail;
  const rows = employee ? [
    ["Company", employee.companyName || pretty(employee.companyCode)], ["Department", departmentName(employee)],
    ["Organisation unit", employee.orgUnit?.name || employee.orgUnitName || pretty(employee.orgUnitCode)],
    ["Reporting manager", managerName(employee)], ["Joined on", formatDate(employee.joiningDate)],
    ["Employment type", pretty(employee.employmentType)], ["Work location", employee.workLocation],
    ["Mobile", employee.mobileNumber], ["Official email", employee.officialEmail], ["Personal email", employee.personalEmail],
    ["Biometric ID", employee.biometricCode], ...(employee.exitDate ? [["Exit date", formatDate(employee.exitDate)]] : []),
  ] : [];
  return (
    <EmployeeOverlay title="Employee profile" onClose={onClose}>
      <div className="se-ema-content">
        {error ? <div className="se-ema-error" role="alert"><p>{error}</p><button type="button" className="se-iva-primary" onClick={() => setRetry(value => value + 1)}>Retry</button></div>
          : !employee ? <p role="status">Loading employee…</p> : <>
            <section className="se-ema-profile">
              <div className="se-iva-person">
                <span className="se-iva-avatar">{employee.profilePhotoUrl ? <img src={employee.profilePhotoUrl} alt="" /> : initials(employee.fullName)}</span>
                <div><h2>{employee.fullName}</h2><p>{employee.designation || "Designation not assigned"}</p></div>
              </div>
              <div className="se-ema-identity"><strong>{employee.employeeCode}</strong><span className="se-ema-status" data-status={employee.status}>{pretty(employee.status)}</span></div>
              <div className="se-ema-contact">
                {phone && <a className="se-iva-call" href={`tel:${phone}`}>☎ Call</a>}
                {email && <a className="se-iva-secondary" href={`mailto:${email}`}>✉ Email</a>}
                <button type="button" className="se-iva-primary" onClick={onEdit}>Edit employee</button>
              </div>
            </section>
            <section className="se-ema-profile"><h2>Employee details</h2><dl className="se-ema-detail-grid">
              {rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "—"}</dd></div>)}
            </dl></section>
            <details className="se-ema-profile"><summary>Employee records</summary><div className="se-ema-record-links">
              <button type="button" className="se-iva-secondary" onClick={() => navigate(`/people/employees/${employeeId}/onboarding`)}>Onboarding ›</button>
              <button type="button" className="se-iva-secondary" onClick={() => navigate(`/people/employees/${employeeId}/documents`)}>Documents ›</button>
              <button type="button" className="se-iva-secondary" onClick={() => navigate(`/people/employees/${employeeId}/hierarchy`)}>Reporting hierarchy ›</button>
            </div></details>
          </>}
      </div>
    </EmployeeOverlay>
  );
}
