import React, { useEffect, useRef, useState } from "react";
import api from "../../../../services/api";
import { createManpowerRequirement, getActiveOffices } from "../../../../services/manpowerService";
import { getApiErrorMessage } from "../../utils/recruitmentHelpers";
import { EMPTY_FORM, getTodayKey, normalizeDepartmentList, getFormErrors, buildManpowerPayload, recordId } from "./manpowerAppHelpers";
const steps = ["Position", "Requirements", "Review"];
const fieldsByStep = [["department", "positionTitle", "numberOfOpenings", "officeId", "requiredByDate", "reason"], ["minimumExperienceYears", "maximumExperienceYears", "monthlySalaryMin", "monthlySalaryMax"]];
export default function ManpowerAppForm({
  onCreated,
  onCancel
}) {
  const [form, setForm] = useState({
    ...EMPTY_FORM
  });
  const [step, setStep] = useState(0);
  const [departments, setDepartments] = useState([]);
  const [offices, setOffices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [retry, setRetry] = useState(0);
  const pending = useRef(false);
  const formRef = useRef(null);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([api.get("/departments", {
      params: {
        status: "ACTIVE"
      }
    }), getActiveOffices()]).then(([departmentResult, officeResult]) => {
      if (!active) return;
      setDepartments(normalizeDepartmentList(departmentResult));
      setOffices(officeResult);
    }).catch(failure => {
      if (active) setError(getApiErrorMessage(failure, "Request options could not load."));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [retry]);
  useEffect(() => {
    formRef.current?.querySelector("h2")?.focus();
  }, [step]);
  const update = event => {
    const {
      name,
      value
    } = event.target;
    setForm(current => ({
      ...current,
      [name]: value
    }));
    setFieldErrors(current => ({
      ...current,
      [name]: ""
    }));
  };
  const field = (name, label, options = {}) => <label
    className="se-mpa-field"
    key={name}
  >
    <span id={`mpa-${name}-label`}>
      {label}
      {options.required ? " *" : ""}
    </span>
    {options.choices ? <select
      name={name}
      aria-labelledby={`mpa-${name}-label`}
      aria-required={Boolean(options.required)}
      value={form[name]}
      onChange={update}
      disabled={busy || loading}
      aria-invalid={Boolean(fieldErrors[name])}
      aria-describedby={fieldErrors[name] ? `mpa-${name}-error` : undefined}
    >
      {options.placeholder && <option value="">
        {options.placeholder}
      </option>}
      {options.choices.map(([value, text]) => <option
        key={value}
        value={value}
      >
        {text}
      </option>)}
    </select> : options.multiline ? <textarea
      name={name}
      aria-labelledby={`mpa-${name}-label`}
      aria-required={Boolean(options.required)}
      value={form[name]}
      onChange={update}
      rows={3}
      disabled={busy}
      aria-invalid={Boolean(fieldErrors[name])}
      aria-describedby={fieldErrors[name] ? `mpa-${name}-error` : undefined}
    /> : <input
      name={name}
      aria-labelledby={`mpa-${name}-label`}
      aria-required={Boolean(options.required)}
      value={form[name]}
      onChange={update}
      type={options.type || "text"}
      min={options.min}
      step={options.type === "number" ? options.integer ? "1" : "any" : undefined}
      inputMode={options.type === "number" ? options.integer ? "numeric" : "decimal" : undefined}
      disabled={busy}
      aria-invalid={Boolean(fieldErrors[name])}
      aria-describedby={fieldErrors[name] ? `mpa-${name}-error` : undefined}
    />}
    {fieldErrors[name] && <small id={`mpa-${name}-error`}>
      {fieldErrors[name]}
    </small>}
  </label>;
  const submit = async event => {
    event.preventDefault();
    if (pending.current || loading) return;
    const errors = getFormErrors(form, getTodayKey());
    const relevant = step < 2 ? fieldsByStep[step] : Object.keys(errors);
    const visible = Object.fromEntries(Object.entries(errors).filter(([key]) => relevant.includes(key)));
    if (Object.keys(visible).length) {
      setFieldErrors(visible);
      if (step === 2) setStep(fieldsByStep[0].some(name => errors[name]) ? 0 : 1);
      window.setTimeout(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus(), 0);
      return;
    }
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const created = await createManpowerRequirement(buildManpowerPayload(form, offices));
      onCreated(created);
    } catch (failure) {
      setError(getApiErrorMessage(failure, "Request could not be submitted."));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return <form
    className="se-mpa-form"
    ref={formRef}
    onSubmit={submit}
    noValidate
  >
    <div className="se-mpa-form-heading">
      <span>
        NEW REQUEST
      </span>
      <h2 tabIndex={-1}>
        {steps[step]}
      </h2>
      <ol
        className="se-mpa-steps"
        aria-label="Request progress"
      >
        {steps.map((label, index) => <li
          key={label}
          aria-current={index === step ? "step" : undefined}
        >
          <span>
            {index + 1}
          </span>
          {label}
        </li>)}
      </ol>
    </div>
    {error && <div
      className="se-mpa-error"
      role="alert"
    >
      {error}
      {!departments.length && <button
        type="button"
        onClick={() => setRetry(retry + 1)}
      >
        Retry
      </button>}
    </div>}
    {loading ? <p role="status">
      Loading departments and locations…
    </p> : <>
      {step === 0 && <section className="se-mpa-form-section">
        {field("positionTitle", "Position title", {
        required: true
        })}
        {field("department", "Department", {
        required: true,
        placeholder: "Select department",
        choices: departments.map(item => [recordId(item), item.name])
        })}
        <div className="se-mpa-pair">
          {field("numberOfOpenings", "Openings", {
          required: true,
          type: "number",
          min: 1,
          integer: true
          })}
          {field("requiredByDate", "Required by", {
          required: true,
          type: "date",
          min: getTodayKey()
          })}
        </div>
        {field("officeId", "Work location", {
        required: true,
        placeholder: "Select location",
        choices: offices.map(item => [recordId(item), item.name])
        })}
        {field("reason", "Business reason", {
        required: true,
        multiline: true
        })}
      </section>}
      {step === 1 && <section className="se-mpa-form-section">
        {field("priority", "Priority", {
        choices: [["LOW", "Low"], ["NORMAL", "Normal"], ["HIGH", "High"], ["URGENT", "Urgent"]]
        })}
        {field("employmentType", "Employment type", {
        choices: [["FULL_TIME", "Full time"], ["PART_TIME", "Part time"], ["CONTRACT", "Contract"], ["TEMPORARY", "Temporary"], ["INTERN", "Intern"]]
        })}
        {field("requiredSkills", "Skills (comma separated)")}
        <h3>
          Experience · years
        </h3>
        <div className="se-mpa-pair">
          {field("minimumExperienceYears", "Minimum experience", {
          type: "number",
          min: 0
          })}
          {field("maximumExperienceYears", "Maximum experience", {
          type: "number",
          min: 0
          })}
        </div>
        <h3>
          Monthly salary
        </h3>
        {field("currency", "Currency", {
        choices: [["INR", "INR · ₹"], ["USD", "USD · $"], ["EUR", "EUR · €"]]
        })}
        <div className="se-mpa-pair">
          {field("monthlySalaryMin", "Minimum salary", {
          type: "number",
          min: 0
          })}
          {field("monthlySalaryMax", "Maximum salary", {
          type: "number",
          min: 0
          })}
        </div>
      </section>}
      {step === 2 && <section className="se-mpa-review">
        <h3>
          {form.positionTitle}
        </h3>
        <p>
          {departments.find(item => recordId(item) === form.department)?.name}
        </p>
        <dl>
          <div>
            <dt>
              Openings
            </dt>
            <dd>
              {form.numberOfOpenings}
            </dd>
          </div>
          <div>
            <dt>
              Required by
            </dt>
            <dd>
              {form.requiredByDate}
            </dd>
          </div>
          <div>
            <dt>
              Location
            </dt>
            <dd>
              {offices.find(item => recordId(item) === form.officeId)?.name}
            </dd>
          </div>
          <div>
            <dt>
              Priority
            </dt>
            <dd>
              {form.priority}
            </dd>
          </div>
          <div>
            <dt>
              Employment
            </dt>
            <dd>
              {form.employmentType.replaceAll("_", " ")}
            </dd>
          </div>
          <div>
            <dt>
              Experience
            </dt>
            <dd>
              {form.minimumExperienceYears || "0"}
              – 
              {form.maximumExperienceYears || "Not specified"}
              years
            </dd>
          </div>
          <div>
            <dt>
              Monthly salary
            </dt>
            <dd>
              {form.monthlySalaryMin || "—"}
              – 
              {form.monthlySalaryMax || "—"}
              {form.currency}
            </dd>
          </div>
        </dl>
        {form.requiredSkills && <p>
          <strong>
            Skills
          </strong>
          <br />
          {form.requiredSkills}
        </p>}
        <p>
          <strong>
            Business reason
          </strong>
          <br />
          {form.reason}
        </p>
      </section>}
      <div className="se-mpa-form-actions">
        <button
          type="button"
          className="se-mpa-secondary"
          onClick={() => step ? setStep(step - 1) : onCancel()}
          disabled={busy}
        >
          {step ? "Back" : "Cancel"}
        </button>
        <button
          type="submit"
          className="se-mpa-primary"
          disabled={busy || !departments.length || !offices.length}
        >
          {busy ? "Submitting…" : step === 2 ? "Submit request" : "Continue"}
        </button>
      </div>
    </>}
  </form>;
}
