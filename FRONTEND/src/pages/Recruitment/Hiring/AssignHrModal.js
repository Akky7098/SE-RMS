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

const getUserFromMember = (
  member
) =>
  member?.user ||
  member ||
  {};

const getUserId = (
  member
) => {
  const user =
    getUserFromMember(
      member
    );

  return (
    user?._id ||
    user?.id ||
    ""
  );
};

const getUserName = (
  member
) => {
  const user =
    getUserFromMember(
      member
    );

  return safeText(
    user?.displayName ||
      user?.name,
    "HR Employee"
  );
};

const getUserEmail = (
  member
) => {
  const user =
    getUserFromMember(
      member
    );

  return safeText(
    user?.email,
    "No email"
  );
};

const formatDepartmentRole = (
  role
) =>
  safeText(
    role,
    "HR Member"
  )
    .replaceAll(
      "_",
      " "
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      (
        value
      ) =>
        value.toUpperCase()
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
  const [
    employees,
    setEmployees,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    assigning,
    setAssigning,
  ] = useState(false);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    selectedId,
    setSelectedId,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const currentOwnerId =
    requirement
      ?.assignedHr
      ?._id ||
    requirement
      ?.assignedHr ||
    "";

  /* =========================================================
     RESET / LOAD
  ========================================================= */

  useEffect(() => {
    if (
      !open
    ) {
      return;
    }

    let active =
      true;

    setSearch(
      ""
    );

    setSelectedId(
      String(
        currentOwnerId ||
          ""
      )
    );

    setError(
      ""
    );

    const load =
      async () => {
        try {
          setLoading(
            true
          );

          const result =
            await getAvailableHrEmployees();

          if (
            active
          ) {
            setEmployees(
              Array.isArray(
                result
              )
                ? result
                : []
            );
          }
        } catch (
          loadError
        ) {
          if (
            active
          ) {
            setError(
              getApiErrorMessage(
                loadError,
                "HR employees could not be loaded."
              )
            );
          }
        } finally {
          if (
            active
          ) {
            setLoading(
              false
            );
          }
        }
      };

    load();

    return () => {
      active =
        false;
    };
  }, [
    open,
    currentOwnerId,
  ]);

  /* =========================================================
     ESC
  ========================================================= */

  useEffect(() => {
    if (
      !open
    ) {
      return undefined;
    }

    const handleKeyDown =
      (
        event
      ) => {
        if (
          event.key ===
            "Escape" &&
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
      const keyword =
        String(
          search || ""
        )
          .trim()
          .toLowerCase();

      if (
        !keyword
      ) {
        return employees;
      }

      return employees.filter(
        (
          member
        ) =>
          [
            getUserName(
              member
            ),

            getUserEmail(
              member
            ),

            member
              ?.departmentRole,
          ]
            .filter(
              Boolean
            )
            .join(
              " "
            )
            .toLowerCase()
            .includes(
              keyword
            )
      );
    }, [
      employees,
      search,
    ]);

  const selectedMember =
    useMemo(
      () =>
        employees.find(
          (
            member
          ) =>
            String(
              getUserId(
                member
              )
            ) ===
            String(
              selectedId
            )
        ) || null,
      [
        employees,
        selectedId,
      ]
    );

  const selectionUnchanged =
    Boolean(
      selectedId &&
      String(
        selectedId
      ) ===
        String(
          currentOwnerId
        )
    );

  /* =========================================================
     ASSIGN
  ========================================================= */

  const handleAssign =
    async () => {
      const requirementId =
        getRecordId(
          requirement
        );

      if (
        !requirementId
      ) {
        setError(
          "Requirement ID is missing."
        );

        return;
      }

      if (
        !selectedId
      ) {
        setError(
          "Please select an HR employee."
        );

        return;
      }

      if (
        selectionUnchanged
      ) {
        setError(
          "This employee is already the hiring owner."
        );

        return;
      }

      try {
        setAssigning(
          true
        );

        setError(
          ""
        );

        const updated =
          await assignHrToRequirement(
            requirementId,
            selectedId
          );

        await onAssigned?.(
          updated
        );
      } catch (
        assignError
      ) {
        setError(
          getApiErrorMessage(
            assignError,
            "HR owner could not be assigned."
          )
        );
      } finally {
        setAssigning(
          false
        );
      }
    };

  if (
    !open
  ) {
    return null;
  }

  return (
    <div
      className="se-hiring-modal-overlay"
      onMouseDown={() => {
        if (
          !assigning
        ) {
          onClose?.();
        }
      }}
    >
      <section
        className="se-hiring-assign-modal"
        onMouseDown={(
          event
        ) =>
          event.stopPropagation()
        }
        role="dialog"
        aria-modal="true"
      >
        {/* =================================================
            HEADER
        ================================================== */}

        <header className="se-hiring-modal-head">
          <div>
            <span>
              HIRING OWNERSHIP
            </span>

            <h2>
              {currentOwnerId
                ? "Reassign Hiring Owner"
                : "Assign Hiring Owner"}
            </h2>

            <p>
              {safeText(
                requirement
                  ?.requestNumber,
                "Requirement"
              )}

              {" · "}

              {safeText(
                requirement
                  ?.positionTitle,
                "Position"
              )}
            </p>
          </div>

          <button
            type="button"
            className="se-hiring-modal-close"
            onClick={
              onClose
            }
            disabled={
              assigning
            }
          >
            ×
          </button>
        </header>

        {/* =================================================
            REQUIREMENT SUMMARY
        ================================================== */}

        <div className="se-hiring-modal-role-summary">
          <div>
            <span>
              DEPARTMENT
            </span>

            <strong>
              {safeText(
                requirement
                  ?.department
                  ?.name,
                "Department"
              )}
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

            <strong>
              {safeText(
                requirement
                  ?.assignedHr
                  ?.displayName,
                "Not assigned"
              )}
            </strong>
          </div>
        </div>

        <div className="se-hiring-assignment-note">
          <span>
            i
          </span>

          <p>
            Select the HR employee who
            will own candidate sourcing,
            calls, screening, follow-ups
            and interview coordination
            for this requirement.
          </p>
        </div>

        {/* =================================================
            SEARCH
        ================================================== */}

        <div className="se-hiring-employee-search">
          <span>
            ⌕
          </span>

          <input
            type="text"
            value={
              search
            }
            onChange={(
              event
            ) =>
              setSearch(
                event
                  .target
                  .value
              )
            }
            placeholder="Search HR employee by name, email or role..."
          />

          {search ? (
            <button
              type="button"
              onClick={() =>
                setSearch(
                  ""
                )
              }
            >
              ×
            </button>
          ) : null}
        </div>

        {/* =================================================
            ERROR
        ================================================== */}

        {error ? (
          <div className="se-hiring-error">
            <span>
              !
            </span>

            <div>
              <strong>
                Unable to continue
              </strong>

              <p>
                {
                  error
                }
              </p>
            </div>
          </div>
        ) : null}

        {/* =================================================
            HR TEAM
        ================================================== */}

        <div className="se-hiring-employee-list">
          {loading ? (
            <div className="se-hiring-loading-state">
              <span className="se-hiring-spinner" />

              <p>
                Loading HR team...
              </p>
            </div>
          ) : null}

          {!loading &&
          filteredEmployees.length ===
            0 ? (
            <div className="se-hiring-empty-team">
              <span>
                H
              </span>

              <strong>
                No matching HR employees
              </strong>

              <p>
                Active members of the HR
                department will appear
                here.
              </p>
            </div>
          ) : null}

          {!loading
            ? filteredEmployees.map(
                (
                  member
                ) => {
                  const userId =
                    String(
                      getUserId(
                        member
                      )
                    );

                  const selected =
                    userId ===
                    String(
                      selectedId
                    );

                  const current =
                    userId ===
                    String(
                      currentOwnerId
                    );

                  return (
                    <button
                      type="button"
                      key={
                        userId
                      }
                      disabled={
                        assigning
                      }
                      className={[
                        "se-hiring-employee-option",

                        selected
                          ? "selected"
                          : "",

                        current
                          ? "current"
                          : "",
                      ]
                        .filter(
                          Boolean
                        )
                        .join(
                          " "
                        )}
                      onClick={() => {
                        setSelectedId(
                          userId
                        );

                        setError(
                          ""
                        );
                      }}
                    >
                      <span className="se-hiring-employee-avatar">
                        {getUserName(
                          member
                        )
                          .charAt(
                            0
                          )
                          .toUpperCase()}
                      </span>

                      <span className="se-hiring-employee-info">
                        <strong>
                          {getUserName(
                            member
                          )}
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

                      <span className="se-hiring-radio">
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

        {/* =================================================
            SELECTED PREVIEW
        ================================================== */}

        {selectedMember &&
        !selectionUnchanged ? (
          <div className="se-hiring-selected-preview">
            <span className="se-hiring-selected-avatar">
              {getUserName(
                selectedMember
              )
                .charAt(
                  0
                )
                .toUpperCase()}
            </span>

            <div>
              <span>
                SELECTED HIRING OWNER
              </span>

              <strong>
                {getUserName(
                  selectedMember
                )}
              </strong>

              <small>
                {formatDepartmentRole(
                  selectedMember
                    ?.departmentRole
                )}
              </small>
            </div>

            <span className="check">
              ✓
            </span>
          </div>
        ) : null}

        {/* =================================================
            ACTIONS
        ================================================== */}

        <footer className="se-hiring-modal-actions">
          <button
            type="button"
            className="secondary"
            onClick={
              onClose
            }
            disabled={
              assigning
            }
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
            onClick={
              handleAssign
            }
          >
            {assigning ? (
              <>
                <span className="se-hiring-mini-spinner" />

                Saving Assignment...
              </>
            ) : currentOwnerId ? (
              <>
                Confirm Reassignment

                <span>
                  →
                </span>
              </>
            ) : (
              <>
                Assign Hiring Owner

                <span>
                  →
                </span>
              </>
            )}
          </button>
        </footer>
      </section>
    </div>
  );
};

export default AssignHrModal;