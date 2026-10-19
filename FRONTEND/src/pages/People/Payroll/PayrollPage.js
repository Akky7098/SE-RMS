import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import "./Payroll.css";

import {
  approvePayrollRun,
  createPayrollAdjustment,
  createPayrollPolicy,
  createPayrollRun,
  createSalaryStructure,
  finalizePayrollRun,
  generatePayrollRun,
  getEmployeePayroll,
  getPayrollPolicies,
  getPayrollRegister,
  getPayrollRun,
  getPayrollRuns,
  reviewEmployeePayroll,
  submitPayrollRun,
  updatePayrollPolicy,
} from "../../../services/payrollService";

import PayrollHeader from "./components/PayrollHeader";
import PayrollSummary from "./components/PayrollSummary";
import PayrollRunTable from "./components/PayrollRunTable";
import PayrollRunDetail from "./components/PayrollRunDetail.js";
import PayrollRegister from "./components/PayrollRegister";
import EmployeePayrollDrawer from "./components/EmployeePayrollDrawer";
import SalaryStructureModal from "./components/SalaryStructureModal";
import PayrollAdjustmentModal from "./components/PayrollAdjustmentModal";
import CreatePayrollRunModal from "./components/CreatePayrollRunModal";
import PayrollConfirmModal from "./components/PayrollConfirmModal";
import PayrollSettingsModal from "./components/PayrollSettingsModal";

import {
  getEmployees,
} from "../../../services/employeeService";

import {
  getActiveDepartments,
} from "../../../services/departmentService";

import {
  getActiveOffices,
} from "../../../services/manpowerService";

/* =========================================================
   HELPERS
========================================================= */

