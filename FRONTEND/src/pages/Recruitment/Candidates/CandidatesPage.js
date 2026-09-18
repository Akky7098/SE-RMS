import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  getHrHiringQueue,
  getMyHiring,
} from "../../../services/manpowerService";

import {
  getRequirementCandidates,
} from "../../../services/recruitmentService";

import RecruitmentStatusBadge from "../components/RecruitmentStatusBadge";

import RecruitmentEmptyState from "../components/RecruitmentEmptyState";

import RequirementSelectModal from "./RequirementSelectModal";

import AddCandidateDrawer from "./AddCandidateDrawer";

import {
  buildCandidateDetailUrl,
  formatRecruitmentDate,
  getCandidateStatusMeta,
  getRecordId,
  safeText,
} from "../utils/recruitmentHelpers";

import "./CandidateEntry.css";

import "./Candidates.css";

/* =========================================================
   STATUS FILTERS
========================================================= */

const FILTERS = [
  {
    key:
      "ALL",

    label:
      "All",
  },

  {
    key:
      "NEW",

    label:
      "New",
  },

  {
    key:
      "CONTACT",

    label:
      "Contact",
  },

  {
    key:
      "FOLLOW_UP",

    label:
      "Follow-up",
  },

  {
    key:
      "SCREENING",

    label:
      "Screening",
  },

  {
    key:
      "SHORTLISTED",

    label:
      "Shortlisted",
  },

  {
    key:
      "INTERVIEW",

    label:
      "Interview",
  },

  {
    key:
      "SELECTED",

    label:
      "Selected",
  },

  {
    key:
      "REJECTED",

    label:
      "Rejected",
  },
];

/* =========================================================
   STATUS GROUP
========================================================= */

const candidateGroup = (
  status
) => {
  const value =
    String(
      status ||
        ""
    ).toUpperCase();

  if (
    [
      "NEW",
      "CONTACT_PENDING",
    ].includes(
      value
    )
  ) {
    return "NEW";
  }

  if (
    [
      "CONTACTED",
    ].includes(
      value
    )
  ) {
    return "CONTACT";
  }

  if (
    value ===
    "FOLLOW_UP"
  ) {
    return "FOLLOW_UP";
  }

  if (
    [
      "SCREENING_PENDING",
      "SCREENED",
    ].includes(
      value
    )
  ) {
    return "SCREENING";
  }

  if (
    value ===
    "SHORTLISTED"
  ) {
    return "SHORTLISTED";
  }

  if (
    [
      "INTERVIEW_PENDING",
      "INTERVIEW_SCHEDULED",
      "INTERVIEWED",
    ].includes(
      value
    )
  ) {
    return "INTERVIEW";
  }

  if (
    [
      "SELECTED",
      "LOI_PENDING",
      "LOI_SENT",
      "LOI_ACCEPTED",
      "OFFER_PENDING",
      "OFFER_SENT",
      "OFFER_ACCEPTED",
      "JOINING_CONFIRMED",
      "DOCUMENT_PENDING",
      "DOCUMENT_VERIFICATION",
      "READY_FOR_ONBOARDING",
      "JOINED",
    ].includes(
      value
    )
  ) {
    return "SELECTED";
  }

  if (
    [
      "NOT_INTERESTED",
      "REJECTED_SCREENING",
      "REJECTED_INTERVIEW",
      "LOI_DECLINED",
      "OFFER_DECLINED",
      "CLOSED",
    ].includes(
      value
    )
  ) {
    return "REJECTED";
  }

  return value;
};

/* =========================================================
   UNIQUE REQUIREMENTS
========================================================= */

const uniqueRequirements = (
  records = []
) => {
  const map =
    new Map();

  records.forEach(
    (
      item
    ) => {
      const id =
        getRecordId(
          item
        );

      if (
        id
      ) {
        map.set(
          String(
            id
          ),
          item
        );
      }
    }
  );

  return Array.from(
    map.values()
  );
};

/* =========================================================
   COMPONENT
========================================================= */

