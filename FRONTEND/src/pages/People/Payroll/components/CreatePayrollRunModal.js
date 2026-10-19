import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

/* =========================================================
   COMPANY OPTIONS

   These values match Employee.companyCode exactly.

   IMPORTANT:
   value = database companyCode
   label = human-readable company name
========================================================= */

const COMPANY_OPTIONS = [
  {
    value:
      "SANDEEP_EDGETECH",
    label:
      "Sandeep Edge Tech",
  },
  {
    value:
      "SANDEEP_ENTERPRISES",
    label:
      "Sandeep Enterprises",
  },
  {
    value:
      "VANIJA",
    label:
      "Vanija",
  },
  {
    value:
      "VESS",
    label:
      "VESS",
  },
  {
    value:
      "SI",
    label:
      "SI",
  },
  {
    value:
      "FERMECH",
    label:
      "Fermech",
  },
  {
    value:
      "SF",
    label:
      "SF",
  },
  {
    value:
      "MULTIPACK",
    label:
      "Multipack",
  },
];

/* =========================================================
   COMPONENT
========================================================= */

const CreatePayrollRunModal = ({
  open,

  payrollMonth,

  policies = [],

  companyCode = "",

  loading = false,

  onClose,

  onSubmit,
}) => {
  /* =======================================================
     FORM STATE
  ======================================================= */

  const [
    form,
    setForm,
  ] = useState({
    payrollMonth:
      payrollMonth || "",

    companyCode:
      companyCode || "",

    policyId: "",

    notes: "",
  });

  /* =======================================================
     DEFAULT POLICY
  ======================================================= */

  const defaultPolicyId =
    useMemo(() => {
      const defaultPolicy =
        policies.find(
          (item) =>
            item?.isDefault ===
            true
        );

      return (
        defaultPolicy?._id ||
        policies?.[0]?._id ||
        ""
      );
    }, [policies]);

  /* =======================================================
     RESET WHEN MODAL OPENS
  ======================================================= */

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm({
      payrollMonth:
        payrollMonth || "",

      companyCode:
        companyCode || "",

      policyId:
        defaultPolicyId,

      notes: "",
    });
  }, [
    open,
    payrollMonth,
    companyCode,
    defaultPolicyId,
  ]);

  /* =======================================================
     SELECTED COMPANY
  ======================================================= */

  const selectedCompany =
    useMemo(
      () =>
        COMPANY_OPTIONS.find(
          (company) =>
            company.value ===
            form.companyCode
        ) || null,
      [form.companyCode]
    );

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

        [field]:
          value,
      })
    );
  };

  /* =======================================================
     CLOSE
  ======================================================= */

  const closeModal = () => {
    if (loading) {
      return;
    }

    onClose?.();
  };

  /* =======================================================
     SUBMIT
  ======================================================= */

  const submit = (
    event
  ) => {
    event.preventDefault();

    if (
      loading
    ) {
      return;
    }

    if (
      !form.payrollMonth ||
      !form.companyCode ||
      !form.policyId
    ) {
      return;
    }

    /*
     * Send companyCode only.
     *
     * Do NOT send the display company name.
     * Backend/Employee Master uses companyCode.
     */

    onSubmit?.({
      payrollMonth:
        form.payrollMonth,

      companyCode:
        form.companyCode,

      policyId:
        form.policyId,

      notes:
        form.notes?.trim() ||
        "",
    });
  };

  /* =======================================================
     DON'T RENDER WHEN CLOSED
  ======================================================= */

  if (!open) {
    return null;
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div
      className="se-payroll-modal-backdrop"
      role="presentation"
      onMouseDown={(
        event
      ) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          closeModal();
        }
      }}
    >
      <div
        className="se-payroll-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-payroll-title"
      >
        {/* ===============================================
            HEADER
        =============================================== */}

        <div className="se-payroll-modal__header">
          <div>
            <div className="se-payroll-modal__eyebrow">
              MONTHLY PAYROLL
            </div>

            <h2
              id="create-payroll-title"
            >
              Create Payroll
            </h2>

            <p>
              Start a new monthly
              payroll run for one
              company.
            </p>
          </div>

          <button
            type="button"
            className="se-payroll-modal__close"
            onClick={
              closeModal
            }
            disabled={
              loading
            }
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* ===============================================
            FORM
        =============================================== */}

        <form
          onSubmit={
            submit
          }
        >
          <div className="se-payroll-form-grid">

            {/* ===========================================
                PAYROLL MONTH
            =========================================== */}

            <label>
              <span>
                Payroll Month
              </span>

              <input
                type="month"
                required
                value={
                  form.payrollMonth
                }
                disabled={
                  loading
                }
                onChange={(
                  event
                ) =>
                  change(
                    "payrollMonth",
                    event.target
                      .value
                  )
                }
              />
            </label>

            {/* ===========================================
                COMPANY
            =========================================== */}

            <label>
              <span>
                Company
              </span>

              <select
                required
                value={
                  form.companyCode
                }
                disabled={
                  loading
                }
                onChange={(
                  event
                ) =>
                  change(
                    "companyCode",
                    event.target
                      .value
                  )
                }
              >
                <option value="">
                  Select company
                </option>

                {COMPANY_OPTIONS.map(
                  (
                    company
                  ) => (
                    <option
                      key={
                        company.value
                      }
                      value={
                        company.value
                      }
                    >
                      {
                        company.label
                      }
                    </option>
                  )
                )}
              </select>
            </label>

            {/* ===========================================
                SELECTED COMPANY INFO
            =========================================== */}

            {selectedCompany && (
              <div className="se-payroll-form-full se-payroll-company-info">
                <div className="se-payroll-company-info__icon">
                  C
                </div>

                <div>
                  <strong>
                    {
                      selectedCompany.label
                    }
                  </strong>

                  <span>
                    Employee company code:{" "}
                    {
                      selectedCompany.value
                    }
                  </span>
                </div>
              </div>
            )}

            {/* ===========================================
                PAYROLL POLICY
            =========================================== */}

            <label className="se-payroll-form-full">
              <span>
                Payroll Policy
              </span>

              <select
                required
                value={
                  form.policyId
                }
                disabled={
                  loading
                }
                onChange={(
                  event
                ) =>
                  change(
                    "policyId",
                    event.target
                      .value
                  )
                }
              >
                <option value="">
                  Select policy
                </option>

                {policies.map(
                  (
                    policy
                  ) => (
                    <option
                      key={
                        policy._id
                      }
                      value={
                        policy._id
                      }
                    >
                      {
                        policy.name
                      }

                      {policy.isDefault
                        ? " — Default"
                        : ""}
                    </option>
                  )
                )}
              </select>

              {policies.length ===
                0 && (
                <small className="se-payroll-form-hint se-payroll-form-hint--warning">
                  No payroll
                  policy is
                  available. Create
                  a payroll policy
                  before creating
                  payroll.
                </small>
              )}
            </label>

            {/* ===========================================
                NOTES
            =========================================== */}

            <label className="se-payroll-form-full">
              <span>
                Notes
                <em>
                  Optional
                </em>
              </span>

              <textarea
                rows="3"
                value={
                  form.notes
                }
                disabled={
                  loading
                }
                placeholder="Example: September 2026 regular payroll"
                onChange={(
                  event
                ) =>
                  change(
                    "notes",
                    event.target
                      .value
                  )
                }
              />
            </label>

            {/* ===========================================
                EXPLANATION
            =========================================== */}

            <div className="se-payroll-form-full se-payroll-create-note">
              <strong>
                What happens next?
              </strong>

              <p>
                Creating this payroll
                run does not finalize
                or pay salaries. It
                creates a draft for
                the selected company
                and month. Salary,
                attendance,
                adjustments and
                exceptions can then
                be reviewed before
                approval and
                finalization.
              </p>
            </div>
          </div>

          {/* =============================================
              FOOTER
          ============================================= */}

          <div className="se-payroll-modal__footer">
            <button
              type="button"
              className="se-payroll-btn se-payroll-btn--secondary"
              onClick={
                closeModal
              }
              disabled={
                loading
              }
            >
              Cancel
            </button>

            <button
              type="submit"
              className="se-payroll-btn se-payroll-btn--primary"
              disabled={
                loading ||
                !form.payrollMonth ||
                !form.companyCode ||
                !form.policyId
              }
            >
              {loading
                ? "Creating..."
                : "Create Payroll"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePayrollRunModal;