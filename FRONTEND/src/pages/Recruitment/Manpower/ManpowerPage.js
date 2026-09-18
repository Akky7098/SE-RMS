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
    key:
      "ALL",

    label:
      "All",
  },

  {
    key:
      "PENDING_APPROVAL",

    label:
      "Pending",
  },

  {
    key:
      "APPROVED",

    label:
      "Approved",
  },

  {
    key:
      "HIRING_IN_PROGRESS",

    label:
      "Hiring",
  },

  {
    key:
      "FILLED",

    label:
      "Filled",
  },

  {
    key:
      "REJECTED",

    label:
      "Rejected",
  },
];

/* =========================================================
   STORED USER

   Used only for UI presentation.

   Backend remains final authority for:
   - visibility
   - approval
   - rejection
========================================================= */

const getStoredUser =
  () => {
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

const normalizeId =
  (
    value
  ) => {
    if (
      value ===
        null ||
      value ===
        undefined
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

   Handles:
   []
   { records: [] }
   { requirements: [] }

   This provides another safe layer even if service shape
   changes later.
========================================================= */

const normalizeRequirementResult =
  (
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
   COMPONENT
========================================================= */

const ManpowerPage =
  () => {
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
       FILTER STATE
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
       LOAD
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

          /* ===============================================
             REQUIREMENT LIST
          ================================================ */

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

          /* ===============================================
             APPROVAL INBOX

             403 simply means user has no approval authority.
          ================================================ */

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
       APPROVAL RECORD MAP

       Backend inbox is authoritative.

       We still remove own requests from actionable IDs,
       because requester must never approve own manpower.
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

              /*
               * Own request must never become an approval
               * action in frontend.
               *
               * Backend must enforce this as well.
               */
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
       REQUESTS CREATED BY CURRENT USER
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

       Counts apply to currently fetched accessible list.
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

            mine:
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

              const requesterId =
                normalizeId(
                  item
                    ?.requestedBy
                );

              if (
                requesterId &&
                currentUserId &&
                requesterId ===
                  currentUserId
              ) {
                counts.mine +=
                  1;
              }
            }
          );

          return counts;
        },
        [
          requirements,
          currentUserId,
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

       Reloads data, then opens created request.
    ===================================================== */

    const handleCreated =
      async (
        created
      ) => {
        /*
         * Reset filter so a newly created PENDING request
         * cannot disappear because user was looking at
         * Approved/Hiring/etc.
         */
        setStatus(
          "ALL"
        );

        setSearch(
          ""
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

        /*
         * Fetch after navigation.
         *
         * The status/search state change will also trigger
         * another safe refresh through useEffect.
         */
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

       Global SUPER_ADMIN inbox may represent oversight of
       pending approvals rather than all being assigned
       directly to that person.
    ===================================================== */

    const approvalInboxLabel =
      isGlobalSuperAdmin
        ? "Pending approval oversight"
        : "Awaiting my approval";

    /* =====================================================
       RENDER
    ===================================================== */

    return (
      <div className="se-mpr-page">
        {/* =================================================
            PAGE HEADER
        ================================================== */}

        <section className="se-mpr-page-head">
          <div>
            <span>
              HIRING • MANPOWER
            </span>

            <h2>
              Manpower Requests
            </h2>

            <p>
              Raise demand, track approval
              and drill into every manpower
              requirement from one view.
            </p>
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
                Total Requests
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
                Pending Approval
              </span>
            </div>
          </button>

          <button
            type="button"
            className={
              status ===
              "APPROVED"
                ? "active blue"
                : "blue"
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
                Hiring Active
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
              placeholder="Search by request number or position..."
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
                Unable to load manpower requests
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
          <div className="se-mpr-list-head">
            <div>
              <span>
                REQUIREMENTS
              </span>

              <strong>
                {loading
                  ? "Loading..."
                  : `${requirements.length} visible request${
                      requirements.length ===
                      1
                        ? ""
                        : "s"
                    }`}
              </strong>
            </div>

            <p>
              Click any row for full
              requirement detail.
            </p>
          </div>

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
            <div className="se-mpr-table-wrap">
              <table className="se-mpr-table">
                <thead>
                  <tr>
                    <th>
                      Request
                    </th>

                    <th>
                      Department
                    </th>

                    <th>
                      Openings
                    </th>

                    <th>
                      Priority
                    </th>

                    <th>
                      Required By
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Owner / Approver
                    </th>

                    <th />
                  </tr>
                </thead>

                <tbody>
                  {requirements.map(
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

                      return (
                        <tr
                          key={
                            id ||
                            requirement
                              ?.requestNumber
                          }
                          onClick={() =>
                            openRequirement(
                              requirement
                            )
                          }
                        >
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
                                    "Request"
                                  )}

                                  {isMine
                                    ? " · Raised by me"
                                    : ""}
                                </span>
                              </div>
                            </div>
                          </td>

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

                          <td>
                            <span className="se-mpr-openings">
                              {Number(
                                requirement
                                  ?.numberOfOpenings ||
                                  0
                              )}
                            </span>
                          </td>

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

                          <td>
                            <strong className="se-mpr-table-main-text">
                              {formatRecruitmentDate(
                                requirement
                                  ?.requiredByDate
                              )}
                            </strong>
                          </td>

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
                                  {isMine
                                    ? requirement
                                        ?.currentApprover
                                      ? "Waiting for approval"
                                      : requirement
                                          ?.assignedHr
                                        ? "Hiring owner"
                                        : "Raised by you"
                                    : canApprove
                                      ? "Needs your approval"
                                      : requirement
                                          ?.currentApprover
                                        ? "Approver"
                                        : requirement
                                            ?.assignedHr
                                          ? "Hiring owner"
                                          : "Workflow"}
                                </small>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className="se-mpr-row-arrow">
                              →
                            </span>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <RecruitmentEmptyState
              icon="M"
              title="No manpower requests found"
              description={
                search ||
                status !==
                  "ALL"
                  ? "Try changing the current search or status filter."
                  : "Raise the first manpower requirement to start the recruitment workflow."
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