const currentPayrollMonth = () => {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}`;
};

const arrayOf = (
  result
) => {
  if (
    Array.isArray(
      result
    )
  ) {
    return result;
  }

  const data =
    result?.data ??
    result;

  if (
    Array.isArray(
      data
    )
  ) {
    return data;
  }

  return (
    data?.items ||
    data?.records ||
    data?.runs ||
    data?.policies ||
    data?.employees ||
    []
  );
};

const objectOf = (
  result
) =>
  result?.data?.data ||
  result?.data ||
  result ||
  null;

const messageOf = (
  error
) =>
  error?.message ||
  error?.response?.data
    ?.message ||
  "Something went wrong.";

/* =========================================================
   PAGE
========================================================= */

const PayrollPage = () => {
  const [registerFilter, setRegisterFilter] = useState("ALL");

  const [
    payrollMonth,
    setPayrollMonth,
  ] =
    useState(
      currentPayrollMonth()
    );

  const [
    runs,
    setRuns,
  ] =
    useState([]);

 const [
  policies,
  setPolicies,
] =
  useState([]);

const [
  payrollEmployees,
  setPayrollEmployees,
] =
  useState([]);

const [
  payrollDepartments,
  setPayrollDepartments,
] =
  useState([]);

const [
  payrollOffices,
  setPayrollOffices,
] =
  useState([]);

  const [
    selectedRun,
    setSelectedRun,
  ] =
    useState(null);

  const [
    register,
    setRegister,
  ] =
    useState([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    registerLoading,
    setRegisterLoading,
  ] =
    useState(false);

  const [
    actionLoading,
    setActionLoading,
  ] =
    useState(false);

  const [
    employeeLoading,
    setEmployeeLoading,
  ] =
    useState(false);

  const [
    employeeSaving,
    setEmployeeSaving,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    success,
    setSuccess,
  ] =
    useState("");

  /* =======================================================
     MODALS / DRAWER
  ======================================================= */

   const [
    createOpen,
    setCreateOpen,
  ] =
    useState(false);

  const [
    settingsOpen,
    setSettingsOpen,
  ] =
    useState(false);

  const [
    employeeDrawerOpen,
    setEmployeeDrawerOpen,
  ] =
    useState(false);

  const [
    selectedEmployeePayroll,
    setSelectedEmployeePayroll,
  ] =
    useState(null);

  const [
    salaryModalOpen,
    setSalaryModalOpen,
  ] =
    useState(false);

  const [
    salaryEmployee,
    setSalaryEmployee,
  ] =
    useState(null);

  const [
    adjustmentOpen,
    setAdjustmentOpen,
  ] =
    useState(false);

  const [
    adjustmentEmployee,
    setAdjustmentEmployee,
  ] =
    useState(null);

  const [
    confirm,
    setConfirm,
  ] =
    useState({
      open: false,
      type: "",
      title: "",
      message: "",
      confirmText:
        "Confirm",
      danger: false,
      run: null,
    });

  /* =======================================================
     NOTICES
  ======================================================= */

  const clearMessages =
    () => {
      setError("");
      setSuccess("");
    };

  const showSuccess =
    (message) => {
      setError("");
      setSuccess(
        message
      );
    };

  const showError =
    (err) => {
      setSuccess("");
      setError(
        messageOf(err)
      );
    };


    /* =======================================================
   LOAD PAYROLL MASTER DATA

   Reuses existing SE-RMS master APIs.
   No duplicate Payroll APIs.
======================================================= */

const loadPayrollMasterData =
  useCallback(
    async () => {
      try {
        const [
          employeeResult,
          departmentResult,
          officeResult,
        ] =
          await Promise.all([
            getEmployees({
              status:
                "ACTIVE",

              limit:
                1000,
            }),

            getActiveDepartments(),

            getActiveOffices(),
          ]);

        setPayrollEmployees(
          Array.isArray(
            employeeResult
          )
            ? employeeResult
            : employeeResult
                ?.records ||
              []
        );

        setPayrollDepartments(
          Array.isArray(
            departmentResult
          )
            ? departmentResult
            : []
        );

        setPayrollOffices(
          Array.isArray(
            officeResult
          )
            ? officeResult
            : []
        );
      } catch (err) {
        console.error(
          "Payroll master data load failed:",
          err
        );

        setPayrollEmployees(
          []
        );

        setPayrollDepartments(
          []
        );

        setPayrollOffices(
          []
        );
      }
    },
    []
  );

  /* =======================================================
     LOAD POLICIES
  ======================================================= */

  const loadPolicies =
    useCallback(
      async () => {
        try {
                  const result =
          await getPayrollPolicies();

          setPolicies(
            arrayOf(
              result
            )
          );
        } catch (err) {
          console.error(
            "Payroll policies load failed:",
            err
          );
        }
      },
      []
  );

  /* =======================================================
     CREATE PAYROLL POLICY
  ======================================================= */

  const handleCreatePolicy =
    async (payload) => {
      setActionLoading(
        true
      );

      clearMessages();

      try {
        await createPayrollPolicy(
          payload
        );

        await loadPolicies();

        showSuccess(
          "Payroll policy created successfully."
        );

        setSettingsOpen(
          false
        );
      } catch (err) {
        showError(
          err
        );
      } finally {
        setActionLoading(
          false
        );
      }
    };

  /* =======================================================
     UPDATE PAYROLL POLICY
  ======================================================= */

  const handleUpdatePolicy =
    async (
      policyId,
      payload
    ) => {
      if (!policyId) {
        return;
      }

      setActionLoading(
        true
      );

      clearMessages();

      try {
        await updatePayrollPolicy(
          policyId,
          payload
        );

        await loadPolicies();

        showSuccess(
          "Payroll policy updated successfully."
        );

        setSettingsOpen(
          false
        );
      } catch (err) {
        showError(
          err
        );
      } finally {
        setActionLoading(
          false
        );
      }
    };

  /* =======================================================
     LOAD RUNS
  ======================================================= */

  const loadRuns =
    useCallback(
      async ({
        preserveSelection =
          true,
      } = {}) => {
        const result =
          await getPayrollRuns({
            payrollMonth:
              payrollMonth ||
              undefined,
          });

        const items =
          arrayOf(
            result
          );

        setRuns(
          items
        );

        let nextRun =
          null;

        if (
          preserveSelection &&
          selectedRun?._id
        ) {
          nextRun =
            items.find(
              (item) =>
                String(
                  item._id
                ) ===
                String(
                  selectedRun._id
                )
            ) ||
            null;
        }

        if (
          !nextRun
        ) {
          nextRun =
            items[0] ||
            null;
        }

        setSelectedRun(
          nextRun
        );

        if (
          !nextRun
        ) {
          setRegister(
            []
          );
        }

        return nextRun;
      },
      [
        payrollMonth,
        selectedRun?._id,
      ]
    );

  /* =======================================================
     LOAD RUN DETAIL
  ======================================================= */

  const loadRunDetail =
    useCallback(
      async (
        runId
      ) => {
        if (
          !runId
        ) {
          return null;
        }

        const result =
          await getPayrollRun(
            runId
          );

        const run =
          objectOf(
            result
          );

        if (
          run?._id
        ) {
          setSelectedRun(
            run
          );

          setRuns(
            (
              current
            ) =>
              current.map(
                (item) =>
                  String(
                    item._id
                  ) ===
                  String(
                    run._id
                  )
                    ? {
                        ...item,
                        ...run,
                      }
                    : item
              )
          );
        }

        return run;
      },
      []
    );

  /* =======================================================
     LOAD REGISTER
  ======================================================= */

  const loadRegister =
    useCallback(
      async (
        runId
      ) => {
        if (
          !runId
        ) {
          setRegister(
            []
          );

          return;
        }

        setRegisterLoading(
          true
        );

        try {
          const result =
            await getPayrollRegister(
              runId,
              {
                limit:
                  1000,
              }
            );

          setRegister(
            arrayOf(
              result
            )
          );
        } catch (err) {
          setRegister(
            []
          );

          showError(
            err
          );
        } finally {
          setRegisterLoading(
            false
          );
        }
      },
      []
    );

  /* =======================================================
     INITIAL / MONTH LOAD
  ======================================================= */

  const refreshPage =
    useCallback(
      async () => {
        setLoading(
          true
        );

        clearMessages();

        try {
  await Promise.all([
    loadPolicies(),
    loadPayrollMasterData(),
  ]);

  const run =
    await loadRuns({
      preserveSelection: false,
    });

          if (
            run?._id
          ) {
            const detail =
              await loadRunDetail(
                run._id
              );

            await loadRegister(
              detail?._id ||
              run._id
            );
          }
        } catch (err) {
          showError(
            err
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
  loadPolicies,
  loadPayrollMasterData,
  loadRuns,
  loadRunDetail,
  loadRegister,
]
    );

  useEffect(() => {
    refreshPage();
  }, [
    payrollMonth,
    refreshPage,
  ]);

  /* =======================================================
     SELECT RUN
  ======================================================= */

  const handleOpenRun =
    async (run) => {
      if (
        !run?._id
      ) {
        return;
      }

      clearMessages();

      setSelectedRun(
        run
      );

      setRegisterLoading(
        true
      );

      try {
        const detail =
          await loadRunDetail(
            run._id
          );

        await loadRegister(
          detail?._id ||
          run._id
        );
      } catch (err) {
        showError(
          err
        );
      } finally {
        setRegisterLoading(
          false
        );
      }
    };

  /* =======================================================
     CREATE RUN
  ======================================================= */

  const handleCreateRun =
    async (
      form
    ) => {
      setActionLoading(
        true
      );

      clearMessages();

      try {
        const result =
          await createPayrollRun(
            form
          );

        const created =
          objectOf(
            result
          );

        setCreateOpen(
          false
        );

        showSuccess(
          "Payroll run created successfully."
        );

        const run =
          await loadRuns({
            preserveSelection:
              false,
          });

        const target =
          created?._id
            ? created
            : run;

        if (
          target?._id
        ) {
          await handleOpenRun(
            target
          );
        }
      } catch (err) {
        showError(
          err
        );
      } finally {
        setActionLoading(
          false
        );
      }
    };

  /* =======================================================
     WORKFLOW CONFIRMATION
  ======================================================= */

  const requestWorkflow =
    (
      type,
      run
    ) => {
      if (
        !run?._id
      ) {
        return;
      }

      const config = {
        GENERATE: {
          title:
            "Generate Payroll?",
          message:
            "Attendance, leave, salary structure, approved adjustments and applicable overtime will be used to calculate this payroll.",
          confirmText:
            "Generate Payroll",
          danger:
            false,
        },

        SUBMIT: {
          title:
            "Submit Payroll for Review?",
          message:
            "The generated payroll will move to the review and approval stage.",
          confirmText:
            "Submit for Review",
          danger:
            false,
        },

        APPROVE: {
          title:
            "Approve Payroll?",
          message:
            "Confirm that the monthly payroll has been reviewed and is ready for finalization.",
          confirmText:
            "Approve Payroll",
          danger:
            false,
        },

        FINALIZE: {
          title:
            "Finalize & Lock Payroll?",
          message:
            "This will lock the approved payroll. It should not be recalculated or silently changed after finalization.",
          confirmText:
            "Finalize & Lock",
          danger:
            true,
        },
      };

      setConfirm({
        open:
          true,

        type,

        run,

        ...config[
          type
        ],
      });
    };

  const executeWorkflow =
    async () => {
      const run =
        confirm.run;

      if (
        !run?._id
      ) {
        return;
      }

      setActionLoading(
        true
      );

      clearMessages();

      try {
        switch (
          confirm.type
        ) {
          case "GENERATE":
            await generatePayrollRun(
              run._id
            );

            showSuccess(
              "Payroll generated successfully."
            );
            break;

          case "SUBMIT":
            await submitPayrollRun(
              run._id
            );

            showSuccess(
              "Payroll submitted for review."
            );
            break;

          case "APPROVE":
            await approvePayrollRun(
              run._id
            );

            showSuccess(
              "Payroll approved successfully."
            );
            break;

          case "FINALIZE":
            await finalizePayrollRun(
              run._id
            );

            showSuccess(
              "Payroll finalized and locked."
            );
            break;

          default:
            return;
        }

        setConfirm(
          (
            current
          ) => ({
            ...current,
            open:
              false,
          })
        );

        const updated =
          await loadRunDetail(
            run._id
          );

        await loadRegister(
          updated?._id ||
          run._id
        );

        await loadRuns({
          preserveSelection:
            true,
        });
      } catch (err) {
        showError(
          err
        );
      } finally {
        setActionLoading(
          false
        );
      }
    };

  /* =======================================================
     OPEN EMPLOYEE PAYROLL
  ======================================================= */

  const handleOpenEmployee =
    async (
      row
    ) => {
      if (
        !selectedRun?._id
      ) {
        return;
      }

      const employeeId =
        row?.employeeId ||
        row?.employeeSnapshot
          ?.employeeId ||
        row?.employee?._id;

      setSelectedEmployeePayroll(
        row
      );

      setEmployeeDrawerOpen(
        true
      );

      if (
        !employeeId
      ) {
        return;
      }

      setEmployeeLoading(
        true
      );

      try {
        const result =
          await getEmployeePayroll(
            selectedRun._id,
            employeeId
          );

        setSelectedEmployeePayroll(
          objectOf(
            result
          ) ||
          row
        );
      } catch (err) {
        showError(
          err
        );
      } finally {
        setEmployeeLoading(
          false
        );
      }
    };

  /* =======================================================
     SAVE EMPLOYEE REVIEW
  ======================================================= */

  const handleSaveEmployeeReview =
    async (
      payload
    ) => {
      if (
        !selectedRun?._id ||
        !selectedEmployeePayroll
      ) {
        return;
      }

      const employeeId =
        selectedEmployeePayroll
          .employeeId ||
        selectedEmployeePayroll
          .employeeSnapshot
          ?.employeeId ||
        selectedEmployeePayroll
          .employee?._id;

      if (
        !employeeId
      ) {
        showError(
          new Error(
            "Employee ID is missing from payroll record."
          )
        );

        return;
      }

      setEmployeeSaving(
        true
      );

      clearMessages();

      try {
        const result =
          await reviewEmployeePayroll(
            selectedRun._id,
            employeeId,
            payload
          );

        const updated =
          objectOf(
            result
          );

        if (
          updated
        ) {
          setSelectedEmployeePayroll(
            updated
          );
        }

        await loadRegister(
          selectedRun._id
        );

        await loadRunDetail(
          selectedRun._id
        );

        showSuccess(
          "Employee payroll review saved."
        );
      } catch (err) {
        showError(
          err
        );
      } finally {
        setEmployeeSaving(
          false
        );
      }
    };

  /* =======================================================
     ADJUSTMENT
  ======================================================= */

  const handleOpenAdjustment =
    (record) => {
      setAdjustmentEmployee(
        record
      );

      setAdjustmentOpen(
        true
      );
    };

  const handleCreateAdjustment =
    async (
      payload
    ) => {
      setActionLoading(
        true
      );

      clearMessages();

      try {
        await createPayrollAdjustment(
          payload
        );

        setAdjustmentOpen(
          false
        );

        showSuccess(
          "Payroll adjustment added successfully."
        );

        if (
          selectedRun?._id
        ) {
          await loadRegister(
            selectedRun._id
          );

          await loadRunDetail(
            selectedRun._id
          );
        }
      } catch (err) {
        showError(
          err
        );
      } finally {
        setActionLoading(
          false
        );
      }
    };

  /* =======================================================
     SALARY STRUCTURE
  ======================================================= */

  const handleOpenSalaryStructure =
    (record) => {
      const snapshot =
        record
          ?.employeeSnapshot ||
        record
          ?.employee ||
        record ||
        {};

      setSalaryEmployee({
        _id:
          record?.employeeId ||
          snapshot.employeeId ||
          snapshot._id,

        fullName:
          snapshot.employeeName ||
          snapshot.fullName ||
          "Employee",

        employeeCode:
          snapshot.employeeCode ||
          "",

        designation:
          snapshot.designation ||
          "",
      });

      setSalaryModalOpen(
        true
      );
    };

  const handleCreateSalaryStructure =
    async ({
      employeeId,
      payload,
    }) => {
      if (
        !employeeId
      ) {
        showError(
          new Error(
            "Employee ID is missing."
          )
        );

        return;
      }

      setActionLoading(
        true
      );

      clearMessages();

      try {
        await createSalaryStructure(
          employeeId,
          payload
        );

        setSalaryModalOpen(
          false
        );

        showSuccess(
          "Salary structure saved successfully."
        );
      } catch (err) {
        showError(
          err
        );
      } finally {
        setActionLoading(
          false
        );
      }
    };

  /* =======================================================
     DERIVED DATA
  ======================================================= */

  const activeRun =
    useMemo(
      () =>
        selectedRun ||
        null,
      [selectedRun]
    );

  const isLocked =
    activeRun?.status ===
      "FINALIZED" ||
    activeRun?.locked ===
      true;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="se-payroll-page">
            <PayrollHeader
  payrollMonth={
    payrollMonth
  }
  onMonthChange={
    setPayrollMonth
  }
  onCreateRun={() =>
    setCreateOpen(
      true
    )
  }
  onRefresh={
    refreshPage
  }
  refreshing={
    loading
  }
  onOpenSettings={() =>
    setSettingsOpen(
      true
    )
  }
  activeRun={
    activeRun
  }
  actionLoading={
    actionLoading
  }
  onGenerate={(run) =>
    requestWorkflow(
      "GENERATE",
      run
    )
  }
/>

      {/* <div className="se-payroll-settings-launch">
        <button
          type="button"
          className="se-payroll-settings-launch__button"
          onClick={() =>
            setSettingsOpen(
              true
            )
          }
        >
          <span className="se-payroll-settings-launch__icon">
            ⚙
          </span>

          <span>
            <strong>
              Payroll Settings
            </strong>

            <small>
              Policy, attendance, OT
              & statutory rules
            </small>
          </span>

          <i>›</i>
        </button>
      </div> */}

      {error && (
        <div className="se-payroll-alert se-payroll-alert--error">
          <div>
            <strong>
              Payroll Error
            </strong>

            <span>
              {error}
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="se-payroll-alert se-payroll-alert--success">
          <div>
            <strong>
              Updated
            </strong>

            <span>
              {success}
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              setSuccess("")
            }
          >
            ×
          </button>
        </div>
      )}

      <PayrollSummary
        filter={registerFilter}
        onFilterChange={setRegisterFilter}
        run={
          activeRun
        }
        loading={
          loading
        }
      />

    <div className="se-payroll-dashboard">
  <div className="se-payroll-dashboard__top">
    <div className="se-payroll-dashboard__runs">
      <PayrollRunTable
        runs={
          runs
        }
        loading={
          loading
        }
        selectedRunId={
          activeRun?._id
        }
        onOpen={
          handleOpenRun
        }
      />
    </div>

    <div className="se-payroll-dashboard__active">
      {!activeRun &&
      !loading ? (
        <section className="se-payroll-empty-state">
          <div className="se-payroll-empty-state__icon">
            ₹
          </div>

          <h2>
            No payroll for{" "}
            {payrollMonth}
          </h2>

          

          <button
            type="button"
            className="se-payroll-btn se-payroll-btn--primary"
            onClick={() =>
              setCreateOpen(
                true
              )
            }
          >
            + Create Payroll
          </button>
        </section>
      ) : (
        activeRun && (
          <PayrollRunDetail
            run={
              activeRun
            }
            busy={
              actionLoading
            }
            onSubmit={(
              run
            ) =>
              requestWorkflow(
                "SUBMIT",
                run
              )
            }
            onApprove={(
              run
            ) =>
              requestWorkflow(
                "APPROVE",
                run
              )
            }
            onFinalize={(
              run
            ) =>
              requestWorkflow(
                "FINALIZE",
                run
              )
            }
          />
        )
      )}
    </div>
  </div>

  {activeRun && (
    <PayrollRegister
      filter={registerFilter}
      onFilterChange={setRegisterFilter}
      records={
        register
      }
      loading={
        registerLoading
      }
      onOpenEmployee={
        handleOpenEmployee
      }
    />
  )}
</div>

      {/* ===================================================
          CREATE PAYROLL
      ==================================================== */}

          <CreatePayrollRunModal
      open={
        createOpen
      }
      payrollMonth={
        payrollMonth
      }
      policies={
        policies.filter(
          (policy) =>
            policy.active !==
            false
        )
      }
      companyCode="SANDEEP_ENTERPRISES"
      loading={
        actionLoading
      }
      onClose={() =>
        setCreateOpen(
          false
        )
      }
      onSubmit={
        handleCreateRun
      }
    />

    {/* ===================================================
        PAYROLL SETTINGS
    ==================================================== */}

    <PayrollSettingsModal
      open={
        settingsOpen
      }
      policies={
        policies
      }
      companyCode="SANDEEP_ENTERPRISES"
      loading={
        actionLoading
      }
      onClose={() =>
        setSettingsOpen(
          false
        )
      }
      onCreatePolicy={
        handleCreatePolicy
      }
      onUpdatePolicy={
        handleUpdatePolicy
      }
    />

    {/* ===================================================
        EMPLOYEE DRAWER
    ==================================================== */}
      <EmployeePayrollDrawer
        open={
          employeeDrawerOpen
        }
        record={
          selectedEmployeePayroll
        }
        loading={
          employeeLoading
        }
        saving={
          employeeSaving
        }
        locked={
          isLocked
        }
        onClose={() => {
          setEmployeeDrawerOpen(
            false
          );

          setSelectedEmployeePayroll(
            null
          );
        }}
        onSaveReview={
          handleSaveEmployeeReview
        }
        onAddAdjustment={
          handleOpenAdjustment
        }
        onSalaryStructure={
          handleOpenSalaryStructure
        }
      />

      {/* ===================================================
          SALARY STRUCTURE
      ==================================================== */}

      <SalaryStructureModal
        open={
          salaryModalOpen
        }
        employee={
          salaryEmployee
        }
        policies={
          policies
        }
        loading={
          actionLoading
        }
        onClose={() =>
          setSalaryModalOpen(
            false
          )
        }
        onSubmit={
          handleCreateSalaryStructure
        }
      />

      {/* ===================================================
          ADJUSTMENT
      ==================================================== */}

      <PayrollAdjustmentModal
        open={
          adjustmentOpen
        }
        employee={
          adjustmentEmployee
            ?.employeeSnapshot ||
          adjustmentEmployee
        }
        payrollMonth={
          activeRun
            ?.payrollMonth ||
          payrollMonth
        }
        loading={
          actionLoading
        }
        onClose={() =>
          setAdjustmentOpen(
            false
          )
        }
        onSubmit={
          handleCreateAdjustment
        }
      />

      {/* ===================================================
          CONFIRMATION
      ==================================================== */}

      <PayrollConfirmModal
        open={
          confirm.open
        }
        title={
          confirm.title
        }
        message={
          confirm.message
        }
        confirmText={
          confirm.confirmText
        }
        danger={
          confirm.danger
        }
        loading={
          actionLoading
        }
        onCancel={() =>
          setConfirm(
            (
              current
            ) => ({
              ...current,
              open:
                false,
            })
          )
        }
        onConfirm={
          executeWorkflow
        }
      />
    </div>
  );
};

export default PayrollPage;