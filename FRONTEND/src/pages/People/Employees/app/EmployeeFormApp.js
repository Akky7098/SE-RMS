// Mobile form preserves the existing employee validation, ID suggestions and reporting hierarchy.
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { createEmployee, getEmployeeById, getEmployeeMeta, updateEmployee } from "../../../../services/employeeService";
import EmployeeOverlay from "./EmployeeOverlay";
import { loadEmployeeChoices } from "./employeeAppData";
import "../../../Recruitment/Interviews/app/InterviewsApp.css";
import "./EmployeesApp.css";
const COMPANY_CONFIG = [{
  value: "SANDEEP_EDGETECH",
  label: "Sandeep Edgetech",
  prefix: "SE"
}, {
  value: "SANDEEP_ENTERPRISES",
  label: "Sandeep Enterprises",
  prefix: "SE"
}, {
  value: "VANIJA",
  label: "Vanija",
  prefix: "VI"
}, {
  value: "VESS",
  label: "VESS",
  prefix: "VE"
}, {
  value: "SI",
  label: "SI",
  prefix: "SI"
}, {
  value: "FERMECH",
  label: "Fermech",
  prefix: "FM"
}, {
  value: "SF",
  label: "SF",
  prefix: "SF"
}, {
  value: "MULTIPACK",
  label: "Multipack",
  prefix: "MP"
}];
const INITIAL_FORM = {
  employeeCode: "",
  companyCode: "",
  fullName: "",
  personalEmail: "",
  officialEmail: "",
  mobileNumber: "",
  department: "",
  orgUnitCode: "",
  designation: "",
  reportsTo: "",
  employmentType: "PERMANENT",
  joiningDate: "",
  workLocation: "",
  biometricCode: "",
  profilePhotoUrl: "",
  status: "ACTIVE"
};
const dateInput = value => {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().slice(0, 10);
};
const digits = (value, max = 10) => String(value || "").replace(/\D/g, "").slice(0, max);
const normalise = value => String(value || "").trim().toUpperCase();
const prettyValue = value => String(value || "").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());
const getEmployeeCompanyCode = employee => {
  return normalise(employee?.companyCode);
};
const generateNextCode = (employees, companyCode) => {
  const company = COMPANY_CONFIG.find(item => item.value === companyCode);
  if (!company) {
    return "";
  }
  const prefix = company.prefix;
  let highest = 0;
  (employees || []).forEach(employee => {
    const employeeCompany = getEmployeeCompanyCode(employee);
    const code = normalise(employee?.employeeCode);
    if (!code) {
      return;
    }
    const companyMatches = employeeCompany === companyCode;
    const prefixMatches = code.startsWith(prefix);
    if (!companyMatches && !prefixMatches) {
      return;
    }
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = code.match(new RegExp(`^${escapedPrefix}-?(\\d+)$`));
    if (!match) {
      return;
    }
    const number = Number(match[1]);
    if (Number.isFinite(number) && number > highest) {
      highest = number;
    }
  });
  const nextNumber = highest > 0 ? highest + 1 : 1001;
  return `${prefix}${nextNumber}`;
};
export default function EmployeeFormApp({ employeeId, onClose, onSaved }) {
  const editing = Boolean(employeeId);
  const [form, setForm] = useState(INITIAL_FORM);
  const [meta, setMeta] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const errorRef = useRef(null);
  useEffect(() => {
    if (error) { errorRef.current?.scrollIntoView?.({ block: "center" }); errorRef.current?.focus(); }
  }, [error]);
  const [employeeCodeEdited, setEmployeeCodeEdited] = useState(false);
  const [biometricCodeEdited, setBiometricCodeEdited] = useState(false);
  const closeForm = () => { if (!saving) onClose(); };
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const [metaResult, employeeResult, employeesResult] = await Promise.all([getEmployeeMeta(), editing ? getEmployeeById(employeeId) : Promise.resolve(null), loadEmployeeChoices()]);
        if (!mounted) {
          return;
        }
        setMeta(metaResult || {});
        const records = employeesResult || [];
        setEmployees(Array.isArray(records) ? records : []);
        if (employeeResult) {
          const photoUrl = employeeResult?.profilePhotoUrl || "";
          setForm({
            employeeCode: employeeResult?.employeeCode || "",
            companyCode: employeeResult?.companyCode || "",
            fullName: employeeResult?.fullName || "",
            personalEmail: employeeResult?.personalEmail || "",
            officialEmail: employeeResult?.officialEmail || "",
            mobileNumber: employeeResult?.mobileNumber || "",
            department: employeeResult?.departmentId || employeeResult?.department?._id || employeeResult?.department?.id || "",
            orgUnitCode: employeeResult?.orgUnitCode || "",
            designation: employeeResult?.designation || "",
            reportsTo: employeeResult?.reportingManagerId || employeeResult?.reportsTo?._id || employeeResult?.reportsTo?.id || "",
            employmentType: employeeResult?.employmentType || "PERMANENT",
            joiningDate: dateInput(employeeResult?.joiningDate),
            workLocation: employeeResult?.workLocation || "",
            biometricCode: employeeResult?.biometricCode || "",
            profilePhotoUrl: photoUrl,
            status: employeeResult?.status || "ACTIVE"
          });
          setEmployeeCodeEdited(true);
          setBiometricCodeEdited(true);
        }
      } catch (requestError) {
        if (!mounted) {
          return;
        }
        setError(requestError?.response?.data?.message || requestError?.message || "Employee form could not be loaded.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [editing, employeeId, loadAttempt]);
  const departments = useMemo(() => {
    const values = meta?.departments || [];
    if (!Array.isArray(values)) {
      return [];
    }
    return values.map(department => {
      if (typeof department === "string") {
        return {
          value: department,
          name: prettyValue(department),
          code: department
        };
      }
      const value = department?._id || department?.id || department?.value || department?.code || department?.name || "";
      return {
        ...department,
        value: String(value),
        name: department?.name || department?.label || prettyValue(value)
      };
    }).filter(department => Boolean(department.value));
  }, [meta]);
  const orgUnits = useMemo(() => {
    const values = meta?.orgUnits || meta?.organizationUnits || meta?.orgUnitCodes || [];
    return Array.isArray(values) ? values : [];
  }, [meta]);
  const employmentTypes = useMemo(() => meta?.employmentTypes || ["PERMANENT", "PROBATION", "CONTRACT", "TRAINEE", "INTERN", "CONSULTANT"], [meta]);
  const statuses = useMemo(() => meta?.statuses || ["ACTIVE", "INACTIVE", "NOTICE_PERIOD", "EXITED"], [meta]);
  const companyOptions = useMemo(() => {
    const backendCompanies = meta?.companies || meta?.companyCodes || [];
    if (!Array.isArray(backendCompanies) || backendCompanies.length === 0) {
      return COMPANY_CONFIG;
    }
    return backendCompanies.map(item => {
      if (typeof item === "string") {
        const local = COMPANY_CONFIG.find(company => company.value === item);
        return local || {
          value: item,
          label: prettyValue(item),
          prefix: ""
        };
      }
      const value = item?.value || item?.code || item?.companyCode || "";
      const local = COMPANY_CONFIG.find(company => company.value === value);
      return {
        value,
        label: item?.label || item?.name || local?.label || prettyValue(value),
        prefix: item?.prefix || local?.prefix || ""
      };
    }).filter(item => Boolean(item?.value));
  }, [meta]);
  const reportingManagers = useMemo(() => {
    if (!form.companyCode || !form.orgUnitCode || !form.department) {
      return [];
    }
    const currentEmployeeId = String(employeeId || "");
    const getId = employee => String(employee?._id || employee?.id || "");
    const getDepartmentId = employee => String(employee?.departmentId || employee?.department?._id || employee?.department?.id || employee?.department?.value || employee?.department?.code || employee?.department?.name || employee?.department || "");
    const getReportsToId = employee => String(employee?.reportingManagerId || employee?.reportsTo?._id || employee?.reportsTo?.id || employee?.reportsTo || "");
    const activeEmployees = (employees || []).filter(employee => {
      const id = getId(employee);
      if (!id) {
        return false;
      }
      if (editing && id === currentEmployeeId) {
        return false;
      }
      return employee?.status === "ACTIVE" || !employee?.status;
    });
    const sameDepartmentEmployees = activeEmployees.filter(employee => {
      const companyMatches = normalise(employee?.companyCode) === normalise(form.companyCode);
      const orgMatches = normalise(employee?.orgUnitCode) === normalise(form.orgUnitCode);
      const departmentMatches = getDepartmentId(employee) === String(form.department);
      return companyMatches && orgMatches && departmentMatches;
    });
    const employeeMap = new Map();
    activeEmployees.forEach(employee => {
      const id = getId(employee);
      if (id) {
        employeeMap.set(id, employee);
      }
    });
    const candidateMap = new Map();
    sameDepartmentEmployees.forEach(employee => {
      const id = getId(employee);
      if (id) {
        candidateMap.set(id, employee);
      }
    });
    sameDepartmentEmployees.forEach(employee => {
      let managerId = getReportsToId(employee);
      const visited = new Set();
      while (managerId && !visited.has(managerId)) {
        visited.add(managerId);
        const manager = employeeMap.get(managerId);
        if (!manager) {
          break;
        }
        const managerEmployeeId = getId(manager);
        if (managerEmployeeId && !(editing && managerEmployeeId === currentEmployeeId)) {
          candidateMap.set(managerEmployeeId, manager);
        }
        managerId = getReportsToId(manager);
      }
    });
    return Array.from(candidateMap.values()).sort((a, b) => String(a?.fullName || "").localeCompare(String(b?.fullName || "")));
  }, [employees, employeeId, editing, form.companyCode, form.orgUnitCode, form.department]);
  const suggestedEmployeeCode = useMemo(() => generateNextCode(employees, form.companyCode), [employees, form.companyCode]);
  const update = (key, value) => {
    setForm(previous => ({
      ...previous,
      [key]: value
    }));
    if (error) {
      setError("");
    }
  };
  const handleCompanyChange = event => {
    const companyCode = event.target.value;
    const nextCode = generateNextCode(employees, companyCode);
    setForm(previous => ({
      ...previous,
      companyCode,
      orgUnitCode: "",
      department: "",
      reportsTo: "",
      employeeCode: !editing && !employeeCodeEdited ? nextCode : previous.employeeCode,
      biometricCode: !editing && !biometricCodeEdited ? nextCode : previous.biometricCode
    }));
    setError("");
  };
  const handleOrgUnitChange = event => {
    const value = event.target.value;
    setForm(previous => ({
      ...previous,
      orgUnitCode: value,
      department: "",
      reportsTo: ""
    }));
    setError("");
  };
  useEffect(() => {
    if (editing || !form.companyCode || !suggestedEmployeeCode) {
      return;
    }
    setForm(previous => {
      const next = {
        ...previous
      };
      if (!employeeCodeEdited) {
        next.employeeCode = suggestedEmployeeCode;
      }
      if (!biometricCodeEdited) {
        next.biometricCode = suggestedEmployeeCode;
      }
      return next;
    });
  }, [editing, form.companyCode, suggestedEmployeeCode, employeeCodeEdited, biometricCodeEdited]);
  const handleDepartmentChange = event => {
    const value = event.target.value;
    setForm(previous => ({
      ...previous,
      department: value,
      reportsTo: ""
    }));
    setError("");
  };
  const validate = () => {
    if (!form.fullName.trim()) {
      return "Employee name is required.";
    }
    if (!form.companyCode) {
      return "Company is required.";
    }
    if (!form.employeeCode.trim()) {
      return "Employee ID is required.";
    }
    if (form.mobileNumber && digits(form.mobileNumber, 10).length !== 10) {
      return "Mobile number must contain exactly 10 digits.";
    }
    if (form.personalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.personalEmail.trim())) {
      return "Personal email is not valid.";
    }
    if (form.officialEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.officialEmail.trim())) {
      return "Official email is not valid.";
    }
    if (!form.department) {
      return "Department is required.";
    }
    if (!form.designation.trim()) {
      return "Designation is required.";
    }
    if (!form.orgUnitCode) {
      return "Organisation unit is required.";
    }
    return "";
  };
  const submit = async event => {
    event.preventDefault();
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }
    try {
      setSaving(true);
      setError("");
      const payload = {
        employeeCode: form.employeeCode.trim().toUpperCase(),
        companyCode: form.companyCode,
        fullName: form.fullName.trim(),
        personalEmail: form.personalEmail.trim().toLowerCase() || null,
        officialEmail: form.officialEmail.trim().toLowerCase() || null,
        mobileNumber: form.mobileNumber ? digits(form.mobileNumber, 10) : null,
        department: form.department,
        orgUnitCode: form.orgUnitCode,
        designation: form.designation.trim(),
        reportsTo: form.reportsTo || null,
        employmentType: form.employmentType,
        joiningDate: form.joiningDate || null,
        workLocation: form.workLocation.trim() || null,
        biometricCode: form.biometricCode.trim().toUpperCase() || null,
        profilePhotoUrl: form.profilePhotoUrl?.trim() || null,
        status: form.status
      };
      let result;
      if (editing) {
        result = await updateEmployee(employeeId, payload);
      } else {
        const response = await createEmployee(payload);
        result = response?.employee || response;
      }
      const id = result?._id || result?.id || employeeId;
      await onSaved?.(id);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || "Employee could not be saved.");
    } finally {
      setSaving(false);
    }
  };
  if (loading) return <div className="se-iva se-ema"><EmployeeOverlay title={editing ? "Edit employee" : "Add employee"} onClose={onClose}>
    <p className="se-ema-content" role="status">Loading employee form…</p>
  </EmployeeOverlay></div>;

  if (!meta) return <div className="se-iva se-ema"><EmployeeOverlay title={editing ? "Edit employee" : "Add employee"} onClose={onClose}>
    <div className="se-ema-content"><div className="se-ema-error" role="alert"><p>{error || "Form options could not load."}</p>
      <button type="button" className="se-iva-primary" onClick={() => setLoadAttempt(value => value + 1)}>Retry</button>
    </div></div>
  </EmployeeOverlay></div>;

  return (
    <div className="se-iva se-ema">
      <EmployeeOverlay title={editing ? "Edit employee" : "Add employee"} onClose={closeForm} busy={saving}>
        <form className="se-ema-form" onSubmit={submit} noValidate>
          <fieldset className="se-ema-form-content" disabled={saving}>
            {error && <div className="se-ema-error" role="alert" tabIndex={-1} ref={errorRef}>{error}</div>}
            <p className="se-ema-required">* Required fields</p>
            <section className="se-ema-form-section"><h2>Employee identity</h2>
              <Field label="Full name *"><input value={form.fullName} onChange={event => update("fullName", event.target.value)} maxLength={120} placeholder="Employee full name" autoComplete="name" /></Field>
              <Field label="Company *"><select value={form.companyCode} onChange={handleCompanyChange}>
                <option value="">Choose company</option>
                {companyOptions.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select></Field>
              <Field label="Employee ID *" hint={!editing && suggestedEmployeeCode ? "Suggested automatically. You can edit it." : ""}>
                <input value={form.employeeCode} onChange={event => { setEmployeeCodeEdited(true); update("employeeCode", event.target.value.toUpperCase()); }} maxLength={30} autoCapitalize="characters" placeholder="Choose company first" />
              </Field>
            </section>
            <section className="se-ema-form-section"><h2>Work assignment</h2>
              <Field label="Organisation unit *"><select value={form.orgUnitCode} disabled={!form.companyCode} onChange={handleOrgUnitChange}>
                <option value="">{!form.companyCode ? "Choose company first" : "Choose organisation unit"}</option>
                {orgUnits.map(item => {
                  const value = typeof item === "string" ? item : item.code || item.value || "";
                  return <option key={value} value={value}>{typeof item === "string" ? prettyValue(item) : item.name || item.label || prettyValue(value)}</option>;
                })}
              </select></Field>
              <Field label="Department *"><select value={form.department} disabled={!form.companyCode || !form.orgUnitCode} onChange={handleDepartmentChange}>
                <option value="">{!form.orgUnitCode ? "Choose organisation unit first" : "Choose department"}</option>
                {departments.map(item => <option key={item.value} value={item.value}>{item.name}</option>)}
              </select></Field>
              <Field label="Designation *"><input value={form.designation} onChange={event => update("designation", event.target.value)} maxLength={120} placeholder="e.g. Machine Operator" /></Field>
              <Field label="Reporting manager" hint={form.department && !reportingManagers.length ? "No manager found in this department hierarchy." : ""}>
                <select value={form.reportsTo} disabled={!form.companyCode || !form.orgUnitCode || !form.department} onChange={event => update("reportsTo", event.target.value)}>
                  <option value="">{!form.department ? "Choose department first" : "No manager assigned"}</option>
                  {reportingManagers.map(item => <option key={item._id || item.id} value={item._id || item.id}>{item.fullName}{item.employeeCode ? ` · ${item.employeeCode}` : ""}</option>)}
                </select>
              </Field>
            </section>
            <section className="se-ema-form-section"><h2>Contact details</h2>
              <Field label="Mobile number"><input type="tel" inputMode="numeric" maxLength={10} value={form.mobileNumber} onChange={event => update("mobileNumber", digits(event.target.value, 10))} autoComplete="tel-national" placeholder="10 digit mobile number" /></Field>
              <Field label="Official email"><input type="email" value={form.officialEmail} onChange={event => update("officialEmail", event.target.value)} autoCapitalize="none" autoComplete="email" placeholder="name@company.com" /></Field>
              <Field label="Personal email"><input type="email" value={form.personalEmail} onChange={event => update("personalEmail", event.target.value)} autoCapitalize="none" placeholder="Personal email address" /></Field>
            </section>
            <section className="se-ema-form-section"><h2>Employment</h2>
              <div className="se-ema-form-grid">
                <Field label="Joining date"><input type="date" value={form.joiningDate} onChange={event => update("joiningDate", event.target.value)} /></Field>
                <Field label="Employment type"><select value={form.employmentType} onChange={event => update("employmentType", event.target.value)}>
                  {employmentTypes.map(value => <option key={value} value={value}>{prettyValue(value)}</option>)}
                </select></Field>
              </div>
              <Field label="Work location"><input value={form.workLocation} onChange={event => update("workLocation", event.target.value)} maxLength={100} placeholder="Office, plant or location" /></Field>
              <Field label="Employee status"><select value={form.status} onChange={event => update("status", event.target.value)}>
                {statuses.map(value => <option key={value} value={value}>{prettyValue(value)}</option>)}
              </select></Field>
            </section>
            <details className="se-ema-form-section"><summary>Biometric ID</summary>
              <Field label="Biometric ID"><input value={form.biometricCode} onChange={event => { setBiometricCodeEdited(true); update("biometricCode", event.target.value.toUpperCase()); }} placeholder="Biometric employee code" /></Field>
            </details>
          </fieldset>
          <footer className="se-ema-save-bar">
            <button type="button" className="se-iva-secondary" onClick={closeForm} disabled={saving}>Cancel</button>
            <button type="submit" className="se-iva-primary" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create employee"}</button>
          </footer>
        </form>
      </EmployeeOverlay>
    </div>
  );
}

function Field({ label, hint, children }) {
  const hintId = useId();
  return <div className="se-ema-field">
    <label className="se-ema-control-label"><span>{label}</span>{React.cloneElement(children, { "aria-describedby": hint ? hintId : undefined })}</label>
    {hint && <small id={hintId}>{hint}</small>}
  </div>;
}
