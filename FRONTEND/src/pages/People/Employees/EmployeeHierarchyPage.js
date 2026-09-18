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

const pretty =
  (
    value
  ) =>
    String(
      value ||
      ""
    )
      .replaceAll(
        "_",
        " "
      )
      .toLowerCase()
      .replace(
        /\b\w/g,
        (
          character
        ) =>
          character.toUpperCase()
      );

const initials =
  (
    name
  ) => {
    const parts =
      String(
        name ||
        "E"
      )
        .trim()
        .split(
          /\s+/
        )
        .filter(
          Boolean
        );

    if (
      !parts.length
    ) {
      return "E";
    }

    if (
      parts.length ===
      1
    ) {
      return parts[0]
        .charAt(
          0
        )
        .toUpperCase();
    }

    return (
      parts[0]
        .charAt(
          0
        ) +
      parts[
        parts.length -
        1
      ]
        .charAt(
          0
        )
    ).toUpperCase();
  };

const employeeIdOf =
  (
    employee
  ) =>
    employee?._id ||
    employee?.id ||
    "";

const departmentName =
  (
    employee
  ) =>
    employee?.department?.name ||
    employee?.departmentName ||
    employee?.orgUnit?.name ||
    employee?.orgUnitCode ||
    "Organisation";

const directReportCount =
  (
    node
  ) =>
    Array.isArray(
      node?.reports
    )
      ? node.reports.length
      : 0;

const totalDescendants =
  (
    reports = []
  ) => {
    if (
      !Array.isArray(
        reports
      )
    ) {
      return 0;
    }

    return reports.reduce(
      (
        total,
        report
      ) =>
        total +
        1 +
        totalDescendants(
          report?.reports
        ),
      0
    );
  };

const flattenTreeIds =
  (
    node,
    collection =
      new Set()
  ) => {
    if (
      !node
    ) {
      return collection;
    }

    const id =
      String(
        employeeIdOf(
          node
        )
      );

    if (
      id
    ) {
      collection.add(
        id
      );
    }

    const reports =
      Array.isArray(
        node?.reports
      )
        ? node.reports
        : [];

    reports.forEach(
      (
        child
      ) => {
        flattenTreeIds(
          child,
          collection
        );
      }
    );

    return collection;
  };

