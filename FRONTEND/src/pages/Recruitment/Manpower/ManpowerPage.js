import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  getManpowerApprovalInbox,
  getManpowerRequirements,
} from "../../../services/manpowerService";

import RecruitmentStatusBadge from "../components/RecruitmentStatusBadge";

import RecruitmentEmptyState from "../components/RecruitmentEmptyState";

import ManpowerRequestForm from "./ManpowerRequestForm";

import ManpowerDetailDrawer from "./ManpowerDetailDrawer";

import {
  buildRecruitmentUrl,
  formatRecruitmentDate,
  getApiErrorMessage,
  getManpowerStatusMeta,
  getPriorityMeta,
  getRecordId,
  safeText,
} from "../utils/recruitmentHelpers";

import "./Manpower.css";

/* =========================================================
   STATUS TABS
========================================================= */

const STATUS_TABS = [
  {
    key: "ALL",
    label: "All",
  },

  {
    key: "PENDING_APPROVAL",
    label: "Pending",
  },

  {
    key: "APPROVED",
    label: "Approved",
  },

  {
    key: "HIRING_IN_PROGRESS",
    label: "Hiring",
  },

  {
    key: "FILLED",
    label: "Filled",
  },

  {
    key: "REJECTED",
    label: "Rejected",
  },
];

/* =========================================================
   PAGINATION
========================================================= */

const PAGE_SIZE = 50;

/* =========================================================
   STORED USER
========================================================= */

const getStoredUser = () => {
  const keys = [
    "se_rms_user",
    "user",
  ];

  for (
    const key of keys
  ) {
    try {
      const raw =
        localStorage.getItem(
          key
        );

      if (
        !raw
      ) {
        continue;
      }

      const parsed =
        JSON.parse(
          raw
        );

      if (
        parsed
      ) {
        return parsed;
      }
    } catch (
      error
    ) {
      /*
       * Ignore malformed cached values.
       */
    }
  }

  return {};
};

/* =========================================================
   ID NORMALIZER
========================================================= */

const normalizeId = (
  value
) => {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (
    typeof value ===
    "object"
  ) {
    return String(
      value?._id ||
      value?.id ||
      ""
    );
  }

  return String(
    value
  );
};

/* =========================================================
   LIST RESULT NORMALIZER
========================================================= */

const normalizeRequirementResult = (
  value
) => {
  if (
    Array.isArray(
      value
    )
  ) {
    return value;
  }

  if (
    Array.isArray(
      value?.records
    )
  ) {
    return value.records;
  }

  if (
    Array.isArray(
      value?.requirements
    )
  ) {
    return value.requirements;
  }

  if (
    Array.isArray(
      value?.items
    )
  ) {
    return value.items;
  }

  return [];
};

/* =========================================================
   STATUS ROW CLASS
========================================================= */

const getRowStatusClass = (
  status
) => {
  const value =
    String(
      status ||
      ""
    )
      .trim()
      .toUpperCase();

  switch (
    value
  ) {
    case "PENDING_APPROVAL":
      return "se-mpr-row-pending";

    case "APPROVED":
      return "se-mpr-row-approved";

    case "REJECTED":
      return "se-mpr-row-rejected";

    case "HIRING_IN_PROGRESS":
      return "se-mpr-row-hiring";

    case "FILLED":
      return "se-mpr-row-filled";

    default:
      return "se-mpr-row-default";
  }
};

/* =========================================================
   COMPONENT
========================================================= */

