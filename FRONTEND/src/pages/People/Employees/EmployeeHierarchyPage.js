import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  getEmployees,
  getReportingTree,
  updateEmployee,
} from "../../../services/employeeService";

import "./Employees.css";


/* =========================================================
   HELPERS
========================================================= */

const pretty = (value) => {
  if (!value) {
    return "Not assigned";
  }

  return String(value)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
};


const initials = (name) => {
  const parts = String(
    name || "Employee"
  )
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return "E";
  }

  if (parts.length === 1) {
    return parts[0]
      .charAt(0)
      .toUpperCase();
  }

  return (
    parts[0].charAt(0) +
    parts[parts.length - 1].charAt(0)
  ).toUpperCase();
};


const employeeIdOf = (
  employee
) =>
  employee?._id ||
  employee?.id ||
  "";


const departmentName = (
  employee
) =>
  employee?.department?.name ||
  employee?.departmentName ||
  employee?.orgUnit?.name ||
  employee?.orgUnitName ||
  employee?.orgUnitCode ||
  "Organisation";


const getManagerObject = (
  employee
) => {
  const reportsTo =
    employee?.reportsTo;

  const reportingManager =
    employee?.reportingManager;

  if (
    reportsTo &&
    typeof reportsTo === "object"
  ) {
    return reportsTo;
  }

  if (
    reportingManager &&
    typeof reportingManager ===
      "object"
  ) {
    return reportingManager;
  }

  return null;
};


const getManagerId = (
  employee
) => {
  const manager =
    getManagerObject(
      employee
    );

  return (
    manager?._id ||
    manager?.id ||
    employee?.reportingManagerId ||
    (
      typeof employee?.reportsTo ===
      "string"
        ? employee.reportsTo
        : ""
    ) ||
    ""
  );
};


const getManagerName = (
  employee
) => {
  return (
    employee?.reportingManagerName ||
    getManagerObject(employee)
      ?.fullName ||
    "Not assigned"
  );
};


const directReportCount = (
  node
) => {
  return Array.isArray(
    node?.reports
  )
    ? node.reports.length
    : 0;
};


const totalDescendants = (
  reports = []
) => {
  if (!Array.isArray(reports)) {
    return 0;
  }

  return reports.reduce(
    (total, report) =>
      total +
      1 +
      totalDescendants(
        report?.reports
      ),
    0
  );
};


const flattenTreeIds = (
  node,
  collection = new Set()
) => {
  if (!node) {
    return collection;
  }

  const id = String(
    employeeIdOf(node)
  );

  if (id) {
    collection.add(id);
  }

  const reports =
    Array.isArray(
      node?.reports
    )
      ? node.reports
      : [];

  reports.forEach(
    (child) => {
      flattenTreeIds(
        child,
        collection
      );
    }
  );

  return collection;
};


const getListEmployees = (
  result
) => {
  if (Array.isArray(result)) {
    return result;
  }

  if (
    Array.isArray(
      result?.records
    )
  ) {
    return result.records;
  }

  if (
    Array.isArray(
      result?.employees
    )
  ) {
    return result.employees;
  }

  if (
    Array.isArray(
      result?.items
    )
  ) {
    return result.items;
  }

  if (
    Array.isArray(
      result?.data
    )
  ) {
    return result.data;
  }

  if (
    Array.isArray(
      result?.data?.records
    )
  ) {
    return result.data.records;
  }

  if (
    Array.isArray(
      result?.data?.employees
    )
  ) {
    return result.data.employees;
  }

  return [];
};


/* =========================================================
   TREE NODE
========================================================= */