const getListEmployees =
  (
    result
  ) => {
    if (
      Array.isArray(
        result
      )
    ) {
      return result;
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
  ] =
    useState(
      true
    );

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

  const isManager =
    reports.length >
    0;

  const reportingManagerName =
    employee
      ?.reportsTo
      ?.fullName ||
    employee
      ?.reportingManager
      ?.fullName ||
    "";

  return (
    <div className="employee-hierarchy-node-wrap">

      <article
        className={[
          "employee-hierarchy-node",

          focused
            ? "is-focus"
            : "",

          level ===
          0
            ? "is-root"
            : "",
        ]
          .filter(
            Boolean
          )
          .join(
            " "
          )}
      >

        <div className="employee-hierarchy-avatar">
          {initials(
            employee?.fullName
          )}
        </div>

        <div className="employee-hierarchy-node-main">

          <div className="employee-hierarchy-node-top">

            <div>

              <span>
                {level ===
                0
                  ? "CURRENT EMPLOYEE"
                  : isManager
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

            <span>
              {employee?.employeeCode ||
                "No Employee ID"}
            </span>

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

          </div>

          {reportingManagerName ? (
            <div className="employee-hierarchy-reports-to">

              <span>
                REPORTS TO
              </span>

              <strong>
                {reportingManagerName}
              </strong>

            </div>
          ) : null}

        </div>

        <div className="employee-hierarchy-node-actions">

          {reports.length ? (
            <button
              type="button"
              className="employee-hierarchy-toggle"
              onClick={() =>
                setExpanded(
                  (
                    value
                  ) =>
                    !value
                )
              }
            >
              {expanded
                ? "Hide"
                : "Show"}
              {" "}
              {reports.length}
            </button>
          ) : null}

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

          <button
            type="button"
            className="employee-hierarchy-open"
            onClick={() =>
              onOpenEmployee(
                employee
              )
            }
          >
            Open
          </button>

        </div>

      </article>

      {expanded &&
      reports.length ? (
        <div className="employee-hierarchy-children">

          {reports.map(
            (
              report
            ) => (
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
                  level +
                  1
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
  const {
    employeeId,
  } =
    useParams();

  const navigate =
    useNavigate();

  /* =====================================================
     TREE DATA
  ===================================================== */

  const [
    tree,
    setTree,
  ] =
    useState(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    error,
    setError,
  ] =
    useState(
      ""
    );

  /* =====================================================
     HIERARCHY MANAGEMENT
  ===================================================== */

  const [
    managerModalOpen,
    setManagerModalOpen,
  ] =
    useState(
      false
    );

  const [
    targetEmployee,
    setTargetEmployee,
  ] =
    useState(
      null
    );

  const [
    managerOptions,
    setManagerOptions,
  ] =
    useState(
      []
    );

  const [
    managerSearch,
    setManagerSearch,
  ] =
    useState(
      ""
    );

  const [
    selectedManagerId,
    setSelectedManagerId,
  ] =
    useState(
      ""
    );

  const [
    managerLoading,
    setManagerLoading,
  ] =
    useState(
      false
    );

  const [
    managerSaving,
    setManagerSaving,
  ] =
    useState(
      false
    );

  const [
    managerError,
    setManagerError,
  ] =
    useState(
      ""
    );

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState(
      ""
    );

  /* =====================================================
     LOAD TREE
  ===================================================== */

  const load =
    useCallback(
      async () => {
        try {
          setLoading(
            true
          );

          setError(
            ""
          );

          const result =
            await getReportingTree(
              employeeId
            );

          setTree(
            result
          );
        } catch (
          requestError
        ) {
          setError(
            requestError
              ?.response
              ?.data
              ?.message ||
            requestError
              ?.message ||
            "Reporting hierarchy could not be loaded."
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        employeeId,
      ]
    );

  useEffect(
    () => {
      load();
    },
    [
      load,
    ]
  );

  /* =====================================================
     ROOT
  ===================================================== */

  const root =
    useMemo(
      () => {
        if (
          !tree?.employee
        ) {
          return null;
        }

        return {
          ...tree.employee,

          reports:
            Array.isArray(
              tree?.reports
            )
              ? tree.reports
              : [],
        };
      },
      [
        tree,
      ]
    );

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
      [
        root,
      ]
    );

  /* =====================================================
     CURRENT / REPORTING MANAGER
  ===================================================== */

  const currentManager =
    useMemo(
      () =>
        root
          ?.reportsTo ||
        root
          ?.reportingManager ||
        null,
      [
        root,
      ]
    );

  /* =====================================================
     OPEN MANAGER MODAL
  ===================================================== */

  const openManagerModal =
    async (
      employee =
        root
    ) => {
      if (
        !employee
      ) {
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

      setManagerLoading(
        true
      );

      const existingManager =
        employee
          ?.reportsTo
          ?._id ||
        employee
          ?.reportsTo ||
        employee
          ?.reportingManager
          ?._id ||
        employee
          ?.reportingManager ||
        "";

      setSelectedManagerId(
        String(
          existingManager ||
          ""
        )
      );

      try {
        const result =
          await getEmployees({
            page:
              1,

            limit:
              500,

            status:
              "ACTIVE",
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
         * Prevent self-selection.
         *
         * We also exclude all descendants of the target
         * employee when that target is inside the currently
         * loaded tree. This avoids obvious circular hierarchy
         * choices from the frontend.
         */

        const descendantIds =
          flattenTreeIds(
            employee
          );

        const filtered =
          employees.filter(
            (
              option
            ) => {
              const optionId =
                String(
                  employeeIdOf(
                    option
                  )
                );

              if (
                !optionId
              ) {
                return false;
              }

              if (
                optionId ===
                targetId
              ) {
                return false;
              }

              if (
                descendantIds.has(
                  optionId
                )
              ) {
                return false;
              }

              return true;
            }
          );

        setManagerOptions(
          filtered
        );
      } catch (
        requestError
      ) {
        setManagerError(
          requestError
            ?.response
            ?.data
            ?.message ||
          requestError
            ?.message ||
          "Reporting manager options could not be loaded."
        );
      } finally {
        setManagerLoading(
          false
        );
      }
    };

  /* =====================================================
     FILTER MANAGERS
  ===================================================== */

  const filteredManagerOptions =
    useMemo(
      () => {
        const search =
          managerSearch
            .trim()
            .toLowerCase();

        if (
          !search
        ) {
          return managerOptions;
        }

        return managerOptions.filter(
          (
            manager
          ) => {
            const haystack =
              [
                manager
                  ?.fullName,

                manager
                  ?.employeeCode,

                manager
                  ?.designation,

                manager
                  ?.orgUnitCode,

                manager
                  ?.department
                  ?.name,
              ]
                .filter(
                  Boolean
                )
                .join(
                  " "
                )
                .toLowerCase();

            return haystack.includes(
              search
            );
          }
        );
      },
      [
        managerOptions,
        managerSearch,
      ]
    );

  /* =====================================================
     SELECTED MANAGER
  ===================================================== */

  const selectedManager =
    useMemo(
      () =>
        managerOptions.find(
          (
            manager
          ) =>
            String(
              employeeIdOf(
                manager
              )
            ) ===
            String(
              selectedManagerId
            )
        ) ||
        null,
      [
        managerOptions,
        selectedManagerId,
      ]
    );

  /* =====================================================
     SAVE MANAGER / MOVE HIERARCHY
  ===================================================== */

  const saveReportingManager =
    async () => {
      if (
        !targetEmployee
      ) {
        return;
      }

      if (
        !selectedManagerId
      ) {
        setManagerError(
          "Please select a reporting manager."
        );

        return;
      }

      const targetId =
        employeeIdOf(
          targetEmployee
        );

      if (
        !targetId
      ) {
        setManagerError(
          "Employee ID is unavailable."
        );

        return;
      }

      setManagerSaving(
        true
      );

      setManagerError(
        ""
      );

      setSuccessMessage(
        ""
      );

      try {
        await updateEmployee(
          targetId,
          {
            reportsTo:
              selectedManagerId,
          }
        );

        setManagerModalOpen(
          false
        );

        setTargetEmployee(
          null
        );

        setSelectedManagerId(
          ""
        );

        setSuccessMessage(
          selectedManager
            ? `${targetEmployee?.fullName || "Employee"} now reports to ${selectedManager.fullName}.`
            : "Reporting hierarchy updated successfully."
        );

        /*
         * Reload the focused hierarchy.
         *
         * If a child was moved outside the currently focused
         * branch, it will disappear from this tree after reload,
         * which is correct.
         */
        await load();
      } catch (
        requestError
      ) {
        setManagerError(
          requestError
            ?.response
            ?.data
            ?.message ||
          requestError
            ?.message ||
          "Reporting manager could not be updated."
        );
      } finally {
        setManagerSaving(
          false
        );
      }
    };

  /* =====================================================
     REMOVE MANAGER
  ===================================================== */

  const removeReportingManager =
    async () => {
      if (
        !targetEmployee
      ) {
        return;
      }

      const targetId =
        employeeIdOf(
          targetEmployee
        );

      if (
        !targetId
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          `Remove the reporting manager for ${
            targetEmployee?.fullName ||
            "this employee"
          }?`
        );

      if (
        !confirmed
      ) {
        return;
      }

      setManagerSaving(
        true
      );

      setManagerError(
        ""
      );

      try {
        await updateEmployee(
          targetId,
          {
            reportsTo:
              null,
          }
        );

        setManagerModalOpen(
          false
        );

        setTargetEmployee(
          null
        );

        setSelectedManagerId(
          ""
        );

        setSuccessMessage(
          "Reporting manager removed successfully."
        );

        await load();
      } catch (
        requestError
      ) {
        setManagerError(
          requestError
            ?.response
            ?.data
            ?.message ||
          requestError
            ?.message ||
          "Reporting manager could not be removed."
        );
      } finally {
        setManagerSaving(
          false
        );
      }
    };

  /* =====================================================
     LOADING
  ===================================================== */

  if (
    loading
  ) {
    return (
      <div className="employee-hierarchy-page">

        <div className="employee-hierarchy-loading">
          Loading organisation hierarchy...
        </div>

      </div>
    );
  }

  /* =====================================================
     ERROR
  ===================================================== */

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

          <button
            type="button"
            onClick={() =>
              navigate(
                `/people/employees/${employeeId}`
              )
            }
          >
            Return to Employee
          </button>

        </div>

      </div>
    );
  }

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="employee-hierarchy-page">

      <button
        type="button"
        className="employee-hierarchy-back"
        onClick={() =>
          navigate(
            `/people/employees/${employeeId}`
          )
        }
      >
        ← Employee Profile
      </button>

      {/* =================================================
          HERO
      ================================================== */}

      <section className="employee-hierarchy-hero">

        <div>

          <span>
            PEOPLE / ORGANISATION
          </span>

          <h1>
            Reporting Hierarchy
          </h1>

          <p>
            View and maintain reporting relationships from
            leadership through managers, seniors and team members.
          </p>

        </div>

        <div className="employee-hierarchy-hero-person">

          <span>
            FOCUSED EMPLOYEE
          </span>

          <strong>
            {root.fullName}
          </strong>

          <small>
            {root.designation ||
              "Employee"}
            {" · "}
            {root.employeeCode ||
              "No ID"}
          </small>

          <div className="employee-hierarchy-current-manager">

            <span>
              REPORTING TO
            </span>

            <strong>
              {currentManager
                ?.fullName ||
                "Not Assigned"}
            </strong>

          </div>

        </div>

      </section>

      {/* =================================================
          SUCCESS
      ================================================== */}

      {successMessage ? (
        <div className="employee-hierarchy-success">

          <span>
            ✓
          </span>

          <strong>
            {successMessage}
          </strong>

          <button
            type="button"
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
          SUMMARY
      ================================================== */}

      <section className="employee-hierarchy-summary">

        <article>

          <span>
            DEPARTMENT
          </span>

          <strong>
            {summary.department}
          </strong>

          <small>
            Organisation unit
          </small>

        </article>

        <article>

          <span>
            REPORTING MANAGER
          </span>

          <strong>
            {currentManager
              ?.fullName ||
              "Not Assigned"}
          </strong>

          <small>
            Immediate reporting head
          </small>

        </article>

        <article>

          <span>
            DIRECT REPORTS
          </span>

          <strong>
            {summary.direct}
          </strong>

          <small>
            Immediate team members
          </small>

        </article>

        <article>

          <span>
            TOTAL TEAM
          </span>

          <strong>
            {summary.total}
          </strong>

          <small>
            Full reporting tree
          </small>

        </article>

      </section>

      {/* =================================================
          HIERARCHY MANAGEMENT CARD
      ================================================== */}

      <section className="employee-hierarchy-management">

        <div className="employee-hierarchy-management-icon">
          H
        </div>

        <div>

          <span>
            HIERARCHY MANAGEMENT
          </span>

          <strong>
            {currentManager
              ? "Change Reporting Manager"
              : "Assign Reporting Manager"}
          </strong>

          <p>
            Moving this employee to another reporting manager
            automatically places the employee and their team
            under the new hierarchy.
          </p>

        </div>

        <button
          type="button"
          onClick={() =>
            openManagerModal(
              root
            )
          }
        >
          {currentManager
            ? "Change Manager"
            : "+ Assign Manager"}
        </button>

      </section>

      {/* =================================================
          LEGEND
      ================================================== */}

      <section className="employee-hierarchy-legend">

        <div>
          <span className="is-head" />
          <strong>
            Head / Root
          </strong>
        </div>

        <div>
          <span className="is-manager" />
          <strong>
            Manager / Senior
          </strong>
        </div>

        <div>
          <span className="is-member" />
          <strong>
            Junior / Team Member
          </strong>
        </div>

      </section>

      {/* =================================================
          TREE
      ================================================== */}

      <section className="employee-hierarchy-tree-panel">

        <div className="employee-hierarchy-tree-header">

          <div>

            <span>
              ORGANISATION TREE
            </span>

            <h2>
              Team Structure
            </h2>

            <p>
              Hierarchy is generated from each employee's
              Reporting Manager assignment.
            </p>

          </div>

          <div className="employee-hierarchy-tree-actions">

            <button
              type="button"
              className="employee-hierarchy-manager-button"
              onClick={() =>
                openManagerModal(
                  root
                )
              }
            >
              {currentManager
                ? "Change Manager"
                : "+ Assign Manager"}
            </button>

            <button
              type="button"
              onClick={
                load
              }
            >
              ↻ Refresh
            </button>

          </div>

        </div>

        <div className="employee-hierarchy-tree">

          <HierarchyNode
            employee={
              root
            }
            focusEmployeeId={
              employeeId
            }
            onOpenEmployee={(
              employee
            ) =>
              navigate(
                `/people/employees/${employeeIdOf(
                  employee
                )}`
              )
            }
            onChangeManager={
              openManagerModal
            }
          />

        </div>

      </section>

      {/* =================================================
          CHANGE / ASSIGN MANAGER MODAL
      ================================================== */}

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
              setManagerModalOpen(
                false
              );
            }
          }}
        >

          <div className="employee-hierarchy-modal">

            {/* =============================================
                HEADER
            ============================================= */}

            <div className="employee-hierarchy-modal-header">

              <div>

                <span>
                  ORGANISATION STRUCTURE
                </span>

                <h2>
                  {selectedManagerId
                    ? "Change Reporting Manager"
                    : "Assign Reporting Manager"}
                </h2>

                <p>
                  Assign the immediate manager for{" "}
                  <strong>
                    {targetEmployee
                      ?.fullName ||
                      "this employee"}
                  </strong>
                  .
                </p>

              </div>

              <button
                type="button"
                disabled={
                  managerSaving
                }
                onClick={() =>
                  setManagerModalOpen(
                    false
                  )
                }
              >
                ×
              </button>

            </div>

            {/* =============================================
                BODY
            ============================================= */}

            <div className="employee-hierarchy-modal-body">

              {/* CURRENT EMPLOYEE */}

              <div className="employee-hierarchy-current-person">

                <div className="employee-hierarchy-avatar">
                  {initials(
                    targetEmployee
                      ?.fullName
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
                    {" · "}
                    {targetEmployee
                      ?.employeeCode ||
                      "No ID"}
                    {" · "}
                    {departmentName(
                      targetEmployee
                    )}
                  </small>

                </div>

              </div>

              {/* CURRENT MANAGER */}

              <div className="employee-hierarchy-manager-current">

                <div>

                  <span>
                    CURRENT REPORTING MANAGER
                  </span>

                  <strong>
                    {targetEmployee
                      ?.reportsTo
                      ?.fullName ||
                    targetEmployee
                      ?.reportingManager
                      ?.fullName ||
                    "Not Assigned"}
                  </strong>

                </div>

                <div>

                  <span>
                    NEW REPORTING MANAGER
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
                  Search Manager
                </span>

                <input
                  type="text"
                  value={
                    managerSearch
                  }
                  disabled={
                    managerLoading ||
                    managerSaving
                  }
                  placeholder="Search name, employee ID, designation or department..."
                  onChange={(
                    event
                  ) =>
                    setManagerSearch(
                      event.target
                        .value
                    )
                  }
                />

              </label>

              {/* MANAGER */}

              <label className="employee-hierarchy-manager-field">

                <span>
                  Reporting Manager *
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
                  ) =>
                    setSelectedManagerId(
                      event.target
                        .value
                    )
                  }
                >

                  <option value="">
                    Select Reporting Manager
                  </option>

                  {filteredManagerOptions.map(
                    (
                      manager
                    ) => (
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
                        {manager
                          ?.fullName}
                        {" — "}
                        {manager
                          ?.designation ||
                          "Employee"}
                        {" — "}
                        {manager
                          ?.employeeCode ||
                          ""}
                        {" — "}
                        {departmentName(
                          manager
                        )}
                      </option>
                    )
                  )}

                </select>

                <small>
                  Selecting another manager moves this employee
                  into the new reporting hierarchy.
                </small>

              </label>

              {/* SELECTED PREVIEW */}

              {selectedManager ? (
                <div className="employee-hierarchy-manager-preview">

                  <div className="employee-hierarchy-avatar">
                    {initials(
                      selectedManager
                        ?.fullName
                    )}
                  </div>

                  <div>

                    <span>
                      NEW REPORTING LINE
                    </span>

                    <strong>
                      {selectedManager
                        ?.fullName}
                      {" "}
                      →
                      {" "}
                      {targetEmployee
                        ?.fullName}
                    </strong>

                    <small>
                      {selectedManager
                        ?.designation ||
                        "Manager"}
                      {" · "}
                      {departmentName(
                        selectedManager
                      )}
                    </small>

                  </div>

                </div>
              ) : null}

              {/* LOADING */}

              {managerLoading ? (
                <div className="employee-hierarchy-manager-loading">
                  Loading employees...
                </div>
              ) : null}

              {/* ERROR */}

              {managerError ? (
                <div className="employee-hierarchy-manager-error">
                  {managerError}
                </div>
              ) : null}

              {/* NOTE */}

              <div className="employee-hierarchy-manager-note">

                <strong>
                  How hierarchy works
                </strong>

                <p>
                  You only assign the immediate reporting manager.
                  The Head → Manager → Senior → Junior structure is
                  generated automatically from reporting relationships.
                </p>

              </div>

            </div>

            {/* =============================================
                FOOTER
            ============================================= */}

            <div className="employee-hierarchy-modal-footer">

              <div>

                {(targetEmployee
                  ?.reportsTo ||
                  targetEmployee
                    ?.reportingManager) ? (
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
                  onClick={() =>
                    setManagerModalOpen(
                      false
                    )
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
                    ? "Saving Hierarchy..."
                    : "Save Hierarchy"}
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