const CandidatesPage =
  () => {
    const navigate =
      useNavigate();

    const [
      requirements,
      setRequirements,
    ] = useState([]);

    const [
      candidates,
      setCandidates,
    ] = useState([]);

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

    const [
      search,
      setSearch,
    ] = useState("");

    const [
      filter,
      setFilter,
    ] = useState(
      "ALL"
    );

    const [
      requirementFilter,
      setRequirementFilter,
    ] = useState(
      "ALL"
    );

    const [
      selectRequirementOpen,
      setSelectRequirementOpen,
    ] = useState(false);

    const [
      selectedRequirement,
      setSelectedRequirement,
    ] = useState(null);

    /* =====================================================
       LOAD
    ===================================================== */

    const loadCandidates =
      useCallback(
        async (
          silent = false
        ) => {
          try {
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

            /*
             * Different users have different hiring access.
             * We intentionally try both.
             */

            const requirementResults =
              await Promise.allSettled([
                getHrHiringQueue(),

                getMyHiring(),
              ]);

            const combinedRequirements =
              [];

            requirementResults.forEach(
              (
                result
              ) => {
                if (
                  result.status ===
                    "fulfilled" &&
                  Array.isArray(
                    result.value
                  )
                ) {
                  combinedRequirements.push(
                    ...result.value
                  );
                }
              }
            );

            const accessibleRequirements =
              uniqueRequirements(
                combinedRequirements
              );

            setRequirements(
              accessibleRequirements
            );

            /*
             * Current backend lists candidates by MPR,
             * therefore load candidates for accessible MPRs.
             */

            const candidateResults =
              await Promise.allSettled(
                accessibleRequirements.map(
                  (
                    requirement
                  ) =>
                    getRequirementCandidates(
                      getRecordId(
                        requirement
                      )
                    )
                )
              );

            const combinedCandidates =
              [];

            candidateResults.forEach(
              (
                result,
                index
              ) => {
                if (
                  result.status !==
                    "fulfilled" ||
                  !Array.isArray(
                    result.value
                  )
                ) {
                  return;
                }

                const sourceRequirement =
                  accessibleRequirements[
                    index
                  ];

                result.value.forEach(
                  (
                    candidate
                  ) => {
                    combinedCandidates.push({
                      ...candidate,

                      /*
                       * Ensure requirement is still available
                       * even if backend candidate populate is
                       * minimal.
                       */

                      _requirement:
                        sourceRequirement,
                    });
                  }
                );
              }
            );

            /*
             * Candidate may appear through queue + My Hiring.
             * De-duplicate by candidate ID.
             */

            const candidateMap =
              new Map();

            combinedCandidates.forEach(
              (
                candidate
              ) => {
                const id =
                  getRecordId(
                    candidate
                  );

                if (
                  id
                ) {
                  candidateMap.set(
                    String(
                      id
                    ),
                    candidate
                  );
                }
              }
            );

            setCandidates(
              Array.from(
                candidateMap.values()
              ).sort(
                (
                  a,
                  b
                ) =>
                  new Date(
                    b?.updatedAt ||
                      b?.createdAt ||
                      0
                  ).getTime() -
                  new Date(
                    a?.updatedAt ||
                      a?.createdAt ||
                      0
                  ).getTime()
              )
            );

            if (
              accessibleRequirements.length ===
                0 &&
              requirementResults.every(
                (
                  result
                ) =>
                  result.status ===
                  "rejected"
              )
            ) {
              setError(
                "No recruitment hiring data is accessible for your account."
              );
            }
          } catch (
            loadError
          ) {
            setError(
              loadError?.response?.data
                ?.message ||
                loadError?.message ||
                "Candidates could not be loaded."
            );
          } finally {
            setLoading(
              false
            );

            setRefreshing(
              false
            );
          }
        },
        []
      );

    useEffect(() => {
      loadCandidates();
    }, [
      loadCandidates,
    ]);

    /* =====================================================
       METRICS
    ===================================================== */

    const metrics =
      useMemo(() => {
        const data = {
          total:
            candidates.length,

          new: 0,

          followUp: 0,

          screening: 0,

          shortlisted: 0,

          interview: 0,

          selected: 0,
        };

        candidates.forEach(
          (
            candidate
          ) => {
            const group =
              candidateGroup(
                candidate
                  ?.status
              );

            if (
              group ===
                "NEW" ||
              group ===
                "CONTACT"
            ) {
              data.new +=
                1;
            }

            if (
              group ===
              "FOLLOW_UP"
            ) {
              data.followUp +=
                1;
            }

            if (
              group ===
              "SCREENING"
            ) {
              data.screening +=
                1;
            }

            if (
              group ===
              "SHORTLISTED"
            ) {
              data.shortlisted +=
                1;
            }

            if (
              group ===
              "INTERVIEW"
            ) {
              data.interview +=
                1;
            }

            if (
              group ===
              "SELECTED"
            ) {
              data.selected +=
                1;
            }
          }
        );

        return data;
      }, [
        candidates,
      ]);

    /* =====================================================
       FILTERED
    ===================================================== */

    const visibleCandidates =
      useMemo(() => {
        const keyword =
          String(
            search ||
              ""
          )
            .trim()
            .toLowerCase();

        return candidates.filter(
          (
            candidate
          ) => {
            const group =
              candidateGroup(
                candidate?.status
              );

            if (
              filter !==
                "ALL" &&
              group !==
                filter
            ) {
              return false;
            }

            const requirement =
              candidate
                ?._requirement ||
              candidate
                ?.manpowerRequirement;

            const candidateRequirementId =
              getRecordId(
                requirement
              );

            if (
              requirementFilter !==
                "ALL" &&
              String(
                candidateRequirementId
              ) !==
                String(
                  requirementFilter
                )
            ) {
              return false;
            }

            if (
              !keyword
            ) {
              return true;
            }

            return [
              candidate
                ?.candidateNumber,

              candidate
                ?.fullName,

              candidate
                ?.mobile,

              candidate
                ?.email,

              candidate
                ?.currentCompany,

              candidate
                ?.currentDesignation,

              requirement
                ?.positionTitle,

              requirement
                ?.requestNumber,

              candidate
                ?.department
                ?.name,
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
              );
          }
        );
      }, [
        candidates,
        filter,
        search,
        requirementFilter,
      ]);

    /* =====================================================
       REQUIREMENT SELECT
    ===================================================== */

    const handleRequirementSelect =
      (
        requirement
      ) => {
        setSelectRequirementOpen(
          false
        );

        setSelectedRequirement(
          requirement
        );
      };

    /* =====================================================
       CREATED
    ===================================================== */

    const handleCandidateCreated =
      async (
        candidate
      ) => {
        setSelectedRequirement(
          null
        );

        await loadCandidates(
          true
        );

        const id =
          getRecordId(
            candidate
          );

        if (
          id
        ) {
          navigate(
            buildCandidateDetailUrl(
              id
            )
          );
        }
      };

    return (
      <section className="se-candidates-page">
        {/* =================================================
            HEADER
        ================================================== */}

        <header className="se-candidates-head">
          <div>
            <span>
              CANDIDATES · TALENT PIPELINE
            </span>

            <h1>
              Candidates
            </h1>

            <p>
              One drill-down view for every
              candidate across your
              accessible hiring
              requirements.
            </p>
          </div>

          <div className="se-candidates-head-actions">
            <button
              type="button"
              className="refresh"
              disabled={
                refreshing
              }
              onClick={() =>
                loadCandidates(
                  true
                )
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
              className="add"
              onClick={() =>
                setSelectRequirementOpen(
                  true
                )
              }
            >
              <span>
                +
              </span>

              Add Candidate
            </button>
          </div>
        </header>

        {/* =================================================
            METRICS
        ================================================== */}

        <div className="se-candidate-metrics">
          <button
            type="button"
            className={
              filter ===
              "ALL"
                ? "active"
                : ""
            }
            onClick={() =>
              setFilter(
                "ALL"
              )
            }
          >
            <span className="icon total">
              C
            </span>

            <div>
              <strong>
                {
                  metrics.total
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
              filter ===
              "NEW"
                ? "active"
                : ""
            }
            onClick={() =>
              setFilter(
                "NEW"
              )
            }
          >
            <span className="icon new">
              +
            </span>

            <div>
              <strong>
                {
                  metrics.new
                }
              </strong>

              <span>
                New / Contact
              </span>
            </div>
          </button>

          <button
            type="button"
            className={
              filter ===
              "FOLLOW_UP"
                ? "active"
                : ""
            }
            onClick={() =>
              setFilter(
                "FOLLOW_UP"
              )
            }
          >
            <span className="icon follow">
              ↻
            </span>

            <div>
              <strong>
                {
                  metrics.followUp
                }
              </strong>

              <span>
                Follow-ups
              </span>
            </div>
          </button>

          <button
            type="button"
            className={
              filter ===
              "SHORTLISTED"
                ? "active"
                : ""
            }
            onClick={() =>
              setFilter(
                "SHORTLISTED"
              )
            }
          >
            <span className="icon shortlisted">
              ✓
            </span>

            <div>
              <strong>
                {
                  metrics.shortlisted
                }
              </strong>

              <span>
                Shortlisted
              </span>
            </div>
          </button>

          <button
            type="button"
            className={
              filter ===
              "INTERVIEW"
                ? "active"
                : ""
            }
            onClick={() =>
              setFilter(
                "INTERVIEW"
              )
            }
          >
            <span className="icon interview">
              I
            </span>

            <div>
              <strong>
                {
                  metrics.interview
                }
              </strong>

              <span>
                Interview
              </span>
            </div>
          </button>

          <button
            type="button"
            className={
              filter ===
              "SELECTED"
                ? "active"
                : ""
            }
            onClick={() =>
              setFilter(
                "SELECTED"
              )
            }
          >
            <span className="icon selected">
              ★
            </span>

            <div>
              <strong>
                {
                  metrics.selected
                }
              </strong>

              <span>
                Selected
              </span>
            </div>
          </button>
        </div>

        {/* =================================================
            FILTER BAR
        ================================================== */}

        <div className="se-candidate-toolbar">
          <div className="se-candidate-global-search">
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
              placeholder="Search candidate, mobile, email, company, MPR..."
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

          <select
            value={
              requirementFilter
            }
            onChange={(
              event
            ) =>
              setRequirementFilter(
                event
                  .target
                  .value
              )
            }
          >
            <option value="ALL">
              All Hiring Requirements
            </option>

            {requirements.map(
              (
                requirement
              ) => (
                <option
                  key={
                    getRecordId(
                      requirement
                    )
                  }
                  value={
                    getRecordId(
                      requirement
                    )
                  }
                >
                  {safeText(
                    requirement
                      ?.requestNumber,
                    "MPR"
                  )}

                  {" — "}

                  {safeText(
                    requirement
                      ?.positionTitle,
                    "Position"
                  )}
                </option>
              )
            )}
          </select>

          <span className="se-candidate-visible-count">
            <strong>
              {
                visibleCandidates.length
              }
            </strong>

            visible
          </span>
        </div>

        {/* =================================================
            STATUS TABS
        ================================================== */}

        <div className="se-candidate-status-tabs">
          {FILTERS.map(
            (
              item
            ) => (
              <button
                type="button"
                key={
                  item.key
                }
                className={
                  filter ===
                  item.key
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setFilter(
                    item.key
                  )
                }
              >
                {
                  item.label
                }
              </button>
            )
          )}
        </div>

        {error ? (
          <div className="se-candidate-global-error">
            <span>
              !
            </span>

            <p>
              {
                error
              }
            </p>
          </div>
        ) : null}

        {/* =================================================
            TABLE
        ================================================== */}

        <article className="se-candidate-list-panel">
          <div className="se-candidate-list-title">
            <div>
              <span>
                TALENT DATABASE
              </span>

              <strong>
                Candidate Pipeline
              </strong>
            </div>

            <p>
              Click any candidate for
              complete recruitment history
              and actions.
            </p>
          </div>

          {loading ? (
            <div className="se-candidate-list-loading">
              <span />
              <span />
              <span />
              <span />
            </div>
          ) : visibleCandidates.length >
            0 ? (
            <div className="se-candidate-table-wrap">
              <table className="se-candidate-table">
                <thead>
                  <tr>
                    <th>
                      Candidate
                    </th>

                    <th>
                      Hiring For
                    </th>

                    <th>
                      Experience
                    </th>

                    <th>
                      Contact
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Next Action
                    </th>

                    <th>
                      Updated
                    </th>

                    <th />
                  </tr>
                </thead>

                <tbody>
                  {visibleCandidates.map(
                    (
                      candidate
                    ) => {
                      const id =
                        getRecordId(
                          candidate
                        );

                      const requirement =
                        candidate
                          ?._requirement ||
                        candidate
                          ?.manpowerRequirement ||
                        {};

                      const statusMeta =
                        getCandidateStatusMeta(
                          candidate
                            ?.status
                        );

                      return (
                        <tr
                          key={
                            id
                          }
                          onClick={() =>
                            navigate(
                              buildCandidateDetailUrl(
                                id
                              )
                            )
                          }
                        >
                          <td>
                            <div className="se-candidate-person">
                              <span>
                                {safeText(
                                  candidate
                                    ?.fullName,
                                  "C"
                                )
                                  .charAt(
                                    0
                                  )
                                  .toUpperCase()}
                              </span>

                              <div>
                                <strong>
                                  {safeText(
                                    candidate
                                      ?.fullName,
                                    "Candidate"
                                  )}
                                </strong>

                                <small>
                                  {safeText(
                                    candidate
                                      ?.candidateNumber,
                                    "Candidate"
                                  )}

                                  {" · "}

                                  {safeText(
                                    candidate
                                      ?.currentDesignation,
                                    "Designation not specified"
                                  )}
                                </small>
                              </div>
                            </div>
                          </td>

                          <td>
                            <strong className="se-candidate-role">
                              {safeText(
                                requirement
                                  ?.positionTitle,
                                candidate
                                  ?.positionTitle ||
                                  "Position"
                              )}
                            </strong>

                            <small className="se-candidate-role-sub">
                              {safeText(
                                requirement
                                  ?.requestNumber,
                                "MPR"
                              )}
                            </small>
                          </td>

                          <td>
                            <strong>
                              {candidate
                                ?.totalExperienceYears ??
                                "—"}
                            </strong>

                            <small className="se-candidate-role-sub">
                              years
                            </small>
                          </td>

                          <td>
                            <strong className="se-candidate-contact">
                              {safeText(
                                candidate
                                  ?.mobile,
                                "—"
                              )}
                            </strong>

                            <small className="se-candidate-role-sub">
                              {safeText(
                                candidate
                                  ?.email,
                                ""
                              )}
                            </small>
                          </td>

                          <td>
                            <RecruitmentStatusBadge
                              label={
                                statusMeta.label
                              }
                              tone={
                                statusMeta.tone
                              }
                            />
                          </td>

                          <td>
                            <span className="se-candidate-next-action">
                              {safeText(
                                candidate
                                  ?.nextAction,
                                "NONE"
                              ).replaceAll(
                                "_",
                                " "
                              )}
                            </span>
                          </td>

                          <td>
                            <span className="se-candidate-date">
                              {formatRecruitmentDate(
                                candidate
                                  ?.updatedAt ||
                                  candidate
                                    ?.createdAt
                              )}
                            </span>
                          </td>

                          <td>
                            <span className="se-candidate-table-arrow">
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
              icon="C"
              title="No candidates found"
              description={
                search ||
                filter !==
                  "ALL"
                  ? "No candidates match the current search or filter."
                  : "Add the first candidate against an active hiring requirement."
              }
            />
          )}
        </article>

        {/* =================================================
            SELECT REQUIREMENT
        ================================================== */}

        <RequirementSelectModal
          open={
            selectRequirementOpen
          }
          onClose={() =>
            setSelectRequirementOpen(
              false
            )
          }
          onSelect={
            handleRequirementSelect
          }
        />

        {/* =================================================
            EXISTING STEP 6 DRAWER
        ================================================== */}

        <AddCandidateDrawer
          open={
            Boolean(
              selectedRequirement
            )
          }
          requirement={
            selectedRequirement
          }
          onClose={() =>
            setSelectedRequirement(
              null
            )
          }
          onCreated={
            handleCandidateCreated
          }
        />
      </section>
    );
  };

export default CandidatesPage;