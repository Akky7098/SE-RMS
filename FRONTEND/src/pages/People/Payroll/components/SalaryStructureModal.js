import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

const emptyForm = {
  effectiveFrom: "",
  policyId: "",
  basic: "",
  hra: "",
  conveyance: "",
  other: "",
  paymentMode: "BANK",
  overtimeEligible: false,
  overtimeRate: "",
  remarks: "",
};

const SalaryStructureModal = ({
  open,
  employee,
  policies = [],
  loading = false,
  onClose,
  onSubmit,
}) => {
  const [form, setForm] =
    useState(emptyForm);

  useEffect(() => {
    if (!open) return;

    setForm({
      ...emptyForm,
      policyId:
        policies.find(
          (item) => item.isDefault
        )?._id ||
        policies[0]?._id ||
        "",
    });
  }, [open, policies]);

  const change = (
    field,
    value
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const gross = useMemo(
    () =>
      ["basic", "hra", "conveyance", "other"]
        .reduce(
          (total, field) =>
            total +
            Number(form[field] || 0),
          0
        ),
    [form]
  );

  if (!open) return null;

  const submit = (event) => {
    event.preventDefault();

    const basic =
      Number(form.basic || 0);

    const hra =
      Number(form.hra || 0);

    const conveyance =
      Number(
        form.conveyance || 0
      );

    const other =
      Number(form.other || 0);

    onSubmit?.({
      employeeId:
        employee?._id,

      payload: {
        policyId:
          form.policyId,

        effectiveFrom:
          form.effectiveFrom,

        monthlyGross:
          gross,

        annualCTC:
          gross * 12,

        paymentMode:
          form.paymentMode,

        remarks:
          form.remarks,

        earnings: [
          {
            code: "BASIC",
            name: "Basic Salary",
            amount: basic,
            taxable: true,
            proratable: true,
          },
          {
            code: "HRA",
            name:
              "House Rent Allowance",
            amount: hra,
            taxable: true,
            proratable: true,
          },
          {
            code: "CONVEYANCE",
            name:
              "Conveyance Allowance",
            amount: conveyance,
            taxable: true,
            proratable: true,
          },
          {
            code: "OTHER",
            name:
              "Other Allowance",
            amount: other,
            taxable: true,
            proratable: true,
          },
        ],

        overtime: {
          eligible:
            form.overtimeEligible,

          calculationType:
            "HOURLY_FIXED",

          hourlyRate:
            Number(
              form.overtimeRate || 0
            ),

          multiplier: 1,
        },
      },
    });
  };

  return (
    <div className="se-payroll-modal-backdrop">
      <div className="se-payroll-modal se-payroll-modal--large">
        <div className="se-payroll-modal__header">
          <div>
            <span className="se-payroll-eyebrow">
              SALARY STRUCTURE
            </span>

            <h2>
              {employee?.fullName ||
                "Employee"}
            </h2>

            <p>
              {employee?.employeeCode ||
                ""}
              {employee?.designation
                ? ` · ${employee.designation}`
                : ""}
            </p>
          </div>

          <button
            type="button"
            className="se-payroll-modal__close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="se-payroll-form-grid">
            <label>
              <span>
                Effective From
              </span>

              <input
                type="date"
                required
                value={
                  form.effectiveFrom
                }
                onChange={(event) =>
                  change(
                    "effectiveFrom",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              <span>
                Payroll Policy
              </span>

              <select
                required
                value={
                  form.policyId
                }
                onChange={(event) =>
                  change(
                    "policyId",
                    event.target.value
                  )
                }
              >
                <option value="">
                  Select policy
                </option>

                {policies.map(
                  (policy) => (
                    <option
                      key={policy._id}
                      value={policy._id}
                    >
                      {policy.name}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              <span>
                Basic Salary
              </span>

              <input
                type="number"
                min="0"
                required
                value={form.basic}
                onChange={(event) =>
                  change(
                    "basic",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              <span>HRA</span>

              <input
                type="number"
                min="0"
                required
                value={form.hra}
                onChange={(event) =>
                  change(
                    "hra",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              <span>
                Conveyance
              </span>

              <input
                type="number"
                min="0"
                required
                value={
                  form.conveyance
                }
                onChange={(event) =>
                  change(
                    "conveyance",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              <span>
                Other Allowance
              </span>

              <input
                type="number"
                min="0"
                required
                value={form.other}
                onChange={(event) =>
                  change(
                    "other",
                    event.target.value
                  )
                }
              />
            </label>
          </div>

          <div className="se-payroll-salary-total">
            <span>
              Gross Monthly Salary
            </span>

            <strong>
              ₹
              {gross.toLocaleString(
                "en-IN"
              )}
            </strong>

            <small>
              Annual: ₹
              {(gross * 12).toLocaleString(
                "en-IN"
              )}
            </small>
          </div>

          <div className="se-payroll-ot-config">
            <label className="se-payroll-checkbox">
              <input
                type="checkbox"
                checked={
                  form.overtimeEligible
                }
                onChange={(event) =>
                  change(
                    "overtimeEligible",
                    event.target.checked
                  )
                }
              />

              <span>
                Employee is eligible for
                overtime
              </span>
            </label>

            {form.overtimeEligible && (
              <label>
                <span>
                  OT Rate / Hour
                </span>

                <input
                  type="number"
                  min="0"
                  value={
                    form.overtimeRate
                  }
                  onChange={(event) =>
                    change(
                      "overtimeRate",
                      event.target.value
                    )
                  }
                />
              </label>
            )}
          </div>

          <div className="se-payroll-modal__footer">
            <button
              type="button"
              className="se-payroll-btn se-payroll-btn--secondary"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="se-payroll-btn se-payroll-btn--primary"
              disabled={loading}
            >
              {loading
                ? "Saving..."
                : "Save Salary Structure"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SalaryStructureModal;