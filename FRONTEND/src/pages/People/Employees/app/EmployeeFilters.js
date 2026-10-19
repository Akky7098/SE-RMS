import React, { useState } from "react";
import MobileSheet from "../../../Recruitment/Interviews/app/InterviewSheet";
import { optionItems, pretty } from "./employeeAppData";

export const EMPTY_FILTERS = { status: "", companyCode: "", department: "", orgUnitCode: "", employmentType: "" };
export default function EmployeeFilters({ filters, meta, onApply, onClose }) {
  const [draft, setDraft] = useState(filters);
  const fields = [
    ["companyCode", "Company", optionItems(meta.companies || meta.companyCodes)],
    ["orgUnitCode", "Organisation unit", optionItems(meta.orgUnits || meta.organizationUnits)],
    ["department", "Department", optionItems(meta.departments, "department")],
    ["employmentType", "Employment type", optionItems(meta.employmentTypes || ["PERMANENT", "PROBATION", "CONTRACT", "TRAINEE", "INTERN", "CONSULTANT"])],
  ];
  return (
    <MobileSheet title="Filter employees" onClose={onClose}>
      <div className="se-iva-sheet-body">
        <fieldset><legend>Employee status</legend><div className="se-iva-options">
          {["", ...(meta.statuses || ["ACTIVE", "INACTIVE", "NOTICE_PERIOD", "EXITED", "ONBOARDING"])].map(value => (
            <label key={value} className={draft.status === value ? "selected" : ""}>
              <input type="radio" name="employee-status" checked={draft.status === value} onChange={() => setDraft({ ...draft, status: value })} />
              {value ? pretty(value) : "All statuses"}
            </label>
          ))}
        </div></fieldset>
        {fields.map(([key, label, options]) => <label key={key} className="se-ema-field">
          <span>{label}</span>
          <select value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })}>
            <option value="">{key === "companyCode" ? "All companies" : key === "orgUnitCode" ? "All organisation units" : key === "department" ? "All departments" : "All employment types"}</option>
            {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>)}
      </div>
      <footer>
        <button type="button" className="se-iva-secondary" onClick={() => setDraft({ ...EMPTY_FILTERS })}>Reset</button>
        <button type="button" className="se-iva-primary" onClick={() => onApply(draft)}>Show employees</button>
      </footer>
    </MobileSheet>
  );
}