const ManpowerPage = () => {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  /* =====================================================
     CURRENT USER
  ===================================================== */

  const currentUser =
    useMemo(
      () =>
        getStoredUser(),
      []
    );

  const currentUserId =
    normalizeId(
      currentUser
    );

  const currentRole =
    String(
      currentUser?.systemRole ||
      currentUser?.role ||
      ""
    )
      .trim()
      .toUpperCase();

  const isGlobalSuperAdmin =
    currentRole ===
    "SUPER_ADMIN";

  /* =====================================================
     URL STATE
  ===================================================== */

  const params =
    useMemo(
      () =>
        new URLSearchParams(
          location.search
        ),
      [
        location.search,
      ]
    );

  const selectedId =
    params.get(
      "id"
    ) ||
    "";

  const createOpen =
    params.get(
      "create"
    ) ===
    "true";

  /* =====================================================
     DATA
  ===================================================== */

  const [
    requirements,
    setRequirements,
  ] = useState(
    []
  );

  const [
    approvalInbox,
    setApprovalInbox,
  ] = useState(
    []
  );

  const [
    loading,
    setLoading,
  ] = useState(
    true
  );

  const [
    refreshing,
    setRefreshing,
  ] = useState(
    false
  );

  const [
    error,
    setError,
  ] = useState(
    ""
  );

  /* =====================================================
     FILTERS
  ===================================================== */

  const [
    search,
    setSearch,
  ] = useState(
    ""
  );

  const [
    debouncedSearch,
    setDebouncedSearch,
  ] = useState(
    ""
  );

  const [
    status,
    setStatus,
  ] = useState(
    "ALL"
  );

  /* =====================================================
     PAGINATION
  ===================================================== */

  const [
    currentPage,
    setCurrentPage,
  ] = useState(
    1
  );

  /* =====================================================
     SEARCH DEBOUNCE
  ===================================================== */

  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          setDebouncedSearch(
            search.trim()
          );
        },
        300
      );

    return () =>
      window.clearTimeout(
        timer
      );
  }, [
    search,
  ]);

  /* =====================================================
     RESET PAGE WHEN FILTER CHANGES
  ===================================================== */

  useEffect(() => {
    setCurrentPage(
      1
    );
  }, [
    status,
    debouncedSearch,
  ]);

  /* =====================================================
     LOAD REQUIREMENTS
  ===================================================== */

  const loadRequirements =
    useCallback(
      async ({
        silent = false,
      } = {}) => {
        if (
          silent
        ) {
          setRefreshing(
            true
          );
        } else {
          setLoading(
            true
          );
        }

        setError(
          ""
        );

        const requestParams =
          {};

        if (
          status !==
          "ALL"
        ) {
          requestParams.status =
            status;
        }

        if (
          debouncedSearch
        ) {
          requestParams.search =
            debouncedSearch;
        }

        const [
          listResult,
          approvalResult,
        ] =
          await Promise.allSettled([
            getManpowerRequirements(
              requestParams
            ),

            getManpowerApprovalInbox(),
          ]);

        if (
          listResult.status ===
          "fulfilled"
        ) {
          const records =
            normalizeRequirementResult(
              listResult.value
            );

          setRequirements(
            records
          );
        } else {
          setRequirements(
            []
          );

          setError(
            getApiErrorMessage(
              listResult.reason,
              "Manpower requests could not be loaded."
            )
          );
        }

        if (
          approvalResult.status ===
          "fulfilled"
        ) {
          setApprovalInbox(
            Array.isArray(
              approvalResult.value
            )
              ? approvalResult.value
              : []
          );
        } else {
          setApprovalInbox(
            []
          );
        }

        setLoading(
          false
        );

        setRefreshing(
          false
        );
      },
      [
        status,
        debouncedSearch,
      ]
    );

  useEffect(() => {
    loadRequirements();
  }, [
    loadRequirements,
  ]);

  /* =====================================================
     APPROVAL IDS
  ===================================================== */

  const actionableApprovalIds =
    useMemo(
      () => {
        const ids =
          new Set();

        approvalInbox.forEach(
          (
            requirement
          ) => {
            const id =
              getRecordId(
                requirement
              );

            if (
              !id
            ) {
              return;
            }

            const requesterId =
              normalizeId(
                requirement
                  ?.requestedBy
              );

            if (
              requesterId &&
              currentUserId &&
              requesterId ===
                currentUserId
            ) {
              return;
            }

            ids.add(
              id
            );
          }
        );

        return ids;
      },
      [
        approvalInbox,
        currentUserId,
      ]
    );

  /* =====================================================
     MY REQUEST IDS
  ===================================================== */

  const myRequestIds =
    useMemo(
      () => {
        const ids =
          new Set();

        requirements.forEach(
          (
            requirement
          ) => {
            const requesterId =
              normalizeId(
                requirement
                  ?.requestedBy
              );

            if (
              requesterId &&
              currentUserId &&
              requesterId ===
                currentUserId
            ) {
              const id =
                getRecordId(
                  requirement
                );

              if (
                id
              ) {
                ids.add(
                  id
                );
              }
            }
          }
        );

        return ids;
      },
      [
        requirements,
        currentUserId,
      ]
    );

  /* =====================================================
     SUMMARY
  ===================================================== */

  const summary =
    useMemo(
      () => {
        const counts = {
          total:
            requirements.length,

          pending:
            0,

          approved:
            0,

          hiring:
            0,

          urgent:
            0,
        };

        requirements.forEach(
          (
            item
          ) => {
            const itemStatus =
              String(
                item?.status ||
                ""
              ).toUpperCase();

            if (
              itemStatus ===
              "PENDING_APPROVAL"
            ) {
              counts.pending +=
                1;
            }

            if (
              itemStatus ===
              "APPROVED"
            ) {
              counts.approved +=
                1;
            }

            if (
              itemStatus ===
              "HIRING_IN_PROGRESS"
            ) {
              counts.hiring +=
                1;
            }

            if (
              String(
                item?.priority ||
                ""
              ).toUpperCase() ===
              "URGENT"
            ) {
              counts.urgent +=
                1;
            }
          }
        );

        return counts;
      },
      [
        requirements,
      ]
    );

  /* =====================================================
     PAGINATED RECORDS
  ===================================================== */

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        requirements.length /
        PAGE_SIZE
      )
    );

  useEffect(() => {
    if (
      currentPage >
      totalPages
    ) {
      setCurrentPage(
        totalPages
      );
    }
  }, [
    currentPage,
    totalPages,
  ]);

  const paginatedRequirements =
    useMemo(
      () => {
        const start =
          (
            currentPage -
            1
          ) *
          PAGE_SIZE;

        return requirements.slice(
          start,
          start +
            PAGE_SIZE
        );
      },
      [
        requirements,
        currentPage,
      ]
    );

  const firstVisibleRecord =
    requirements.length
      ? (
          currentPage -
          1
        ) *
          PAGE_SIZE +
        1
      : 0;

  const lastVisibleRecord =
    Math.min(
      currentPage *
        PAGE_SIZE,
      requirements.length
    );

  /* =====================================================
     PAGINATION BUTTONS
  ===================================================== */

  const paginationPages =
    useMemo(
      () => {
        if (
          totalPages <=
          7
        ) {
          return Array.from(
            {
              length:
                totalPages,
            },
            (
              _,
              index
            ) =>
              index +
              1
          );
        }

        const pages =
          new Set([
            1,
            totalPages,
            currentPage,
            currentPage -
              1,
            currentPage +
              1,
          ]);

        return Array.from(
          pages
        )
          .filter(
            (
              page
            ) =>
              page >=
                1 &&
              page <=
                totalPages
          )
          .sort(
            (
              a,
              b
            ) =>
              a -
              b
          );
      },
      [
        totalPages,
        currentPage,
      ]
    );

  /* =====================================================
     URL HELPERS
  ===================================================== */

  const openCreate =
    () => {
      navigate(
        buildRecruitmentUrl(
          "manpower",
          {
            create:
              "true",
          }
        )
      );
    };

  const closeOverlay =
    () => {
      navigate(
        buildRecruitmentUrl(
          "manpower"
        ),
        {
          replace:
            true,
        }
      );
    };

  const openRequirement =
    (
      requirement
    ) => {
      const id =
        getRecordId(
          requirement
        );

      if (
        !id
      ) {
        return;
      }

      navigate(
        buildRecruitmentUrl(
          "manpower",
          {
            id,
          }
        )
      );
    };

  /* =====================================================
     CREATE CALLBACK
  ===================================================== */

  const handleCreated =
    async (
      created
    ) => {
      setStatus(
        "ALL"
      );

      setSearch(
        ""
      );

      setCurrentPage(
        1
      );

      const id =
        getRecordId(
          created
        );

      if (
        id
      ) {
        navigate(
          buildRecruitmentUrl(
            "manpower",
            {
              id,
            }
          ),
          {
            replace:
              true,
          }
        );
      } else {
        closeOverlay();
      }

      await loadRequirements({
        silent:
          true,
      });
    };

  /* =====================================================
     CHANGE CALLBACK
  ===================================================== */

  const handleChanged =
    async () => {
      await loadRequirements({
        silent:
          true,
      });
    };

  /* =====================================================
     APPROVAL LABEL
  ===================================================== */

  const approvalInboxLabel =
    isGlobalSuperAdmin
      ? "Approval Oversight"
      : "My Approvals";

  /* =====================================================
     RENDER
  ===================================================== */

  return (
  <div className="se-mpr-page">
  {/* =================================================
      PAGE HEADER
  ================================================== */}

  <section className="se-mpr-page-head se-mpr-factory-header">

    {/* =================================================
        FACTORY WORKFORCE ANIMATION
        ONE WORKER:
        WALK → WAIT → GATE OPEN → ENTER → GATE CLOSE
    ================================================== */}

    <div
      className="se-mpr-workforce-scene"
      aria-hidden="true"
    >
      {/* ===============================================
          WALKING WORKER
      =============================================== */}

      <div className="se-mpr-walker">
        {/* side-facing head */}
        <div className="se-mpr-walker-head">
          <span className="se-mpr-helmet" />
        </div>

        {/* safety vest / body */}
        <div className="se-mpr-walker-body">
          <span className="se-mpr-vest-line" />
        </div>

        {/* walking arms */}
        <span className="se-mpr-arm se-mpr-arm--left" />
        <span className="se-mpr-arm se-mpr-arm--right" />

        {/* walking legs */}
        <span className="se-mpr-leg se-mpr-leg--left" />
        <span className="se-mpr-leg se-mpr-leg--right" />
      </div>


      {/* ===============================================
          FACTORY
      =============================================== */}

      <div className="se-mpr-plant">

        {/* chimneys */}
        <div className="se-mpr-plant-chimney se-mpr-plant-chimney--1" />
        <div className="se-mpr-plant-chimney se-mpr-plant-chimney--2" />


        {/* factory saw-tooth roof */}
        <div className="se-mpr-plant-roof">
          <span />
          <span />
          <span />
        </div>


        {/* main factory building */}
        <div className="se-mpr-plant-building">

          {/* ===========================================
              LEFT-SIDE FACTORY ENTRY

              Worker reaches THIS point.
              Gate opens.
              Worker enters.
              Gate closes.
          =========================================== */}

          <div className="se-mpr-plant-entry">

            {/* dark factory interior */}
            <div className="se-mpr-entry-dark" />

            {/* animated sliding gate */}
            <div className="se-mpr-entry-gate">
              <span />
              <span />
              <span />
              <span />
            </div>

          </div>


          {/* factory company name */}
          <div className="se-mpr-plant-sign">
            SANDEEP EDGETECH
          </div>


          {/* factory windows */}
          <div className="se-mpr-plant-windows">
            <span />
            <span />
            <span />
          </div>

        </div>
      </div>


      {/* ground/path */}
      <div className="se-mpr-scene-ground" />
    </div>


    {/* =================================================
        EXISTING HEADER TITLE
    ================================================== */}

    <div className="se-mpr-factory-header-copy">
      <span>
        MANPOWER
      </span>

      <h2>
        Manpower Requests
      </h2>
    </div>

  <div className="se-mpr-head-actions">
          <button
            type="button"
            className="se-mpr-refresh"
            onClick={() =>
              loadRequirements({
                silent:
                  true,
              })
            }
            disabled={
              refreshing
            }
          >
            ↻

            <span>
              {refreshing
                ? "Refreshing"
                : "Refresh"}
            </span>
          </button>

          <button
            type="button"
            className="se-mpr-create-btn"
            onClick={
              openCreate
            }
          >
            <span>
              +
            </span>

            New Manpower Request
          </button>
        </div>
      </section>

      

      {/* =================================================
          SUMMARY
      ================================================== */}

      <section className="se-mpr-summary-grid">
        <button
          type="button"
          className={
            status ===
            "ALL"
              ? "active neutral"
              : "neutral"
          }
          onClick={() =>
            setStatus(
              "ALL"
            )
          }
        >
          <span className="se-mpr-summary-icon">
            M
          </span>

          <div>
            <strong>
              {
                summary.total
              }
            </strong>

            <span>
              Total
            </span>
          </div>
        </button>

        <button
          type="button"
          className={
            status ===
            "PENDING_APPROVAL"
              ? "active amber"
              : "amber"
          }
          onClick={() =>
            setStatus(
              "PENDING_APPROVAL"
            )
          }
        >
          <span className="se-mpr-summary-icon">
            ◷
          </span>

          <div>
            <strong>
              {
                summary.pending
              }
            </strong>

            <span>
              Pending
            </span>
          </div>
        </button>

        <button
          type="button"
          className={
            status ===
            "APPROVED"
              ? "active green"
              : "green"
          }
          onClick={() =>
            setStatus(
              "APPROVED"
            )
          }
        >
          <span className="se-mpr-summary-icon">
            ✓
          </span>

          <div>
            <strong>
              {
                summary.approved
              }
            </strong>

            <span>
              Approved
            </span>
          </div>
        </button>

        <button
          type="button"
          className={
            status ===
            "HIRING_IN_PROGRESS"
              ? "active purple"
              : "purple"
          }
          onClick={() =>
            setStatus(
              "HIRING_IN_PROGRESS"
            )
          }
        >
          <span className="se-mpr-summary-icon">
            H
          </span>

          <div>
            <strong>
              {
                summary.hiring
              }
            </strong>

            <span>
              Hiring
            </span>
          </div>
        </button>

        <button
          type="button"
          className="red"
          onClick={() => {
            setStatus(
              "ALL"
            );

            setSearch(
              ""
            );
          }}
        >
          <span className="se-mpr-summary-icon">
            !
          </span>

          <div>
            <strong>
              {
                summary.urgent
              }
            </strong>

            <span>
              Urgent
            </span>
          </div>
        </button>
      </section>

      {/* =================================================
          TOOLBAR
      ================================================== */}

      <section className="se-mpr-toolbar">
        <div className="se-mpr-search">
          <span>
            ⌕
          </span>

          <input
            type="search"
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
            placeholder="Search request, position..."
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

        <div className="se-mpr-status-tabs">
          {STATUS_TABS.map(
            (
              tab
            ) => (
              <button
                key={
                  tab.key
                }
                type="button"
                className={
                  status ===
                  tab.key
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setStatus(
                    tab.key
                  )
                }
              >
                {
                  tab.label
                }
              </button>
            )
          )}
        </div>

        {approvalInbox.length >
        0 ? (
          <button
            type="button"
            className="se-mpr-approval-inbox-pill"
            onClick={() =>
              setStatus(
                "PENDING_APPROVAL"
              )
            }
          >
            <span>
              {
                approvalInbox.length
              }
            </span>

            {
              approvalInboxLabel
            }
          </button>
        ) : null}
      </section>

      {/* =================================================
          ERROR
      ================================================== */}

      {error ? (
        <div className="se-mpr-error">
          <span>
            !
          </span>

          <div>
            <strong>
              Unable to load requests
            </strong>

            <p>
              {
                error
              }
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              loadRequirements()
            }
          >
            Retry
          </button>
        </div>
      ) : null}

      {/* =================================================
          TABLE
      ================================================== */}

      <section className="se-mpr-list-panel">
        {loading ? (
          <div className="se-mpr-table-skeleton">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        ) : requirements.length >
          0 ? (
          <>
            <div className="se-mpr-table-wrap">
              <table className="se-mpr-table">
                <thead>
                  <tr>
                    <th className="se-mpr-col-request">
                      Request
                    </th>

                    <th className="se-mpr-col-department">
                      Department
                    </th>

                    <th className="se-mpr-col-openings">
                      Openings
                    </th>

                    <th className="se-mpr-col-priority">
                      Priority
                    </th>

                    <th className="se-mpr-col-date">
                      Required By
                    </th>

                    <th className="se-mpr-col-status">
                      Status
                    </th>

                    <th className="se-mpr-col-person">
                      Owner / Approver
                    </th>

                    <th className="se-mpr-col-action">
                      View
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedRequirements.map(
                    (
                      requirement
                    ) => {
                      const id =
                        getRecordId(
                          requirement
                        );

                      const itemStatus =
                        getManpowerStatusMeta(
                          requirement
                            ?.status
                        );

                      const priority =
                        getPriorityMeta(
                          requirement
                            ?.priority
                        );

                      const requesterId =
                        normalizeId(
                          requirement
                            ?.requestedBy
                        );

                      const isMine =
                        Boolean(
                          requesterId &&
                          currentUserId &&
                          requesterId ===
                            currentUserId
                        );

                      const canApprove =
                        Boolean(
                          id &&
                          actionableApprovalIds.has(
                            id
                          )
                        );

                      const person =
                        requirement
                          ?.currentApprover ||
                        requirement
                          ?.assignedHr ||
                        requirement
                          ?.approvedBy ||
                        null;

                      const rowClass =
                        getRowStatusClass(
                          requirement
                            ?.status
                        );

                      return (
  <tr
    key={
      id ||
      requirement
        ?.requestNumber
    }
    className={`se-mpr-row se-mpr-row-${String(
      requirement?.status || "unknown"
    )
      .trim()
      .toLowerCase()
      .replaceAll("_", "-")
      .replaceAll(" ", "-")}`}
    onClick={() =>
      openRequirement(
        requirement
      )
    }
  >
                          {/* REQUEST */}

                          <td>
                            <div className="se-mpr-role-cell">
                              <span className="se-mpr-role-icon">
                                {safeText(
                                  requirement
                                    ?.positionTitle,
                                  "M"
                                )
                                  .charAt(
                                    0
                                  )
                                  .toUpperCase()}
                              </span>

                              <div>
                                <strong>
                                  {safeText(
                                    requirement
                                      ?.positionTitle,
                                    "Open Position"
                                  )}
                                </strong>

                                <span>
                                  {safeText(
                                    requirement
                                      ?.requestNumber,
                                    "—"
                                  )}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* DEPARTMENT */}

                          <td>
                            <strong className="se-mpr-table-main-text">
                              {safeText(
                                requirement
                                  ?.department
                                  ?.name,
                                "—"
                              )}
                            </strong>
                          </td>

                          {/* OPENINGS */}

                          <td>
                            <span className="se-mpr-openings">
                              {Number(
                                requirement
                                  ?.numberOfOpenings ||
                                0
                              )}
                            </span>
                          </td>

                          {/* PRIORITY */}

                          <td>
                            <RecruitmentStatusBadge
                              label={
                                priority.label
                              }
                              tone={
                                priority.tone
                              }
                            />
                          </td>

                          {/* REQUIRED DATE */}

                          <td>
                            <strong className="se-mpr-table-main-text">
                              {formatRecruitmentDate(
                                requirement
                                  ?.requiredByDate
                              )}
                            </strong>
                          </td>

                          {/* STATUS */}

                          <td>
                            <RecruitmentStatusBadge
                              label={
                                itemStatus.label
                              }
                              tone={
                                itemStatus.tone
                              }
                            />
                          </td>

                          {/* APPROVER */}

                          <td>
                            <div className="se-mpr-person-cell">
                              <span>
                                {safeText(
                                  person
                                    ?.displayName,
                                  "—"
                                )
                                  .charAt(
                                    0
                                  )
                                  .toUpperCase()}
                              </span>

                              <div>
                                <strong>
                                  {safeText(
                                    person
                                      ?.displayName,
                                    "Not assigned"
                                  )}
                                </strong>

                                <small>
                                  {canApprove
                                    ? "Approval required"
                                    : isMine &&
                                        requirement
                                          ?.currentApprover
                                      ? "Pending approval"
                                      : requirement
                                          ?.currentApprover
                                        ? "Approver"
                                        : requirement
                                            ?.assignedHr
                                          ? "Hiring owner"
                                          : "—"}
                                </small>
                              </div>
                            </div>
                          </td>

                          {/* ACTION */}

                          <td>
                            <button
                              type="button"
                              className="se-mpr-table-view-btn"
                              aria-label={`View ${safeText(
                                requirement
                                  ?.requestNumber,
                                "request"
                              )}`}
                              onClick={(
                                event
                              ) => {
                                event.stopPropagation();

                                openRequirement(
                                  requirement
                                );
                              }}
                            >
                              →
                            </button>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>

            {/* =================================================
                PAGINATION
            ================================================== */}

            <div className="se-mpr-pagination">
              <div className="se-mpr-pagination-info">
                <strong>
                  {
                    firstVisibleRecord
                  }
                  –
                  {
                    lastVisibleRecord
                  }
                </strong>

                <span>
                  of{" "}
                  {
                    requirements.length
                  }
                </span>

                <span className="se-mpr-page-size">
                  50 per page
                </span>
              </div>

              <div className="se-mpr-pagination-controls">
                <button
                  type="button"
                  className="se-mpr-page-nav"
                  disabled={
                    currentPage ===
                    1
                  }
                  onClick={() =>
                    setCurrentPage(
                      (
                        page
                      ) =>
                        Math.max(
                          1,
                          page -
                            1
                        )
                    )
                  }
                  aria-label="Previous page"
                >
                  ‹
                </button>

                {paginationPages.map(
                  (
                    page,
                    index
                  ) => {
                    const previous =
                      paginationPages[
                        index -
                          1
                      ];

                    const showGap =
                      previous &&
                      page -
                        previous >
                        1;

                    return (
                      <React.Fragment
                        key={
                          page
                        }
                      >
                        {showGap ? (
                          <span className="se-mpr-page-gap">
                            …
                          </span>
                        ) : null}

                        <button
                          type="button"
                          className={
                            currentPage ===
                            page
                              ? "se-mpr-page-number active"
                              : "se-mpr-page-number"
                          }
                          onClick={() =>
                            setCurrentPage(
                              page
                            )
                          }
                        >
                          {
                            page
                          }
                        </button>
                      </React.Fragment>
                    );
                  }
                )}

                <button
                  type="button"
                  className="se-mpr-page-nav"
                  disabled={
                    currentPage ===
                    totalPages
                  }
                  onClick={() =>
                    setCurrentPage(
                      (
                        page
                      ) =>
                        Math.min(
                          totalPages,
                          page +
                            1
                        )
                    )
                  }
                  aria-label="Next page"
                >
                  ›
                </button>
              </div>
            </div>
          </>
        ) : (
          <RecruitmentEmptyState
            icon="M"
            title="No manpower requests"
            description={
              search ||
              status !==
                "ALL"
                ? "No records match the current filter."
                : "No manpower requests available."
            }
          />
        )}
      </section>

      {/* =================================================
          CREATE MODAL
      ================================================== */}

      <ManpowerRequestForm
        open={
          createOpen
        }
        onClose={
          closeOverlay
        }
        onCreated={
          handleCreated
        }
      />

      {/* =================================================
          DETAIL DRAWER
      ================================================== */}

      <ManpowerDetailDrawer
        open={
          Boolean(
            selectedId
          )
        }
        requirementId={
          selectedId
        }
        canApprove={
          Boolean(
            selectedId &&
            actionableApprovalIds.has(
              selectedId
            ) &&
            !myRequestIds.has(
              selectedId
            )
          )
        }
        onClose={
          closeOverlay
        }
        onChanged={
          handleChanged
        }
      />
    </div>
  );
};

export default ManpowerPage;