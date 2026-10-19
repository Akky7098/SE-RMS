import React, {
  useEffect,
  useMemo,
  useState,
} from "react";



const COMPANY_OPTIONS = [
  {
    value: "SANDEEP_EDGETECH",
    label: "Sandeep Edge Tech",
  },
  {
    value: "SANDEEP_ENTERPRISES",
    label: "Sandeep Enterprises",
  },
  {
    value: "VANIJA",
    label: "Vanija",
  },
  {
    value: "VESS",
    label: "VESS",
  },
  {
    value: "SI",
    label: "SI",
  },
  {
    value: "FERMECH",
    label: "Fermech",
  },
  {
    value: "SF",
    label: "SF",
  },
  {
    value: "MULTIPACK",
    label: "Multipack",
  },
];
/* =========================================================
   DEFAULT FORM
========================================================= */

const currentPayrollMonth = () => {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;
};

const createEmptyForm = (
  companyCode = ""
) => ({
  name: "",

  companyCode:
    companyCode || "",

  /* =========================
     POLICY ASSIGNMENT
  ========================= */

  policyType: "BASE",

  applicabilityScope:
    "ALL_EMPLOYEES",

  officeCodes: [],

  departmentIds: [],

  employeeIds: [],

  effectiveFromMonth:
    currentPayrollMonth(),

  effectiveToMonth: "",

  /* =========================
     CALCULATION
  ========================= */

  calculationBasis:
    "CALENDAR_DAYS",

  fixedDays: 30,

  prorateFixedEarnings:
    true,

  /* =========================
     ATTENDANCE
  ========================= */

  paidLeavePayable:
    true,

  weekOffPayable:
    true,

  holidayPayable:
    true,

  halfDayValue:
    0.5,

  absentValue:
    0,

  notMarkedValue:
    0,

  /* =========================
     OVERTIME
  ========================= */

  overtimeEnabled:
    false,

  overtimeCalculationType:
    "SALARY_BASED",

  overtimeFixedHourlyRate:
    "",

  overtimeMultiplier:
    1,

  overtimeMinimumMinutes:
    0,

  overtimeRoundingMinutes:
    0,

  /* =========================
     STATUTORY
  ========================= */

  pfEnabled:
    false,

  pfAmount:
    "",

  esiEnabled:
    false,

  esiAmount:
    "",

  professionalTaxEnabled:
    false,

  professionalTaxAmount:
    "",

  tdsEnabled:
    false,

  tdsAmount:
    "",

  active:
    true,

  isDefault:
    false,
});

/* =========================================================
   HELPERS
========================================================= */

const numberValue = (
  value,
  fallback = 0
) => {
  const parsed =
    Number(value);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : fallback;
};

const getPolicyForm = (
  policy,
  companyCode
) => {
  if (!policy) {
    return createEmptyForm(
      companyCode
    );
  }

  const attendance =
    policy.attendanceRules ||
    policy.attendance ||
    {};

  const overtime =
    policy.overtime ||
    policy.overtimeRules ||
    {};

  const statutory =
    policy.statutory ||
    policy.statutoryConfig ||
    {};

  const applicability =
    policy.applicability ||
    {};

  return {
    name:
      policy.name || "",

    companyCode:
      policy.companyCode ||
      companyCode ||
      "",

    /* =========================
       POLICY ASSIGNMENT
    ========================= */

    policyType:
      policy.policyType ||
      "BASE",

    applicabilityScope:
      applicability.scopeType ||
      "ALL_EMPLOYEES",

    officeCodes:
      Array.isArray(
        applicability.officeCodes
      )
        ? applicability.officeCodes.map(
            String
          )
        : [],

    departmentIds:
      Array.isArray(
        applicability.departmentIds
      )
        ? applicability.departmentIds.map(
            (item) =>
              String(
                item?._id ||
                  item
              )
          )
        : [],

    employeeIds:
      Array.isArray(
        applicability.employeeIds
      )
        ? applicability.employeeIds.map(
            (item) =>
              String(
                item?._id ||
                  item
              )
          )
        : [],

    effectiveFromMonth:
      policy.effectiveFromMonth ||
      currentPayrollMonth(),

    effectiveToMonth:
      policy.effectiveToMonth ||
      "",

    /* =========================
       CALCULATION
    ========================= */

    calculationBasis:
      policy.calculationBasis ||
      "CALENDAR_DAYS",

    fixedDays:
      policy.fixedDays ??
      policy.fixedPayrollDays ??
      30,

    prorateFixedEarnings:
      policy.prorateFixedEarnings ??
      true,

    /* =========================
       ATTENDANCE
    ========================= */

    paidLeavePayable:
      attendance
        .paidLeavePayable ??
      true,

    weekOffPayable:
      attendance
        .weekOffPayable ??
      true,

    holidayPayable:
      attendance
        .holidayPayable ??
      true,

    halfDayValue:
      attendance
        .halfDayValue ??
      0.5,

    absentValue:
      attendance
        .absentValue ??
      0,

    notMarkedValue:
      attendance
        .notMarkedValue ??
      0,

    /* =========================
       OVERTIME
    ========================= */

    overtimeEnabled:
      overtime.enabled ??
      false,

    overtimeCalculationType:
      overtime
        .calculationType ||
      "SALARY_BASED",

    overtimeFixedHourlyRate:
      overtime
        .fixedHourlyRate ??
      "",

    overtimeMultiplier:
      overtime.multiplier ??
      1,

    overtimeMinimumMinutes:
      overtime
        .minimumMinutes ??
      0,

    overtimeRoundingMinutes:
      overtime
        .roundingMinutes ??
      0,

    /* =========================
       STATUTORY
    ========================= */

    pfEnabled:
      statutory.pf?.enabled ??
      false,

    pfAmount:
      statutory.pf?.amount ??
      "",

    esiEnabled:
      statutory.esi?.enabled ??
      false,

    esiAmount:
      statutory.esi?.amount ??
      "",

    professionalTaxEnabled:
      statutory
        .professionalTax
        ?.enabled ??
      false,

    professionalTaxAmount:
      statutory
        .professionalTax
        ?.amount ??
      "",

    tdsEnabled:
      statutory.tds?.enabled ??
      false,

    tdsAmount:
      statutory.tds?.amount ??
      "",

    active:
      policy.active ??
      true,

    isDefault:
      policy.isDefault ??
      false,
  };
};

