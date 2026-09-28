import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  assignHrToRequirement,
  getAvailableHrEmployees,
} from "../../../services/manpowerService";

import {
  getApiErrorMessage,
  getRecordId,
  safeText,
} from "../utils/recruitmentHelpers";

/* =========================================================
   HELPERS
========================================================= */

const getUserFromMember = (member) =>
  member?.user || member || {};

const getUserId = (member) => {
  const user = getUserFromMember(member);

  return user?._id || user?.id || "";
};

const getUserName = (member) => {
  const user = getUserFromMember(member);

  return safeText(
    user?.displayName || user?.name,
    "HR Employee"
  );
};

const getUserEmail = (member) => {
  const user = getUserFromMember(member);

  return safeText(
    user?.email,
    "No email"
  );
};

const formatDepartmentRole = (role) =>
  safeText(role, "HR Member")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (value) => value.toUpperCase()
    );

/* =========================================================
   COMPONENT
========================================================= */

const AssignHrModal = ({
  open,
  requirement,
  onClose,
  onAssigned,
}) => {
  const [employees, setEmployees] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [assigning, setAssigning] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [selectedId, setSelectedId] =
    useState("");

  const [error, setError] =
    useState("");

  const currentOwnerId =
    requirement?.assignedHr?._id ||
    requirement?.assignedHr ||
    "";

  /* =========================================================
     LOAD HR TEAM
  ========================================================= */

  useEffect(() => {
    if (!open) {
      return;
    }

    let active = true;

    setSearch("");
    setSelectedId(
      String(currentOwnerId || "")
    );
    setError("");

    const loadEmployees = async () => {
      try {
        setLoading(true);

        const result =
          await getAvailableHrEmployees();

        if (active) {
          setEmployees(
            Array.isArray(result)
              ? result
              : []
          );
        }
      } catch (loadError) {
        if (active) {
          setError(
            getApiErrorMessage(
              loadError,
              "HR employees could not be loaded."
            )
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadEmployees();

    return () => {
      active = false;
    };
  }, [
    open,
    currentOwnerId,
  ]);

  /* =========================================================
     ESC CLOSE
  ========================================================= */

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (
        event.key === "Escape" &&
        !assigning
      ) {
        onClose?.();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () =>
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
  }, [
    open,
    assigning,
    onClose,
  ]);

  /* =========================================================
     FILTER
  ========================================================= */

  const filteredEmployees =
    useMemo(() => {
      const keyword = String(
        search || ""
      )
        .trim()
        .toLowerCase();

      if (!keyword) {
        return employees;
      }

      return employees.filter(
        (member) =>
          [
            getUserName(member),
            getUserEmail(member),
            member?.departmentRole,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(keyword)
      );
    }, [
      employees,
      search,
    ]);

  const selectionUnchanged =
    Boolean(
      selectedId &&
      String(selectedId) ===
        String(currentOwnerId)
    );

  /* =========================================================
     ASSIGN
  ========================================================= */

  const handleAssign = async () => {
    const requirementId =
      getRecordId(requirement);

    if (!requirementId) {
      setError(
        "Requirement ID is missing."
      );
      return;
    }

    if (!selectedId) {
      setError(
        "Select an HR employee."
      );
      return;
    }

    if (selectionUnchanged) {
      setError(
        "This employee is already assigned."
      );
      return;
    }

    try {
      setAssigning(true);
      setError("");

      const updated =
        await assignHrToRequirement(
          requirementId,
          selectedId
        );

      await onAssigned?.(updated);
    } catch (assignError) {
      setError(
        getApiErrorMessage(
          assignError,
          "HR owner could not be assigned."
        )
      );
    } finally {
      setAssigning(false);
    }
  };

  if (!open) {
    return null;
  }

  const positionTitle =
    safeText(
      requirement?.positionTitle,
      "Position"
    );

  const requestNumber =
    safeText(
      requirement?.requestNumber,
      "MPR"
    );

  const departmentName =
    safeText(
      requirement?.department?.name ||
        requirement?.departmentName,
      "Department"
    );

  const currentOwnerName =
    safeText(
      requirement?.assignedHr
        ?.displayName ||
        requirement?.assignedHr?.name,
      "Not assigned"
    );

  return (
    <div
      className="se-hiring-modal-overlay"
      onMouseDown={() => {
        if (!assigning) {
          onClose?.();
        }
      }}
    >
      <section
        className="se-hiring-assign-modal"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-hiring-owner-title"
      >
        {/* HEADER */}

        <header className="se-hiring-modal-head">
          <div className="se-hiring-modal-title">
            <span className="se-hiring-modal-eyebrow">
              HIRING OWNER
            </span>

            <h2 id="assign-hiring-owner-title">
              {currentOwnerId
                ? "Reassign Hiring Owner"
                : "Assign Hiring Owner"}
            </h2>

            <p>
              <strong>
                {requestNumber}
              </strong>

              <span>•</span>

              {positionTitle}
            </p>
          </div>

          <button
            type="button"
            className="se-hiring-modal-close"
            onClick={onClose}
            disabled={assigning}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        {/* REQUIREMENT SUMMARY */}

        <div className="se-hiring-modal-role-summary">
          <div>
            <span>
              DEPARTMENT
            </span>

            <strong>
              {departmentName}
            </strong>
          </div>

          <div>
            <span>
              OPENINGS
            </span>

            <strong>
              {Number(
                requirement
                  ?.numberOfOpenings ||
                  0
              )}
            </strong>
          </div>

          <div>
            <span>
              CURRENT OWNER
            </span>

            <strong
              className={
                currentOwnerId
                  ? ""
                  : "is-unassigned"
              }
            >
              {currentOwnerName}
            </strong>
          </div>
        </div>

        {/* SEARCH */}

        <div className="se-hiring-employee-search">
          <span className="se-hiring-search-icon">
            ⌕
          </span>

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search HR by name, email or role"
            autoFocus
          />

          {search ? (
            <button
              type="button"
              className="se-hiring-search-clear"
              onClick={() =>
                setSearch("")
              }
              aria-label="Clear search"
            >
              ×
            </button>
          ) : null}
        </div>

        {/* ERROR */}

        {error ? (
          <div className="se-hiring-error">
            <span>!</span>

            <p>
              {error}
            </p>
          </div>
        ) : null}

        {/* EMPLOYEE LIST */}

        <div className="se-hiring-employee-list">
          {loading ? (
            <div className="se-hiring-loading-state">
              <span className="se-hiring-spinner" />

              <strong>
                Loading HR team...
              </strong>
            </div>
          ) : null}

          {!loading &&
          filteredEmployees.length === 0 ? (
            <div className="se-hiring-empty-team">
              <span>H</span>

              <div>
                <strong>
                  No HR employees found
                </strong>

                <p>
                  Try another name,
                  email or role.
                </p>
              </div>
            </div>
          ) : null}

          {!loading
            ? filteredEmployees.map(
                (member) => {
                  const userId =
                    String(
                      getUserId(member)
                    );

                  const selected =
                    userId ===
                    String(selectedId);

                  const current =
                    userId ===
                    String(
                      currentOwnerId
                    );

                  const name =
                    getUserName(member);

                  return (
                    <button
                      type="button"
                      key={userId}
                      disabled={assigning}
                      className={[
                        "se-hiring-employee-option",
                        selected
                          ? "selected"
                          : "",
                        current
                          ? "current"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => {
                        setSelectedId(
                          userId
                        );

                        setError("");
                      }}
                    >
                      <span className="se-hiring-employee-avatar">
                        {name
                          .charAt(0)
                          .toUpperCase()}
                      </span>

                      <span className="se-hiring-employee-info">
                        <strong>
                          {name}
                        </strong>

                        <small>
                          {getUserEmail(
                            member
                          )}
                        </small>
                      </span>

                      <span className="se-hiring-employee-role">
                        {formatDepartmentRole(
                          member
                            ?.departmentRole
                        )}
                      </span>

                      {current ? (
                        <span className="se-hiring-current-pill">
                          Current
                        </span>
                      ) : null}

                      <span
                        className="se-hiring-radio"
                        aria-hidden="true"
                      >
                        {selected
                          ? "✓"
                          : ""}
                      </span>
                    </button>
                  );
                }
              )
            : null}
        </div>

        {/* FOOTER */}

        <footer className="se-hiring-modal-actions">
          <div className="se-hiring-modal-selection">
            {selectedId &&
            !selectionUnchanged ? (
              <>
                <span className="check">
                  ✓
                </span>

                <span>
                  HR owner selected
                </span>
              </>
            ) : (
              <span>
                Select an HR owner
              </span>
            )}
          </div>

          <div className="se-hiring-modal-buttons">
            <button
              type="button"
              className="secondary"
              onClick={onClose}
              disabled={assigning}
            >
              Cancel
            </button>

            <button
              type="button"
              className="primary"
              disabled={
                !selectedId ||
                assigning ||
                selectionUnchanged
              }
              onClick={handleAssign}
            >
              {assigning
                ? "Saving..."
                : currentOwnerId
                  ? "Reassign Owner"
                  : "Assign Owner"}

              {!assigning ? (
                <span>→</span>
              ) : null}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
};

export default AssignHrModal;