function HierarchyNode({
  employee,
  level = 0,
  focusEmployeeId,
  onOpenEmployee,
  onChangeManager,
}) {
  const [
    expanded,
    setExpanded,
  ] = useState(true);

  const reports =
    Array.isArray(
      employee?.reports
    )
      ? employee.reports
      : [];

  const employeeId =
    String(
      employeeIdOf(
        employee
      )
    );

  const focused =
    employeeId ===
    String(
      focusEmployeeId
    );

  const hasReports =
    reports.length > 0;


  return (
    <div className="employee-hierarchy-node-wrap">

      <article
        className={[
          "employee-hierarchy-node",
          focused
            ? "is-focus"
            : "",
          level === 0
            ? "is-root"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >

        {/* ===============================================
            PERSON
        =============================================== */}

        <div className="employee-hierarchy-avatar">

          {employee?.profilePhotoUrl ? (
            <img
              src={
                employee.profilePhotoUrl
              }
              alt={
                employee.fullName ||
                "Employee"
              }
            />
          ) : (
            initials(
              employee?.fullName
            )
          )}

        </div>


        <div className="employee-hierarchy-node-main">

          <div className="employee-hierarchy-node-top">

            <div className="employee-hierarchy-node-identity">

              <span>
                {focused
                  ? "FOCUSED EMPLOYEE"
                  : hasReports
                  ? "MANAGER / LEAD"
                  : "TEAM MEMBER"}
              </span>

              <strong>
                {employee?.fullName ||
                  "Employee"}
              </strong>

            </div>


            <span
              className={`employee-hierarchy-status is-${String(
                employee?.status ||
                "ACTIVE"
              ).toLowerCase()}`}
            >
              {pretty(
                employee?.status ||
                "ACTIVE"
              )}
            </span>

          </div>


          <div className="employee-hierarchy-node-role">
            {employee?.designation ||
              "Designation not assigned"}
          </div>


          <div className="employee-hierarchy-node-meta">

            {employee?.employeeCode ? (
              <span>
                {employee.employeeCode}
              </span>
            ) : null}

            <span>
              {departmentName(
                employee
              )}
            </span>

            {employee?.companyCode ? (
              <span>
                {pretty(
                  employee.companyCode
                )}
              </span>
            ) : null}

            {hasReports ? (
              <span>
                {reports.length} direct{" "}
                {reports.length === 1
                  ? "report"
                  : "reports"}
              </span>
            ) : null}

          </div>

        </div>


        {/* ===============================================
            ACTIONS
        =============================================== */}

        <div className="employee-hierarchy-node-actions">

          {hasReports ? (
            <button
              type="button"
              className="employee-hierarchy-toggle"
              onClick={() =>
                setExpanded(
                  (value) =>
                    !value
                )
              }
            >
              {expanded
                ? "Collapse"
                : `Show ${reports.length}`}
            </button>
          ) : null}


          {!focused ? (
            <button
              type="button"
              className="employee-hierarchy-change"
              onClick={() =>
                onChangeManager(
                  employee
                )
              }
            >
              Change Manager
            </button>
          ) : null}


          {!focused ? (
            <button
              type="button"
              className="employee-hierarchy-open"
              onClick={() =>
                onOpenEmployee(
                  employee
                )
              }
            >
              View
              <span>→</span>
            </button>
          ) : null}

        </div>

      </article>


      {/* ===============================================
          CHILDREN
      =============================================== */}

      {expanded &&
      reports.length ? (
        <div className="employee-hierarchy-children">

          {reports.map(
            (report) => (
              <HierarchyNode
                key={
                  employeeIdOf(
                    report
                  )
                }
                employee={
                  report
                }
                level={
                  level + 1
                }
                focusEmployeeId={
                  focusEmployeeId
                }
                onOpenEmployee={
                  onOpenEmployee
                }
                onChangeManager={
                  onChangeManager
                }
              />
            )
          )}

        </div>
      ) : null}

    </div>
  );
}


/* =========================================================
   PAGE
========================================================= */

function EmployeeHierarchyPage() {
  const { employeeId } =
    useParams();

  const navigate =
    useNavigate();


  /* =======================================================
     TREE
  ======================================================= */

  const [
    tree,
    setTree,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");


  /* =======================================================
     MANAGER MODAL
  ======================================================= */

  const [
    managerModalOpen,
    setManagerModalOpen,
  ] = useState(false);

  const [
    targetEmployee,
    setTargetEmployee,
  ] = useState(null);

  const [
    managerOptions,
    setManagerOptions,
  ] = useState([]);

  const [
    managerSearch,
    setManagerSearch,
  ] = useState("");

  const [
    selectedManagerId,
    setSelectedManagerId,
  ] = useState("");

  const [
    managerLoading,
    setManagerLoading,
  ] = useState(false);

  const [
    managerSaving,
    setManagerSaving,
  ] = useState(false);

  const [
    managerError,
    setManagerError,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");


  /* =======================================================
     LOAD TREE
  ======================================================= */

  const load = useCallback(
    async (
      silent = false
    ) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const result =
          await getReportingTree(
            employeeId
          );

        setTree(
          result?.data ||
          result ||
          null
        );
      } catch (requestError) {
        setError(
          requestError
            ?.response
            ?.data
            ?.message ||
          requestError?.message ||
          "Reporting hierarchy could not be loaded."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [employeeId]
  );


  useEffect(() => {
    load();
  }, [load]);


  /* =======================================================
     ROOT
  ======================================================= */

  const root =
    useMemo(() => {
      if (!tree) {
        return null;
      }

      if (tree?.employee) {
        return {
          ...tree.employee,

          reports:
            Array.isArray(
              tree?.reports
            )
              ? tree.reports
              : Array.isArray(
                  tree.employee
                    ?.reports
                )
              ? tree.employee
                  .reports
              : [],
        };
      }

      if (
        tree?._id ||
        tree?.id
      ) {
        return {
          ...tree,

          reports:
            Array.isArray(
              tree?.reports
            )
              ? tree.reports
              : [],
        };
      }

      return null;
    }, [tree]);


  /* =======================================================
     SUMMARY
  ======================================================= */

  const summary =
    useMemo(
      () => ({
        direct:
          root
            ? directReportCount(
                root
              )
            : 0,

        total:
          root
            ? totalDescendants(
                root.reports
              )
            : 0,

        department:
          root
            ? departmentName(
                root
              )
            : "—",
      }),
      [root]
    );


  const currentManager =
    useMemo(
      () =>
        root
          ? getManagerObject(
              root
            )
          : null,
      [root]
    );


  const currentManagerName =
    useMemo(
      () =>
        root
          ? getManagerName(
              root
            )
          : "Not assigned",
      [root]
    );


  /* =======================================================
     CLOSE MANAGER MODAL
  ======================================================= */

  const closeManagerModal =
    () => {
      if (managerSaving) {
        return;
      }

      setManagerModalOpen(
        false
      );

      setTargetEmployee(
        null
      );

      setManagerOptions(
        []
      );

      setManagerSearch(
        ""
      );

      setSelectedManagerId(
        ""
      );

      setManagerError(
        ""
      );
    };


  /* =======================================================
     OPEN MANAGER MODAL
  ======================================================= */

  const openManagerModal =
    async (
      employee = root
    ) => {
      if (!employee) {
        return;
      }

      setTargetEmployee(
        employee
      );

      setManagerModalOpen(
        true
      );

      setManagerError(
        ""
      );

      setManagerSearch(
        ""
      );

      setManagerOptions(
        []
      );

      setManagerLoading(
        true
      );

      setSelectedManagerId(
        String(
          getManagerId(
            employee
          ) || ""
        )
      );


      try {
        const result =
          await getEmployees({
            page: 1,
            limit: 1000,
            status: "ACTIVE",
          });


        const employees =
          getListEmployees(
            result
          );


        const targetId =
          String(
            employeeIdOf(
              employee
            )
          );


        /*
         * Target + all descendants cannot become
         * the target employee's manager.
         *
         * This prevents the obvious circular hierarchy
         * relationships on the client side.
         */
        const blockedIds =
          flattenTreeIds(
            employee
          );


        const filtered =
          employees
            .filter(
              (option) => {
                const optionId =
                  String(
                    employeeIdOf(
                      option
                    )
                  );

                if (!optionId) {
                  return false;
                }

                if (
                  optionId ===
                  targetId
                ) {
                  return false;
                }

                if (
                  blockedIds.has(
                    optionId
                  )
                ) {
                  return false;
                }

                return (
                  !option?.status ||
                  String(
                    option.status
                  ).toUpperCase() ===
                    "ACTIVE"
                );
              }
            )
            .sort(
              (a, b) =>
                String(
                  a?.fullName ||
                  ""
                ).localeCompare(
                  String(
                    b?.fullName ||
                    ""
                  )
                )
            );


        setManagerOptions(
          filtered
        );
      } catch (requestError) {
        setManagerError(
          requestError
            ?.response
            ?.data
            ?.message ||
          requestError?.message ||
          "Reporting managers could not be loaded."
        );
      } finally {
        setManagerLoading(
          false
        );
      }
    };


  /* =======================================================
     FILTER MANAGERS
  ======================================================= */

  const filteredManagerOptions =
    useMemo(() => {
      const search =
        managerSearch
          .trim()
          .toLowerCase();

      if (!search) {
        return managerOptions;
      }

      return managerOptions.filter(
        (manager) => {
          const haystack = [
            manager?.fullName,
            manager?.employeeCode,
            manager?.designation,
            manager?.companyCode,
            manager?.orgUnitCode,
            manager?.departmentName,
            manager
              ?.department
              ?.name,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return haystack.includes(
            search
          );
        }
      );
    }, [
      managerOptions,
      managerSearch,
    ]);


  /* =======================================================
     SELECTED MANAGER
  ======================================================= */

  const selectedManager =
    useMemo(
      () =>
        managerOptions.find(
          (manager) =>
            String(
              employeeIdOf(
                manager
              )
            ) ===
            String(
              selectedManagerId
            )
        ) || null,
      [
        managerOptions,
        selectedManagerId,
      ]
    );


  /* =======================================================
     SAVE REPORTING MANAGER
  ======================================================= */

  const saveReportingManager =
    async () => {
      if (!targetEmployee) {
        return;
      }

      if (!selectedManagerId) {
        setManagerError(
          "Select a reporting manager before saving."
        );

        return;
      }


      const targetId =
        employeeIdOf(
          targetEmployee
        );


      if (!targetId) {
        setManagerError(
          "Employee ID is unavailable."
        );

        return;
      }


      const oldManagerId =
        String(
          getManagerId(
            targetEmployee
          ) || ""
        );


      if (
        oldManagerId ===
        String(
          selectedManagerId
        )
      ) {
        setManagerError(
          "This employee already reports to the selected manager."
        );

        return;
      }


      try {
        setManagerSaving(
          true
        );

        setManagerError(
          ""
        );

        setSuccessMessage(
          ""
        );


        await updateEmployee(
          targetId,
          {
            reportsTo:
              selectedManagerId,
          }
        );


        const managerName =
          selectedManager
            ?.fullName ||
          "the selected manager";


        const employeeName =
          targetEmployee
            ?.fullName ||
          "Employee";


        closeManagerModal();


        setSuccessMessage(
          `${employeeName} now reports to ${managerName}.`
        );


        await load(true);

      } catch (requestError) {
        setManagerError(
          requestError
            ?.response
            ?.data
            ?.message ||
          requestError?.message ||
          "Reporting manager could not be updated."
        );
      } finally {
        setManagerSaving(
          false
        );
      }
    };


  /* =======================================================
     REMOVE REPORTING MANAGER
  ======================================================= */

  const removeReportingManager =
    async () => {
      if (!targetEmployee) {
        return;
      }


      const targetId =
        employeeIdOf(
          targetEmployee
        );


      if (!targetId) {
        setManagerError(
          "Employee ID is unavailable."
        );

        return;
      }


      const confirmed =
        window.confirm(
          `Remove the reporting manager for ${
            targetEmployee
              ?.fullName ||
            "this employee"
          }?`
        );


      if (!confirmed) {
        return;
      }


      try {
        setManagerSaving(
          true
        );

        setManagerError(
          ""
        );

        setSuccessMessage(
          ""
        );


        await updateEmployee(
          targetId,
          {
            reportsTo: null,
          }
        );


        const employeeName =
          targetEmployee
            ?.fullName ||
          "Employee";


        closeManagerModal();


        setSuccessMessage(
          `${employeeName} no longer has a reporting manager assigned.`
        );


        await load(true);

      } catch (requestError) {
        setManagerError(
          requestError
            ?.response
            ?.data
            ?.message ||
          requestError?.message ||
          "Reporting manager could not be removed."
        );
      } finally {
        setManagerSaving(
          false
        );
      }
    };


  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="employee-hierarchy-page">

        <div className="employee-hierarchy-loading">

          <span className="employee-detail-loader" />

          <div>
            <strong>
              Loading hierarchy
            </strong>

            <small>
              Building reporting structure...
            </small>
          </div>

        </div>

      </div>
    );
  }


  /* =======================================================
     ERROR
  ======================================================= */

  if (
    error ||
    !root
  ) {
    return (
      <div className="employee-hierarchy-page">

        <div className="employee-hierarchy-error">

          <strong>
            Reporting hierarchy unavailable
          </strong>

          <span>
            {error ||
              "Hierarchy data was not found."}
          </span>


          <div className="employee-hierarchy-error-actions">

            <button
              type="button"
              onClick={() =>
                load()
              }
            >
              Try Again
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  `/people/employees/${employeeId}`
                )
              }
            >
              Employee Profile
            </button>

          </div>

        </div>

      </div>
    );
  }


  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="employee-hierarchy-page">


      {/* =================================================
          NAVIGATION
      ================================================= */}

      <div className="employee-hierarchy-topbar">

        <button
          type="button"
          className="employee-hierarchy-back"
          onClick={() =>
            navigate(
              `/people/employees/${employeeId}`
            )
          }
        >
          <span>←</span>
          Employee Profile
        </button>


        <button
          type="button"
          className="employee-hierarchy-refresh"
          disabled={
            refreshing
          }
          onClick={() =>
            load(true)
          }
        >
          {refreshing
            ? "Refreshing..."
            : "↻ Refresh"}
        </button>

      </div>


      {/* =================================================
          HERO
      ================================================= */}

      <section className="employee-hierarchy-hero employee-hierarchy-hero-clean">

        <div className="employee-hierarchy-hero-profile">

          <div className="employee-hierarchy-hero-avatar">

            {root?.profilePhotoUrl ? (
              <img
                src={
                  root.profilePhotoUrl
                }
                alt={
                  root.fullName ||
                  "Employee"
                }
              />
            ) : (
              initials(
                root.fullName
              )
            )}

          </div>


          <div className="employee-hierarchy-hero-copy">

            <span>
              REPORTING HIERARCHY
            </span>

            <h1>
              {root.fullName}
            </h1>

            <p>
              {root.designation ||
                "Employee"}

              <span>•</span>

              {summary.department}
            </p>


            <div className="employee-hierarchy-hero-meta">

              {root.employeeCode ? (
                <strong>
                  {root.employeeCode}
                </strong>
              ) : null}

              <span>
                {pretty(
                  root.status ||
                  "ACTIVE"
                )}
              </span>

            </div>

          </div>

        </div>


        {/* ===============================================
            REPORTING SUMMARY
        =============================================== */}

        <div className="employee-hierarchy-hero-summary">

          <div className="employee-hierarchy-manager-summary">

            <span>
              REPORTS TO
            </span>

            <strong>
              {currentManagerName}
            </strong>

            {currentManager
              ?.designation ? (
              <small>
                {
                  currentManager.designation
                }
              </small>
            ) : null}

          </div>


          <div className="employee-hierarchy-counts">

            <div>
              <strong>
                {summary.direct}
              </strong>

              <span>
                Direct Reports
              </span>
            </div>

            <div>
              <strong>
                {summary.total}
              </strong>

              <span>
                Total Team
              </span>
            </div>

          </div>


          <button
            type="button"
            className="employee-hierarchy-primary-action"
            onClick={() =>
              openManagerModal(
                root
              )
            }
          >
            {currentManagerName ===
            "Not assigned"
              ? "Assign Manager"
              : "Change Manager"}
          </button>

        </div>

      </section>


      {/* =================================================
          SUCCESS
      ================================================= */}

      {successMessage ? (
        <div className="employee-hierarchy-success">

          <span>✓</span>

          <strong>
            {successMessage}
          </strong>

          <button
            type="button"
            aria-label="Dismiss"
            onClick={() =>
              setSuccessMessage(
                ""
              )
            }
          >
            ×
          </button>

        </div>
      ) : null}


      {/* =================================================
          TREE
      ================================================= */}

      <section className="employee-hierarchy-tree-panel">

        <div className="employee-hierarchy-tree-header">

          <div>
            <span>
              TEAM STRUCTURE
            </span>

            <h2>
              Reporting Tree
            </h2>

            <p>
              Expand managers to see the employees reporting under them.
            </p>
          </div>


          <div className="employee-hierarchy-tree-help">

            <span>
              {summary.total}
            </span>

            <small>
              {summary.total === 1
                ? "employee below"
                : "employees below"}
            </small>

          </div>

        </div>


        {summary.total === 0 ? (
          <div className="employee-hierarchy-empty">

            <div className="employee-hierarchy-empty-icon">
              H
            </div>

            <strong>
              No team members yet
            </strong>

            <p>
              No employees currently report under{" "}
              {root.fullName}.
            </p>

          </div>
        ) : null}


        <div className="employee-hierarchy-tree">

          <HierarchyNode
            employee={root}
            focusEmployeeId={
              employeeId
            }
            onOpenEmployee={(
              selectedEmployee
            ) => {
              const id =
                employeeIdOf(
                  selectedEmployee
                );

              if (!id) {
                return;
              }

              navigate(
                `/people/employees/${id}`
              );
            }}
            onChangeManager={
              openManagerModal
            }
          />

        </div>

      </section>


      {/* =================================================
          MANAGER MODAL
      ================================================= */}

      {managerModalOpen ? (
        <div
          className="employee-hierarchy-modal-backdrop"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
                event.currentTarget &&
              !managerSaving
            ) {
              closeManagerModal();
            }
          }}
        >

          <div
            className="employee-hierarchy-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manager-modal-title"
          >

            {/* ===========================================
                HEADER
            =========================================== */}

            <div className="employee-hierarchy-modal-header">

              <div>

                <span>
                  REPORTING LINE
                </span>

                <h2 id="manager-modal-title">
                  {getManagerId(
                    targetEmployee
                  )
                    ? "Change Reporting Manager"
                    : "Assign Reporting Manager"}
                </h2>

                <p>
                  Choose who{" "}
                  <strong>
                    {targetEmployee
                      ?.fullName ||
                      "this employee"}
                  </strong>{" "}
                  directly reports to.
                </p>

              </div>


              <button
                type="button"
                disabled={
                  managerSaving
                }
                onClick={
                  closeManagerModal
                }
                aria-label="Close"
              >
                ×
              </button>

            </div>


            {/* ===========================================
                BODY
            =========================================== */}

            <div className="employee-hierarchy-modal-body">


              {/* EMPLOYEE */}

              <div className="employee-hierarchy-current-person">

                <div className="employee-hierarchy-avatar">

                  {targetEmployee
                    ?.profilePhotoUrl ? (
                    <img
                      src={
                        targetEmployee
                          .profilePhotoUrl
                      }
                      alt=""
                    />
                  ) : (
                    initials(
                      targetEmployee
                        ?.fullName
                    )
                  )}

                </div>


                <div>

                  <span>
                    EMPLOYEE
                  </span>

                  <strong>
                    {targetEmployee
                      ?.fullName ||
                      "Employee"}
                  </strong>

                  <small>
                    {targetEmployee
                      ?.designation ||
                      "Employee"}

                    {targetEmployee
                      ?.employeeCode
                      ? ` · ${targetEmployee.employeeCode}`
                      : ""}

                    {" · "}

                    {departmentName(
                      targetEmployee
                    )}
                  </small>

                </div>

              </div>


              {/* CURRENT LINE */}

              <div className="employee-hierarchy-manager-current">

                <div>
                  <span>
                    CURRENT MANAGER
                  </span>

                  <strong>
                    {getManagerName(
                      targetEmployee
                    )}
                  </strong>
                </div>


                <span className="employee-hierarchy-manager-arrow">
                  →
                </span>


                <div>
                  <span>
                    NEW MANAGER
                  </span>

                  <strong>
                    {selectedManager
                      ?.fullName ||
                      "Select below"}
                  </strong>
                </div>

              </div>


              {/* SEARCH */}

              <label className="employee-hierarchy-manager-field">

                <span>
                  Find Manager
                </span>

                <input
                  type="search"
                  value={
                    managerSearch
                  }
                  disabled={
                    managerLoading ||
                    managerSaving
                  }
                  placeholder="Search by name, ID, designation or department"
                  onChange={(
                    event
                  ) =>
                    setManagerSearch(
                      event
                        .target
                        .value
                    )
                  }
                />

              </label>


              {/* SELECT */}

              <label className="employee-hierarchy-manager-field">

                <span>
                  Reporting Manager
                  <b>*</b>
                </span>

                <select
                  value={
                    selectedManagerId
                  }
                  disabled={
                    managerLoading ||
                    managerSaving
                  }
                  onChange={(
                    event
                  ) => {
                    setSelectedManagerId(
                      event
                        .target
                        .value
                    );

                    setManagerError(
                      ""
                    );
                  }}
                >

                  <option value="">
                    {managerLoading
                      ? "Loading employees..."
                      : "Select reporting manager"}
                  </option>


                  {filteredManagerOptions.map(
                    (manager) => (
                      <option
                        key={
                          employeeIdOf(
                            manager
                          )
                        }
                        value={
                          employeeIdOf(
                            manager
                          )
                        }
                      >
                        {manager.fullName}

                        {manager.designation
                          ? ` — ${manager.designation}`
                          : ""}

                        {manager.employeeCode
                          ? ` (${manager.employeeCode})`
                          : ""}
                      </option>
                    )
                  )}

                </select>


                {!managerLoading &&
                filteredManagerOptions.length ===
                  0 ? (
                  <small>
                    No matching active employee found.
                  </small>
                ) : null}

              </label>


              {/* SELECTED PREVIEW */}

              {selectedManager ? (
                <div className="employee-hierarchy-manager-preview">

                  <div className="employee-hierarchy-avatar">

                    {selectedManager
                      ?.profilePhotoUrl ? (
                      <img
                        src={
                          selectedManager
                            .profilePhotoUrl
                        }
                        alt=""
                      />
                    ) : (
                      initials(
                        selectedManager
                          ?.fullName
                      )
                    )}

                  </div>


                  <div>

                    <span>
                      NEW REPORTING LINE
                    </span>

                    <strong>
                      {selectedManager
                        .fullName}
                      <span>
                        →
                      </span>
                      {targetEmployee
                        ?.fullName}
                    </strong>

                    <small>
                      {selectedManager
                        ?.designation ||
                        "Employee"}

                      {" · "}

                      {departmentName(
                        selectedManager
                      )}
                    </small>

                  </div>

                </div>
              ) : null}


              {/* ERROR */}

              {managerError ? (
                <div className="employee-hierarchy-manager-error">
                  <span>!</span>
                  {managerError}
                </div>
              ) : null}


              {/* SIMPLE EXPLANATION */}

              <div className="employee-hierarchy-manager-note">

                <span>
                  i
                </span>

                <p>
                  Only the immediate manager is selected here.
                  The complete hierarchy is created automatically
                  from employee reporting relationships.
                </p>

              </div>

            </div>


            {/* ===========================================
                FOOTER
            =========================================== */}

            <div className="employee-hierarchy-modal-footer">

              <div>

                {getManagerId(
                  targetEmployee
                ) ? (
                  <button
                    type="button"
                    className="employee-hierarchy-remove-manager"
                    disabled={
                      managerSaving
                    }
                    onClick={
                      removeReportingManager
                    }
                  >
                    Remove Manager
                  </button>
                ) : null}

              </div>


              <div>

                <button
                  type="button"
                  className="employee-hierarchy-modal-cancel"
                  disabled={
                    managerSaving
                  }
                  onClick={
                    closeManagerModal
                  }
                >
                  Cancel
                </button>


                <button
                  type="button"
                  className="employee-hierarchy-modal-save"
                  disabled={
                    managerSaving ||
                    managerLoading ||
                    !selectedManagerId
                  }
                  onClick={
                    saveReportingManager
                  }
                >
                  {managerSaving
                    ? "Saving..."
                    : "Save Reporting Line"}
                </button>

              </div>

            </div>

          </div>

        </div>
      ) : null}

    </div>
  );
}


export default EmployeeHierarchyPage;