/* =========================================================
   TOGGLE
========================================================= */

const SettingToggle = ({
  checked,
  onChange,
}) => (
  <button
    type="button"
    className={`se-payroll-setting-toggle ${
      checked
        ? "is-active"
        : ""
    }`}
    onClick={() =>
      onChange(!checked)
    }
    aria-pressed={checked}
  >
    <span />
  </button>
);

/* =========================================================
   COMPONENT
========================================================= */

const PayrollSettingsModal = ({
  open,
  policies = [],

  companyCode = "",

  employees = [],
  departments = [],
  offices = [],

  loading = false,

  onClose,
  onCreatePolicy,
  onUpdatePolicy,
}) => {
  const [
    activeSection,
    setActiveSection,
  ] = useState("GENERAL");

  const [
    selectedPolicyId,
    setSelectedPolicyId,
  ] = useState("");

  const [
    creating,
    setCreating,
  ] = useState(false);

  const [
    form,
    setForm,
  ] = useState(
    createEmptyForm(
      companyCode
    )
  );

  const [
  employeeSearch,
  setEmployeeSearch,
] = useState("");
  /* =======================================================
     SELECTED POLICY
  ======================================================= */

  const selectedPolicy =
    useMemo(
      () =>
        policies.find(
          (policy) =>
            String(
              policy._id
            ) ===
            String(
              selectedPolicyId
            )
        ) || null,
      [
        policies,
        selectedPolicyId,
      ]
    );

  /* =======================================================
     OPEN
  ======================================================= */

  useEffect(() => {
    if (!open) return;

    const defaultPolicy =
      policies.find(
        (policy) =>
          policy.isDefault
      ) ||
      policies[0] ||
      null;

    if (defaultPolicy) {
      setSelectedPolicyId(
        defaultPolicy._id
      );

      setCreating(false);

      setForm(
        getPolicyForm(
          defaultPolicy,
          companyCode
        )
      );
    } else {
      setSelectedPolicyId(
        ""
      );

      setCreating(true);

      setForm(
        createEmptyForm(
          companyCode
        )
      );
    }

    setActiveSection(
      "GENERAL"
    );
  }, [
    open,
    policies,
    companyCode,
  ]);

  /* =======================================================
     CHANGE
  ======================================================= */

  const change = (
    field,
    value
  ) => {
    setForm(
      (current) => ({
        ...current,
        [field]: value,
      })
    );
  };

const toggleArrayValue = (
  field,
  value
) => {
  const normalized =
    String(value);

  setForm(
    (current) => {
      const existing =
        Array.isArray(
          current[field]
        )
          ? current[field].map(
              String
            )
          : [];

      const selected =
        existing.includes(
          normalized
        );

      return {
        ...current,

        [field]:
          selected
            ? existing.filter(
                (item) =>
                  item !==
                  normalized
              )
            : [
                ...existing,
                normalized,
              ],
      };
    }
  );
};


const filteredEmployees =
  useMemo(() => {
    const search =
      employeeSearch
        .trim()
        .toLowerCase();

    return employees.filter(
      (employee) => {
        /*
         * Never show employees from
         * another company.
         */
        if (
          form.companyCode &&
          employee.companyCode &&
          employee.companyCode !==
            form.companyCode
        ) {
          return false;
        }

        if (!search) {
          return true;
        }

        const text = [
          employee.fullName,
          employee.employeeName,
          employee.employeeCode,
          employee.designation,
          employee.department?.name,
          employee.workLocation,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return text.includes(
          search
        );
      }
    );
  }, [
    employees,
    employeeSearch,
    form.companyCode,
  ]);

  /* =======================================================
     SELECT POLICY
  ======================================================= */

  const handleSelectPolicy =
    (policy) => {
      setSelectedPolicyId(
        policy._id
      );

      setCreating(false);

      setForm(
        getPolicyForm(
          policy,
          companyCode
        )
      );

      setActiveSection(
        "GENERAL"
      );
    };

  /* =======================================================
     NEW POLICY
  ======================================================= */

  const handleNewPolicy =
    () => {
      setSelectedPolicyId(
        ""
      );

      setCreating(true);

      setForm(
        createEmptyForm(
          companyCode
        )
      );

      setActiveSection(
        "GENERAL"
      );
    };

  /* =======================================================
     PAYLOAD
  ======================================================= */

const buildPayload =
  () => ({
    name:
      form.name.trim(),

    companyCode:
      form.companyCode,

    /* =========================
       POLICY ASSIGNMENT
    ========================= */

    policyType:
      form.policyType,

    applicability: {
      scopeType:
        form.applicabilityScope,

      officeCodes:
        form.applicabilityScope ===
        "OFFICE"
          ? form.officeCodes
          : [],

      departmentIds:
        form.applicabilityScope ===
        "DEPARTMENT"
          ? form.departmentIds
          : [],

      employeeIds:
        form.applicabilityScope ===
        "EMPLOYEES"
          ? form.employeeIds
          : [],
    },

    effectiveFromMonth:
      form.effectiveFromMonth,

    effectiveToMonth:
      form.effectiveToMonth ||
      null,

    /* =========================
       CALCULATION
    ========================= */

    calculationBasis:
      form.calculationBasis,

    fixedDays:
      numberValue(
        form.fixedDays,
        30
      ),

    prorateFixedEarnings:
      Boolean(
        form.prorateFixedEarnings
      ),

    /* =========================
       ATTENDANCE
    ========================= */

    attendanceRules: {
      paidLeavePayable:
        Boolean(
          form.paidLeavePayable
        ),

      weekOffPayable:
        Boolean(
          form.weekOffPayable
        ),

      holidayPayable:
        Boolean(
          form.holidayPayable
        ),

      halfDayValue:
        numberValue(
          form.halfDayValue,
          0.5
        ),

      absentValue:
        numberValue(
          form.absentValue,
          0
        ),

      notMarkedValue:
        numberValue(
          form.notMarkedValue,
          0
        ),
    },

    /* =========================
       OVERTIME
    ========================= */

    overtime: {
      enabled:
        Boolean(
          form.overtimeEnabled
        ),

      calculationType:
        form
          .overtimeCalculationType,

      fixedHourlyRate:
        numberValue(
          form
            .overtimeFixedHourlyRate,
          0
        ),

      multiplier:
        numberValue(
          form
            .overtimeMultiplier,
          1
        ),

      minimumMinutes:
        numberValue(
          form
            .overtimeMinimumMinutes,
          0
        ),

      roundingMinutes:
        numberValue(
          form
            .overtimeRoundingMinutes,
          0
        ),
    },

    /* =========================
       STATUTORY
    ========================= */

    statutory: {
      pf: {
        enabled:
          Boolean(
            form.pfEnabled
          ),

        amount:
          numberValue(
            form.pfAmount,
            0
          ),
      },

      esi: {
        enabled:
          Boolean(
            form.esiEnabled
          ),

        amount:
          numberValue(
            form.esiAmount,
            0
          ),
      },

      professionalTax: {
        enabled:
          Boolean(
            form
              .professionalTaxEnabled
          ),

        amount:
          numberValue(
            form
              .professionalTaxAmount,
            0
          ),
      },

      tds: {
        enabled:
          Boolean(
            form.tdsEnabled
          ),

        amount:
          numberValue(
            form.tdsAmount,
            0
          ),
      },
    },

    active:
      Boolean(
        form.active
      ),

    /*
     * ADDITIONAL policies are never
     * company default policies.
     */
    isDefault:
      form.policyType ===
      "BASE"
        ? Boolean(
            form.isDefault
          )
        : false,
  });

  /* =======================================================
     SAVE
  ======================================================= */

const handleSave =
  async () => {
    if (
      !form.name.trim()
    ) {
      return;
    }

    if (
      !form.companyCode
    ) {
      return;
    }

    if (
      !form.effectiveFromMonth
    ) {
      return;
    }

    if (
      form.effectiveToMonth &&
      form.effectiveToMonth <
        form.effectiveFromMonth
    ) {
      return;
    }

    if (
      form.applicabilityScope ===
        "OFFICE" &&
      !form.officeCodes.length
    ) {
      return;
    }

    if (
      form.applicabilityScope ===
        "DEPARTMENT" &&
      !form.departmentIds.length
    ) {
      return;
    }

    if (
      form.applicabilityScope ===
        "EMPLOYEES" &&
      !form.employeeIds.length
    ) {
      return;
    }

    const payload =
      buildPayload();

    if (
      creating ||
      !selectedPolicy?._id
    ) {
      await onCreatePolicy?.(
        payload
      );

      return;
    }

    await onUpdatePolicy?.(
      selectedPolicy._id,
      payload
    );
  };

  if (!open) {
    return null;
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="se-payroll-settings-backdrop">
      <div className="se-payroll-settings">
        {/* HEADER */}

        <header className="se-payroll-settings__header">
          <div>
            <span className="se-payroll-settings__eyebrow">
              PAYROLL CONFIGURATION
            </span>

            <h2>
              Payroll Settings
            </h2>

            <p>
              Configure payroll
              calculation, attendance,
              overtime and statutory
              rules.
            </p>
          </div>

          <button
            type="button"
            className="se-payroll-settings__close"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        {/* BODY */}

        <div className="se-payroll-settings__body">
          {/* LEFT */}

          <aside className="se-payroll-settings__sidebar">
            <div className="se-payroll-settings__sidebar-label">
              SETTINGS
            </div>

            {[
              [
                "GENERAL",
                "General",
                "⚙",
              ],
              [
                "ATTENDANCE",
                "Attendance & LOP",
                "◷",
              ],
              [
                "OVERTIME",
                "Overtime",
                "⌚",
              ],
              [
                "STATUTORY",
                "Statutory",
                "₹",
              ],
              [
                "POLICIES",
                "Policies",
                "▤",
              ],
            ].map(
              ([
                key,
                label,
                icon,
              ]) => (
                <button
                  key={key}
                  type="button"
                  className={
                    activeSection ===
                    key
                      ? "is-active"
                      : ""
                  }
                  onClick={() =>
                    setActiveSection(
                      key
                    )
                  }
                >
                  <span>
                    {icon}
                  </span>

                  {label}
                </button>
              )
            )}
          </aside>

          {/* CONTENT */}

          <main className="se-payroll-settings__content">
            {/* GENERAL */}

            {activeSection ===
              "GENERAL" && (
              <>
                <div className="se-payroll-settings__section-head">
                  <div>
                    <h3>
                      General
                    </h3>

                    <p>
                      Core monthly
                      payroll calculation
                      settings.
                    </p>
                  </div>
                </div>

                <div className="se-payroll-settings-card">
                  <div className="se-payroll-settings-grid">
                    <label className="se-payroll-settings-field">
                      <span>
                        Policy Name
                      </span>

                      <input
                        value={
                          form.name
                        }
                        placeholder="Standard Payroll Policy"
                        onChange={(
                          event
                        ) =>
                          change(
                            "name",
                            event
                              .target
                              .value
                          )
                        }
                      />
                    </label>

                    <label className="se-payroll-settings-field">
  <span>
    Company
  </span>

  <select
    value={
      form.companyCode
    }
    onChange={(
      event
    ) =>
      change(
        "companyCode",
        event.target.value
      )
    }
  >
    <option value="">
      Select company
    </option>

    {COMPANY_OPTIONS.map(
      (company) => (
        <option
          key={
            company.value
          }
          value={
            company.value
          }
        >
          {company.label}
        </option>
      )
    )}
  </select>

  <small>
    Select the company this
    payroll policy applies to.
  </small>
</label>

<label className="se-payroll-settings-field">
  <span>
    Policy Type
  </span>

  <select
    value={
      form.policyType
    }
    onChange={(event) => {
      const value =
        event.target.value;

      change(
        "policyType",
        value
      );

      if (
        value ===
        "ADDITIONAL"
      ) {
        change(
          "isDefault",
          false
        );
      }
    }}
  >
    <option value="BASE">
      Base Policy
    </option>

    <option value="ADDITIONAL">
      Additional Policy
    </option>
  </select>

  <small>
    {form.policyType ===
    "BASE"
      ? "Main payroll calculation policy."
      : "Extra policy applied together with the employee's base policy."}
  </small>
</label>

                    <label className="se-payroll-settings-field">
                      <span>
                        Calculation Basis
                      </span>

                      <select
                        value={
                          form.calculationBasis
                        }
                        onChange={(
                          event
                        ) =>
                          change(
                            "calculationBasis",
                            event
                              .target
                              .value
                          )
                        }
                      >
                        <option value="CALENDAR_DAYS">
                          Calendar Days
                        </option>

                        <option value="FIXED_30_DAYS">
                          Fixed 30 Days
                        </option>

                        <option value="WORKING_DAYS">
                          Working Days
                        </option>
                      </select>
                    </label>

                    {form.calculationBasis ===
                      "FIXED_30_DAYS" && (
                      <label className="se-payroll-settings-field">
                        <span>
                          Payroll Days
                        </span>

                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={
                            form.fixedDays
                          }
                          onChange={(
                            event
                          ) =>
                            change(
                              "fixedDays",
                              event
                                .target
                                .value
                            )
                          }
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="se-payroll-settings-card">
                  <SettingRow
                    title="Prorate Fixed Earnings"
                    description="Reduce fixed monthly earnings according to payable days when applicable."
                    checked={
                      form.prorateFixedEarnings
                    }
                    onChange={(
                      value
                    ) =>
                      change(
                        "prorateFixedEarnings",
                        value
                      )
                    }
                  />

                 {form.policyType ===
  "BASE" && (
  <SettingRow
    title="Default Base Policy"
    description="Use this as the fallback base policy when no more specific employee, department or office policy applies."
    checked={
      form.isDefault
    }
    onChange={(
      value
    ) =>
      change(
        "isDefault",
        value
      )
    }
  />
)}

                  <SettingRow
                    title="Policy Active"
                    description="Allow this policy to be used for future payroll runs."
                    checked={
                      form.active
                    }
                    onChange={(
                      value
                    ) =>
                      change(
                        "active",
                        value
                      )
                    }
                  />
                </div>

                <div className="se-payroll-settings-card">
  <div className="se-payroll-policy-block-head">
    <div>
      <strong>
        Policy Applicability
      </strong>

      <span>
        Choose who this payroll
        policy applies to.
      </span>
    </div>
  </div>

  <div className="se-payroll-settings-grid">
    <label className="se-payroll-settings-field se-payroll-settings-field--full">
      <span>
        Apply Policy To
      </span>

      <select
        value={
          form.applicabilityScope
        }
        onChange={(event) =>
          change(
            "applicabilityScope",
            event.target.value
          )
        }
      >
        <option value="ALL_EMPLOYEES">
          All Employees
        </option>

        <option value="OFFICE">
          Specific Office
        </option>

        <option value="DEPARTMENT">
          Specific Department
        </option>

        <option value="EMPLOYEES">
          Selected Employees
        </option>
      </select>
    </label>

    <label className="se-payroll-settings-field">
      <span>
        Effective From
      </span>

      <input
        type="month"
        value={
          form.effectiveFromMonth
        }
        onChange={(event) =>
          change(
            "effectiveFromMonth",
            event.target.value
          )
        }
      />

      <small>
        First payroll month in
        which this policy applies.
      </small>
    </label>

    <label className="se-payroll-settings-field">
      <span>
        Effective Until
      </span>

      <input
        type="month"
        min={
          form.effectiveFromMonth ||
          undefined
        }
        value={
          form.effectiveToMonth
        }
        onChange={(event) =>
          change(
            "effectiveToMonth",
            event.target.value
          )
        }
      />

      <small>
        Optional. Leave empty for
        no end month.
      </small>
    </label>
  </div>

  {form.applicabilityScope ===
    "OFFICE" && (
    <div className="se-payroll-policy-selector">
      <div className="se-payroll-policy-selector__head">
        <strong>
          Select Office
        </strong>

        <span>
          {form.officeCodes.length} selected
        </span>
      </div>

      <div className="se-payroll-policy-choice-list">
        {offices.length ? (
          offices.map(
            (office) => {
              const value =
                String(
                  office.code ||
                    office.value ||
                    office._id ||
                    ""
                );

              const label =
                office.name ||
                office.label ||
                office.workLocation ||
                value;

              const checked =
                form.officeCodes
                  .map(String)
                  .includes(
                    value
                  );

              return (
                <label
                  key={value}
                  className="se-payroll-policy-choice"
                >
                  <input
                    type="checkbox"
                    checked={
                      checked
                    }
                    onChange={() =>
                      toggleArrayValue(
                        "officeCodes",
                        value
                      )
                    }
                  />

                  <span>
                    {label}
                  </span>
                </label>
              );
            }
          )
        ) : (
          <div className="se-payroll-policy-empty">
            No offices available.
          </div>
        )}
      </div>
    </div>
  )}

  {form.applicabilityScope ===
    "DEPARTMENT" && (
    <div className="se-payroll-policy-selector">
      <div className="se-payroll-policy-selector__head">
        <strong>
          Select Department
        </strong>

        <span>
          {form.departmentIds.length} selected
        </span>
      </div>

      <div className="se-payroll-policy-choice-list">
        {departments.length ? (
          departments.map(
            (department) => {
              const id =
                String(
                  department._id ||
                    department.id ||
                    ""
                );

              const checked =
                form.departmentIds
                  .map(String)
                  .includes(id);

              return (
                <label
                  key={id}
                  className="se-payroll-policy-choice"
                >
                  <input
                    type="checkbox"
                    checked={
                      checked
                    }
                    onChange={() =>
                      toggleArrayValue(
                        "departmentIds",
                        id
                      )
                    }
                  />

                  <span>
                    {department.name ||
                      department.departmentName ||
                      "Department"}
                  </span>
                </label>
              );
            }
          )
        ) : (
          <div className="se-payroll-policy-empty">
            No departments available.
          </div>
        )}
      </div>
    </div>
  )}

  {form.applicabilityScope ===
    "EMPLOYEES" && (
    <div className="se-payroll-policy-selector">
      <div className="se-payroll-policy-selector__head">
        <strong>
          Select Employees
        </strong>

        <span>
          {form.employeeIds.length} selected
        </span>
      </div>

      <div className="se-payroll-policy-search">
        <input
          type="search"
          value={
            employeeSearch
          }
          placeholder="Search employee by name, code or designation..."
          onChange={(event) =>
            setEmployeeSearch(
              event.target.value
            )
          }
        />
      </div>

      <div className="se-payroll-policy-employee-list">
        {filteredEmployees.length ? (
          filteredEmployees.map(
            (employee) => {
              const id =
                String(
                  employee._id
                );

              const checked =
                form.employeeIds
                  .map(String)
                  .includes(id);

              const name =
                employee.fullName ||
                employee.employeeName ||
                "Employee";

              return (
                <label
                  key={id}
                  className="se-payroll-policy-employee"
                >
                  <input
                    type="checkbox"
                    checked={
                      checked
                    }
                    onChange={() =>
                      toggleArrayValue(
                        "employeeIds",
                        id
                      )
                    }
                  />

                  <div className="se-payroll-policy-employee__avatar">
                    {name
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="se-payroll-policy-employee__info">
                    <strong>
                      {name}
                    </strong>

                    <span>
                      {[
                        employee.employeeCode,
                        employee.designation,
                        employee.department
                          ?.name,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </span>
                  </div>
                </label>
              );
            }
          )
        ) : (
          <div className="se-payroll-policy-empty">
            No employees found.
          </div>
        )}
      </div>
    </div>
  )}
</div>
              </>
            )}

            {/* ATTENDANCE */}

            {activeSection ===
              "ATTENDANCE" && (
              <>
                <div className="se-payroll-settings__section-head">
                  <div>
                    <h3>
                      Attendance & LOP
                    </h3>

                    <p>
                      Decide how
                      attendance affects
                      payable salary.
                    </p>
                  </div>
                </div>

                <div className="se-payroll-settings-card">
                  <SettingRow
                    title="Paid Leave"
                    description="Approved paid leave counts as a payable payroll day."
                    checked={
                      form.paidLeavePayable
                    }
                    onChange={(
                      value
                    ) =>
                      change(
                        "paidLeavePayable",
                        value
                      )
                    }
                  />

                  <SettingRow
                    title="Weekly Off"
                    description="Scheduled weekly offs count as payable days."
                    checked={
                      form.weekOffPayable
                    }
                    onChange={(
                      value
                    ) =>
                      change(
                        "weekOffPayable",
                        value
                      )
                    }
                  />

                  <SettingRow
                    title="Public Holiday"
                    description="Company holidays count as payable days."
                    checked={
                      form.holidayPayable
                    }
                    onChange={(
                      value
                    ) =>
                      change(
                        "holidayPayable",
                        value
                      )
                    }
                  />
                </div>

                <div className="se-payroll-settings-card">
                  <div className="se-payroll-settings-grid">
                    <label className="se-payroll-settings-field">
                      <span>
                        Half Day Value
                      </span>

                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.5"
                        value={
                          form.halfDayValue
                        }
                        onChange={(
                          event
                        ) =>
                          change(
                            "halfDayValue",
                            event
                              .target
                              .value
                          )
                        }
                      />

                      <small>
                        Normally 0.5
                        payable day.
                      </small>
                    </label>

                    <label className="se-payroll-settings-field">
                      <span>
                        Absent Value
                      </span>

                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.5"
                        value={
                          form.absentValue
                        }
                        onChange={(
                          event
                        ) =>
                          change(
                            "absentValue",
                            event
                              .target
                              .value
                          )
                        }
                      />

                      <small>
                        Normally 0 payable
                        day.
                      </small>
                    </label>

                    <label className="se-payroll-settings-field">
                      <span>
                        Not Marked Value
                      </span>

                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.5"
                        value={
                          form.notMarkedValue
                        }
                        onChange={(
                          event
                        ) =>
                          change(
                            "notMarkedValue",
                            event
                              .target
                              .value
                          )
                        }
                      />

                      <small>
                        Keep at 0 until
                        attendance is
                        corrected.
                      </small>
                    </label>
                  </div>

                  <div className="se-payroll-settings-note">
                    <strong>
                      LWP / LOP
                    </strong>

                    <span>
                      Unpaid leave remains
                      non-payable and is
                      reflected through
                      payable-day
                      calculation.
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* OVERTIME */}

            {activeSection ===
              "OVERTIME" && (
              <>
                <div className="se-payroll-settings__section-head">
                  <div>
                    <h3>
                      Overtime
                    </h3>

                    <p>
                      Configure how
                      approved overtime
                      enters payroll.
                    </p>
                  </div>
                </div>

                <div className="se-payroll-settings-card">
                  <SettingRow
                    title="Enable Overtime"
                    description="Allow approved overtime minutes to create payroll earnings."
                    checked={
                      form.overtimeEnabled
                    }
                    onChange={(
                      value
                    ) =>
                      change(
                        "overtimeEnabled",
                        value
                      )
                    }
                  />
                </div>

                {form.overtimeEnabled && (
                  <div className="se-payroll-settings-card">
                    <div className="se-payroll-settings-grid">
                      <label className="se-payroll-settings-field">
                        <span>
                          Calculation
                        </span>

                        <select
                          value={
                            form.overtimeCalculationType
                          }
                          onChange={(
                            event
                          ) =>
                            change(
                              "overtimeCalculationType",
                              event
                                .target
                                .value
                            )
                          }
                        >
                          <option value="SALARY_BASED">
                            Salary Based
                          </option>

                          <option value="HOURLY_FIXED">
                            Fixed Hourly
                            Rate
                          </option>
                        </select>
                      </label>

                      {form.overtimeCalculationType ===
                        "HOURLY_FIXED" && (
                        <label className="se-payroll-settings-field">
                          <span>
                            Hourly Rate
                          </span>

                          <input
                            type="number"
                            min="0"
                            value={
                              form.overtimeFixedHourlyRate
                            }
                            onChange={(
                              event
                            ) =>
                              change(
                                "overtimeFixedHourlyRate",
                                event
                                  .target
                                  .value
                              )
                            }
                          />
                        </label>
                      )}

                      <label className="se-payroll-settings-field">
                        <span>
                          OT Multiplier
                        </span>

                        <input
                          type="number"
                          min="0"
                          step="0.25"
                          value={
                            form.overtimeMultiplier
                          }
                          onChange={(
                            event
                          ) =>
                            change(
                              "overtimeMultiplier",
                              event
                                .target
                                .value
                            )
                          }
                        />
                      </label>

                      <label className="se-payroll-settings-field">
                        <span>
                          Minimum OT
                          Minutes
                        </span>

                        <input
                          type="number"
                          min="0"
                          value={
                            form.overtimeMinimumMinutes
                          }
                          onChange={(
                            event
                          ) =>
                            change(
                              "overtimeMinimumMinutes",
                              event
                                .target
                                .value
                            )
                          }
                        />
                      </label>

                      <label className="se-payroll-settings-field">
                        <span>
                          Round OT To
                        </span>

                        <select
                          value={
                            form.overtimeRoundingMinutes
                          }
                          onChange={(
                            event
                          ) =>
                            change(
                              "overtimeRoundingMinutes",
                              event
                                .target
                                .value
                            )
                          }
                        >
                          <option value="0">
                            No rounding
                          </option>

                          <option value="15">
                            15 minutes
                          </option>

                          <option value="30">
                            30 minutes
                          </option>

                          <option value="60">
                            60 minutes
                          </option>
                        </select>
                      </label>
                    </div>

                    <div className="se-payroll-settings-note">
                      <strong>
                        Approval Control
                      </strong>

                      <span>
                        Attendance may
                        detect overtime,
                        but only approved
                        overtime should
                        become payable.
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* STATUTORY */}

            {activeSection ===
              "STATUTORY" && (
              <>
                <div className="se-payroll-settings__section-head">
                  <div>
                    <h3>
                      Statutory &
                      Deductions
                    </h3>

                    <p>
                      Enable deductions
                      applicable to your
                      payroll process.
                    </p>
                  </div>
                </div>

                <StatutoryCard
                  title="Provident Fund (PF)"
                  description="Enable PF deduction for payroll."
                  enabled={
                    form.pfEnabled
                  }
                  amount={
                    form.pfAmount
                  }
                  onEnabledChange={(
                    value
                  ) =>
                    change(
                      "pfEnabled",
                      value
                    )
                  }
                  onAmountChange={(
                    value
                  ) =>
                    change(
                      "pfAmount",
                      value
                    )
                  }
                />

                <StatutoryCard
                  title="ESI"
                  description="Enable ESI deduction for payroll."
                  enabled={
                    form.esiEnabled
                  }
                  amount={
                    form.esiAmount
                  }
                  onEnabledChange={(
                    value
                  ) =>
                    change(
                      "esiEnabled",
                      value
                    )
                  }
                  onAmountChange={(
                    value
                  ) =>
                    change(
                      "esiAmount",
                      value
                    )
                  }
                />

                <StatutoryCard
                  title="Professional Tax"
                  description="Enable professional tax deduction where applicable."
                  enabled={
                    form.professionalTaxEnabled
                  }
                  amount={
                    form.professionalTaxAmount
                  }
                  onEnabledChange={(
                    value
                  ) =>
                    change(
                      "professionalTaxEnabled",
                      value
                    )
                  }
                  onAmountChange={(
                    value
                  ) =>
                    change(
                      "professionalTaxAmount",
                      value
                    )
                  }
                />

                <StatutoryCard
                  title="TDS"
                  description="Enable configured TDS deduction."
                  enabled={
                    form.tdsEnabled
                  }
                  amount={
                    form.tdsAmount
                  }
                  onEnabledChange={(
                    value
                  ) =>
                    change(
                      "tdsEnabled",
                      value
                    )
                  }
                  onAmountChange={(
                    value
                  ) =>
                    change(
                      "tdsAmount",
                      value
                    )
                  }
                />

                <div className="se-payroll-settings-warning">
                  Statutory values are
                  configuration only.
                  Do not treat these
                  fields as a substitute
                  for the applicable
                  statutory calculation
                  rules.
                </div>
              </>
            )}

            {/* POLICIES */}

            {activeSection ===
              "POLICIES" && (
              <>
                <div className="se-payroll-settings__section-head se-payroll-settings__section-head--action">
                  <div>
                    <h3>
                      Payroll Policies
                    </h3>

                    <p>
                      Create and maintain
                      payroll policies.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="se-payroll-btn se-payroll-btn--primary"
                    onClick={
                      handleNewPolicy
                    }
                  >
                    + New Policy
                  </button>
                </div>

                <div className="se-payroll-policy-list">
                  {policies.length ? (
                    policies.map(
                      (policy) => (
                        <button
                          type="button"
                          key={
                            policy._id
                          }
                          className={`se-payroll-policy-item ${
                            String(
                              selectedPolicyId
                            ) ===
                            String(
                              policy._id
                            )
                              ? "is-selected"
                              : ""
                          }`}
                          onClick={() =>
                            handleSelectPolicy(
                              policy
                            )
                          }
                        >
                          <div className="se-payroll-policy-item__icon">
                            ₹
                          </div>

                          <div className="se-payroll-policy-item__main">
                            <strong>
                              {
                                policy.name
                              }
                            </strong>

                            <span>
                              {policy.companyCode ||
                                "Company payroll policy"}
                            </span>
                          </div>

                          <div className="se-payroll-policy-item__badges">
                            {policy.isDefault && (
                              <span className="is-default">
                                DEFAULT
                              </span>
                            )}

                            <span
                              className={
                                policy.active ===
                                false
                                  ? "is-inactive"
                                  : "is-active"
                              }
                            >
                              {policy.active ===
                              false
                                ? "INACTIVE"
                                : "ACTIVE"}
                            </span>
                          </div>

                          <span className="se-payroll-policy-item__arrow">
                            ›
                          </span>
                        </button>
                      )
                    )
                  ) : (
                    <div className="se-payroll-policy-empty">
                      <div>
                        ₹
                      </div>

                      <strong>
                        No payroll policy
                        yet
                      </strong>

                      <p>
                        Create your first
                        payroll policy to
                        begin monthly
                        payroll.
                      </p>

                      <button
                        type="button"
                        className="se-payroll-btn se-payroll-btn--primary"
                        onClick={
                          handleNewPolicy
                        }
                      >
                        + Create Policy
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </main>
        </div>

        {/* FOOTER */}

        {activeSection !==
          "POLICIES" && (
          <footer className="se-payroll-settings__footer">
            <div>
              {creating
                ? "Creating new payroll policy"
                : selectedPolicy
                ? `Editing ${selectedPolicy.name}`
                : "Payroll policy"}
            </div>

            <div className="se-payroll-settings__footer-actions">
              <button
                type="button"
                className="se-payroll-btn se-payroll-btn--secondary"
                onClick={
                  onClose
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="se-payroll-btn se-payroll-btn--primary"
                disabled={
  loading ||
  !form.name.trim() ||
  !form.companyCode
}
                onClick={
                  handleSave
                }
              >
                {loading
                  ? "Saving..."
                  : creating
                  ? "Create Policy"
                  : "Save Changes"}
              </button>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
};

/* =========================================================
   SETTING ROW
========================================================= */

const SettingRow = ({
  title,
  description,
  checked,
  onChange,
}) => (
  <div className="se-payroll-setting-row">
    <div>
      <strong>
        {title}
      </strong>

      <span>
        {description}
      </span>
    </div>

    <SettingToggle
      checked={checked}
      onChange={onChange}
    />
  </div>
);

/* =========================================================
   STATUTORY CARD
========================================================= */

const StatutoryCard = ({
  title,
  description,
  enabled,
  amount,
  onEnabledChange,
  onAmountChange,
}) => (
  <div className="se-payroll-settings-card se-payroll-statutory-card">
    <div className="se-payroll-statutory-card__top">
      <div>
        <strong>
          {title}
        </strong>

        <span>
          {description}
        </span>
      </div>

      <SettingToggle
        checked={enabled}
        onChange={
          onEnabledChange
        }
      />
    </div>

    {enabled && (
      <label className="se-payroll-settings-field se-payroll-statutory-card__amount">
        <span>
          Configured Monthly
          Amount
        </span>

        <div className="se-payroll-money-input">
          <i>₹</i>

          <input
            type="number"
            min="0"
            value={amount}
            placeholder="0"
            onChange={(
              event
            ) =>
              onAmountChange(
                event.target.value
              )
            }
          />
        </div>
      </label>
    )}
  </div>
);

export default PayrollSettingsModal;