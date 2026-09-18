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
  getManpowerRequirement,
} from "../../../services/manpowerService";

import {
  getRequirementCandidates,
  getMyRecruitmentTasks,
} from "../../../services/recruitmentService";

import {
  getInterviews,
} from "../../../services/interviewService";

import HiringWorkspaceHeader from "./HiringWorkspaceHeader";

import HiringPipeline from "./HiringPipeline";

import AddCandidateDrawer from "../Candidates/AddCandidateDrawer";

import RecruitmentStatusBadge from "../components/RecruitmentStatusBadge";

import RecruitmentEmptyState from "../components/RecruitmentEmptyState";

import {
  buildCandidateDetailUrl,
  buildRecruitmentUrl,
  formatRecruitmentDate,
  formatRecruitmentDateTime,
  getApiErrorMessage,
  getCandidateStatusMeta,
  getNextActionMeta,
  getRecordId,
  safeText,
} from "../utils/recruitmentHelpers";

import "../Candidates/CandidateEntry.css";

import "./HiringWorkspace.css";

/* =========================================================
   TAB DEFINITIONS
========================================================= */

const TABS = [
  {
    key:
      "overview",

    label:
      "Overview",
  },

  {
    key:
      "candidates",

    label:
      "Candidates",
  },

  {
    key:
      "follow-ups",

    label:
      "Follow-ups",
  },

  {
    key:
      "interviews",

    label:
      "Interviews",
  },
];

/* =========================================================
   COMPONENT
========================================================= */

const HiringWorkspacePage =
  () => {
    const location =
      useLocation();

    const navigate =
      useNavigate();

    /* =====================================================
       URL PARAMS
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

    const requirementId =
      params.get(
        "id"
      ) || "";

    const sourcePage =
      String(
        params.get(
          "from"
        ) ||
          "my-hiring"
      )
        .trim()
        .toLowerCase();

    const tabFromUrl =
      String(
        params.get(
          "tab"
        ) ||
          "overview"
      )
        .trim()
        .toLowerCase();

    const addCandidateRequested =
      params.get(
        "addCandidate"
      ) ===
      "true";

    const candidateStatusFilter =
      String(
        params.get(
          "status"
        ) ||
          ""
      )
        .trim()
        .toUpperCase();

    /* =====================================================
       STATE
    ===================================================== */

    const [
      activeTab,
      setActiveTab,
    ] = useState(
      TABS.some(
        (
          item
        ) =>
          item.key ===
          tabFromUrl
      )
        ? tabFromUrl
        : "overview"
    );

    const [
      requirement,
      setRequirement,
    ] = useState(
      null
    );

    const [
      candidates,
      setCandidates,
    ] = useState(
      []
    );

    const [
      tasks,
      setTasks,
    ] = useState(
      []
    );

    const [
      interviews,
      setInterviews,
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

    const [
      actionMessage,
      setActionMessage,
    ] = useState(
      null
    );

    /* =====================================================
       TAB SYNC
    ===================================================== */

    useEffect(() => {
      const valid =
        TABS.some(
          (
            item
          ) =>
            item.key ===
            tabFromUrl
        );

      setActiveTab(
        valid
          ? tabFromUrl
          : "overview"
      );
    }, [
      tabFromUrl,
    ]);

    /* =====================================================
       LOAD WORKSPACE

       Requirement is mandatory.

       Candidate/task/interview endpoints are supplementary.
    ===================================================== */

    const loadWorkspace =
      useCallback(
        async (
          silent = false
        ) => {
          if (
            !requirementId
          ) {
            setError(
              "Hiring requirement ID is missing."
            );

            setLoading(
              false
            );

            return;
          }

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

            const results =
              await Promise.allSettled([
                getManpowerRequirement(
                  requirementId
                ),

                getRequirementCandidates(
                  requirementId
                ),

                getMyRecruitmentTasks(),

                getInterviews({
                  manpowerRequirement:
                    requirementId,
                }),
              ]);

            const [
              requirementResult,
              candidateResult,
              taskResult,
              interviewResult,
            ] =
              results;

            /* =============================================
               REQUIREMENT
            ============================================== */

            if (
              requirementResult.status ===
              "fulfilled"
            ) {
              setRequirement(
                requirementResult.value
              );
            } else {
              setRequirement(
                null
              );

              setError(
                getApiErrorMessage(
                  requirementResult.reason,
                  "Hiring requirement could not be loaded."
                )
              );
            }

            /* =============================================
               CANDIDATES
            ============================================== */

            if (
              candidateResult.status ===
              "fulfilled"
            ) {
              setCandidates(
                Array.isArray(
                  candidateResult.value
                )
                  ? candidateResult.value
                  : []
              );
            } else {
              setCandidates(
                []
              );
            }

            /* =============================================
               TASKS
            ============================================== */

            if (
              taskResult.status ===
              "fulfilled"
            ) {
              const allTasks =
                Array.isArray(
                  taskResult.value
                )
                  ? taskResult.value
                  : [];

              setTasks(
                allTasks.filter(
                  (
                    item
                  ) => {
                    const taskRequirementId =
                      item
                        ?.manpowerRequirement
                        ?._id ||
                      item
                        ?.manpowerRequirement ||
                      "";

                    return (
                      String(
                        taskRequirementId
                      ) ===
                      String(
                        requirementId
                      )
                    );
                  }
                )
              );
            } else {
              setTasks(
                []
              );
            }

            /* =============================================
               INTERVIEWS
            ============================================== */

            if (
              interviewResult.status ===
              "fulfilled"
            ) {
              const result =
                Array.isArray(
                  interviewResult.value
                )
                  ? interviewResult.value
                  : [];

              setInterviews(
                result.filter(
                  (
                    interview
                  ) => {
                    const interviewRequirement =
                      interview
                        ?.manpowerRequirement;

                    if (
                      !interviewRequirement
                    ) {
                      return true;
                    }

                    return (
                      String(
                        interviewRequirement
                          ?._id ||
                        interviewRequirement
                      ) ===
                      String(
                        requirementId
                      )
                    );
                  }
                )
              );
            } else {
              setInterviews(
                []
              );
            }
          } catch (
            loadError
          ) {
            setError(
              getApiErrorMessage(
                loadError,
                "Hiring workspace could not be loaded."
              )
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
        [
          requirementId,
        ]
      );

    /* =====================================================
       INITIAL LOAD
    ===================================================== */

    useEffect(() => {
      loadWorkspace();
    }, [
      loadWorkspace,
    ]);

    /* =====================================================
       HIRING STATE

       SINGLE SOURCE OF TRUTH FOR EVERY ADD CANDIDATE BUTTON.
    ===================================================== */

    const hiringStatus =
      String(
        requirement
          ?.status ||
          ""
      )
        .trim()
        .toUpperCase();

    const hiringActive =
      hiringStatus ===
      "HIRING_IN_PROGRESS";

    const hasHiringOwner =
      Boolean(
        requirement
          ?.assignedHr
          ?._id ||
        requirement
          ?.assignedHr
      );

    /*
     * Current frontend gate.
     *
     * Backend still remains authoritative for user permission.
     *
     * When AuthContext access normalization is wired into this
     * page later, this can become:
     *
     * hiringActive &&
     * hasPermission("RECRUITMENT", "CREATE") &&
     * ownership/management check.
     */

    const canAddCandidate =
      Boolean(
        hiringActive &&
        hasHiringOwner
      );

    const addCandidateReason =
      useMemo(() => {
        if (
          !hasHiringOwner
        ) {
          return "A hiring owner must be assigned before candidate intake can begin.";
        }

        if (
          !hiringActive
        ) {
          return "Hiring must be started by HR management before candidates can be added.";
        }

        return "";
      }, [
        hasHiringOwner,
        hiringActive,
      ]);

    /* =====================================================
       INVALID ADD-CANDIDATE URL GUARD

       Someone can manually type:
       ?addCandidate=true

       Do not allow UI state to bypass the workflow.
    ===================================================== */

    useEffect(() => {
      if (
        !requirement ||
        !addCandidateRequested ||
        canAddCandidate
      ) {
        return;
      }

      const nextUrl =
        buildRecruitmentUrl(
          "hiring-workspace",
          {
            id:
              requirementId,

            tab:
              "candidates",

            from:
              sourcePage,
          }
        );

      navigate(
        nextUrl,
        {
          replace:
            true,
        }
      );

      setActionMessage({
        type:
          "warning",

        title:
          "Candidate intake is not available yet",

        message:
          addCandidateReason,
      });
    }, [
      requirement,
      addCandidateRequested,
      canAddCandidate,
      requirementId,
      sourcePage,
      navigate,
      addCandidateReason,
    ]);

    /* =====================================================
       ADD CANDIDATE OPEN STATE
    ===================================================== */

    const addCandidateOpen =
      Boolean(
        addCandidateRequested &&
        canAddCandidate
      );

    /* =====================================================
       FOLLOW UPS
    ===================================================== */

    const followUps =
      useMemo(
        () =>
          tasks.filter(
            (
              item
            ) =>
              item
                ?.nextAction ===
              "FOLLOW_UP_CALL"
          ),
        [
          tasks,
        ]
      );

    /* =====================================================
       PIPELINE STATS
    ===================================================== */

    const pipelineStats =
      useMemo(() => {
        const stats = {
          contactPending:
            0,

          screeningPending:
            0,

          shortlisted:
            0,

          interview:
            0,

          selected:
            0,
        };

        candidates.forEach(
          (
            candidate
          ) => {
            const status =
              String(
                candidate
                  ?.status ||
                  ""
              ).toUpperCase();

            if (
              [
                "NEW",
                "CONTACT_PENDING",
                "CONTACTED",
                "FOLLOW_UP",
              ].includes(
                status
              )
            ) {
              stats.contactPending +=
                1;
            }

            if (
              [
                "SCREENING_PENDING",
                "SCREENED",
              ].includes(
                status
              )
            ) {
              stats.screeningPending +=
                1;
            }

            if (
              status ===
              "SHORTLISTED"
            ) {
              stats.shortlisted +=
                1;
            }

            if (
              [
                "INTERVIEW_PENDING",
                "INTERVIEW_SCHEDULED",
                "INTERVIEWED",
              ].includes(
                status
              )
            ) {
              stats.interview +=
                1;
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
                status
              )
            ) {
              stats.selected +=
                1;
            }
          }
        );

        return stats;
      }, [
        candidates,
      ]);

    /* =====================================================
       RECENT CANDIDATES
    ===================================================== */

    const recentCandidates =
      useMemo(
        () =>
          candidates
            .slice()
            .sort(
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
            .slice(
              0,
              6
            ),
        [
          candidates,
        ]
      );

    /* =====================================================
       FILTERED CANDIDATES
    ===================================================== */

    const visibleCandidates =
      useMemo(() => {
        if (
          !candidateStatusFilter
        ) {
          return candidates;
        }

        return candidates.filter(
          (
            candidate
          ) =>
            String(
              candidate
                ?.status ||
                ""
            ).toUpperCase() ===
            candidateStatusFilter
        );
      }, [
        candidates,
        candidateStatusFilter,
      ]);

    /* =====================================================
       BUILD WORKSPACE URL

       Keeps source context everywhere.
    ===================================================== */

    const buildWorkspaceUrl =
      (
        extra = {}
      ) => {
        return buildRecruitmentUrl(
          "hiring-workspace",
          {
            id:
              requirementId,

            from:
              sourcePage,

            ...extra,
          }
        );
      };

    /* =====================================================
       SET TAB
    ===================================================== */

    const setTab =
      (
        tab
      ) => {
        navigate(
          buildWorkspaceUrl({
            tab,
          }),
          {
            replace:
              true,
          }
        );
      };

    /* =====================================================
       BACK
    ===================================================== */

    const goBack =
      () => {
        if (
          sourcePage ===
          "hiring"
        ) {
          navigate(
            buildRecruitmentUrl(
              "hiring"
            )
          );

          return;
        }

        navigate(
          buildRecruitmentUrl(
            "my-hiring"
          )
        );
      };

    /* =====================================================
       OPEN CANDIDATE INTAKE
    ===================================================== */

    const handleAddCandidate =
      () => {
        setActionMessage(
          null
        );

        if (
          !canAddCandidate
        ) {
          setActionMessage({
            type:
              "warning",

            title:
              "Candidate intake is locked",

            message:
              addCandidateReason ||
              "Candidate intake is not available for this hiring requirement.",
          });

          return;
        }

        navigate(
          buildWorkspaceUrl({
            tab:
              "candidates",

            addCandidate:
              "true",
          })
        );
      };

    /* =====================================================
       CLOSE CANDIDATE INTAKE
    ===================================================== */

    const closeAddCandidate =
      () => {
        navigate(
          buildWorkspaceUrl({
            tab:
              "candidates",
          }),
          {
            replace:
              true,
          }
        );
      };

    /* =====================================================
       CANDIDATE CREATED
    ===================================================== */

    const handleCandidateCreated =
      async (
        candidate
      ) => {
        closeAddCandidate();

        await loadWorkspace(
          true
        );

        const candidateId =
          getRecordId(
            candidate
          );

        if (
          candidateId
        ) {
          navigate(
            buildCandidateDetailUrl(
              candidateId
            )
          );

          return;
        }

        setTab(
          "candidates"
        );
      };

    /* =====================================================
       PIPELINE DRILL DOWN
    ===================================================== */

    const handlePipelineClick =
      (
        stage
      ) => {
        navigate(
          buildWorkspaceUrl({
            tab:
              "candidates",

            status:
              stage.key,
          })
        );
      };

    /* =====================================================
       CLEAR PIPELINE FILTER
    ===================================================== */

    const clearCandidateFilter =
      () => {
        navigate(
          buildWorkspaceUrl({
            tab:
              "candidates",
          }),
          {
            replace:
              true,
          }
        );
      };

    /* =====================================================
       LOADING
    ===================================================== */

    if (
      loading
    ) {
      return (
        <section className="se-hw-page">
          <div className="se-hw-loading">
            <span />

            <span />

            <span />

            <span />
          </div>
        </section>
      );
    }

    /* =====================================================
       FATAL ERROR
    ===================================================== */

    if (
      !requirement
    ) {
      return (
        <section className="se-hw-page">
          <div className="se-hw-fatal-error">
            <span>
              !
            </span>

            <h2>
              Hiring workspace unavailable
            </h2>

            <p>
              {error ||
                "The hiring requirement could not be loaded."}
            </p>

            <button
              type="button"
              onClick={
                goBack
              }
            >
              Back
            </button>
          </div>
        </section>
      );
    }

    /* =====================================================
       PAGE
    ===================================================== */

    return (
      <section className="se-hw-page">
        {/* =================================================
            HEADER
        ================================================== */}

        <HiringWorkspaceHeader
          requirement={
            requirement
          }
          candidateCount={
            candidates.length
          }
          followUpCount={
            followUps.length
          }
          interviewCount={
            interviews.length
          }
          onBack={
            goBack
          }
          onAddCandidate={
            handleAddCandidate
          }
          canAddCandidate={
            canAddCandidate
          }
          addCandidateReason={
            addCandidateReason
          }
        />

        {/* =================================================
            ACTION MESSAGE
        ================================================== */}

        {actionMessage ? (
          <div
            className={`se-hw-action-message ${actionMessage.type}`}
          >
            <span>
              {actionMessage.type ===
              "success"
                ? "✓"
                : "!"}
            </span>

            <div>
              <strong>
                {
                  actionMessage.title
                }
              </strong>

              <p>
                {
                  actionMessage.message
                }
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setActionMessage(
                  null
                )
              }
            >
              ×
            </button>
          </div>
        ) : null}

        {/* =================================================
            TAB BAR
        ================================================== */}

        <div className="se-hw-tabbar">
          <div className="se-hw-tabs">
            {TABS.map(
              (
                tab
              ) => (
                <button
                  type="button"
                  key={
                    tab.key
                  }
                  className={
                    activeTab ===
                    tab.key
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setTab(
                      tab.key
                    )
                  }
                >
                  {
                    tab.label
                  }

                  {tab.key ===
                    "candidates" ? (
                    <span>
                      {
                        candidates.length
                      }
                    </span>
                  ) : null}

                  {tab.key ===
                    "follow-ups" ? (
                    <span>
                      {
                        followUps.length
                      }
                    </span>
                  ) : null}

                  {tab.key ===
                    "interviews" ? (
                    <span>
                      {
                        interviews.length
                      }
                    </span>
                  ) : null}
                </button>
              )
            )}
          </div>

          <button
            type="button"
            className="se-hw-refresh"
            onClick={() =>
              loadWorkspace(
                true
              )
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
        </div>

        {/* =================================================
            NON-FATAL ERROR
        ================================================== */}

        {error ? (
          <div className="se-hw-inline-error">
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
            OVERVIEW
        ================================================== */}

        {activeTab ===
        "overview" ? (
          <>
            <HiringPipeline
              stats={
                pipelineStats
              }
              onStageClick={
                handlePipelineClick
              }
            />

            <div className="se-hw-overview-grid">
              {/* ===========================================
                  ROLE DETAILS
              ============================================ */}

              <article className="se-hw-panel">
                <div className="se-hw-section-head">
                  <div>
                    <span>
                      ROLE
                    </span>

                    <h3>
                      Hiring Requirement
                    </h3>
                  </div>
                </div>

                <div className="se-hw-detail-grid">
                  <div>
                    <span>
                      Department
                    </span>

                    <strong>
                      {safeText(
                        requirement
                          ?.department
                          ?.name,
                        "—"
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Openings
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
                      Location
                    </span>

                    <strong>
                      {safeText(
                        requirement
                          ?.location,
                        "Not specified"
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Employment
                    </span>

                    <strong>
                      {safeText(
                        requirement
                          ?.employmentType,
                        "—"
                      ).replaceAll(
                        "_",
                        " "
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Experience
                    </span>

                    <strong>
                      {Number(
                        requirement
                          ?.minimumExperienceYears ||
                          0
                      )}

                      {" – "}

                      {Number(
                        requirement
                          ?.maximumExperienceYears ||
                          0
                      )}

                      {" years"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Required By
                    </span>

                    <strong>
                      {formatRecruitmentDate(
                        requirement
                          ?.requiredByDate
                      )}
                    </strong>
                  </div>
                </div>

                {Array.isArray(
                  requirement
                    ?.requiredSkills
                ) &&
                requirement
                  .requiredSkills
                  .length >
                  0 ? (
                  <div className="se-hw-skill-block">
                    <span>
                      REQUIRED SKILLS
                    </span>

                    <div>
                      {requirement
                        .requiredSkills
                        .map(
                          (
                            skill,
                            index
                          ) => (
                            <span
                              key={`${skill}-${index}`}
                            >
                              {
                                skill
                              }
                            </span>
                          )
                        )}
                    </div>
                  </div>
                ) : null}

                <div className="se-hw-reason">
                  <span>
                    BUSINESS REASON
                  </span>

                  <p>
                    {safeText(
                      requirement
                        ?.reason,
                      "No business reason recorded."
                    )}
                  </p>
                </div>
              </article>

              {/* ===========================================
                  ACTION CENTER
              ============================================ */}

              <article className="se-hw-panel">
                <div className="se-hw-section-head">
                  <div>
                    <span>
                      ACTION CENTER
                    </span>

                    <h3>
                      Recruitment Work
                    </h3>

                    <p>
                      Your current actions
                      for this role.
                    </p>
                  </div>
                </div>

                <div className="se-hw-action-list">
                  {tasks
                    .slice(
                      0,
                      6
                    )
                    .map(
                      (
                        candidate
                      ) => {
                        const id =
                          getRecordId(
                            candidate
                          );

                        const actionMeta =
                          getNextActionMeta(
                            candidate
                              ?.nextAction
                          );

                        return (
                          <button
                            type="button"
                            key={
                              id ||
                              candidate
                                ?.candidateNumber
                            }
                            onClick={() =>
                              id
                                ? navigate(
                                    buildCandidateDetailUrl(
                                      id
                                    )
                                  )
                                : null
                            }
                          >
                            <span
                              className={`se-hw-action-icon tone-${actionMeta.tone}`}
                            >
                              {candidate
                                ?.nextAction ===
                              "CALL_CANDIDATE"
                                ? "☎"
                                : candidate
                                      ?.nextAction ===
                                    "FOLLOW_UP_CALL"
                                  ? "↻"
                                  : candidate
                                        ?.nextAction ===
                                      "COMPLETE_SCREENING"
                                    ? "S"
                                    : "→"}
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
                                {
                                  actionMeta.label
                                }
                              </small>
                            </div>

                            <span className="se-hw-action-date">
                              {candidate
                                ?.nextActionAt
                                ? formatRecruitmentDateTime(
                                    candidate
                                      .nextActionAt
                                  )
                                : "Now"}
                            </span>

                            <span className="se-hw-action-arrow">
                              →
                            </span>
                          </button>
                        );
                      }
                    )}

                  {tasks.length ===
                  0 ? (
                    <RecruitmentEmptyState
                      icon="✓"
                      title="No pending actions"
                      description="There are no recruitment tasks waiting for this role."
                    />
                  ) : null}
                </div>
              </article>
            </div>

            {/* =============================================
                RECENT CANDIDATES
            ============================================== */}

            <article className="se-hw-panel se-hw-recent-panel">
              <div className="se-hw-section-head row">
                <div>
                  <span>
                    CANDIDATES
                  </span>

                  <h3>
                    Recent Candidates
                  </h3>

                  <p>
                    Latest activity under
                    this hiring requirement.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setTab(
                      "candidates"
                    )
                  }
                >
                  View all

                  <span>
                    →
                  </span>
                </button>
              </div>

              {recentCandidates.length >
              0 ? (
                <div className="se-hw-candidate-list">
                  {recentCandidates.map(
                    (
                      candidate
                    ) => {
                      const id =
                        getRecordId(
                          candidate
                        );

                      const statusMeta =
                        getCandidateStatusMeta(
                          candidate
                            ?.status
                        );

                      return (
                        <button
                          type="button"
                          key={
                            id ||
                            candidate
                              ?.candidateNumber
                          }
                          onClick={() =>
                            id
                              ? navigate(
                                  buildCandidateDetailUrl(
                                    id
                                  )
                                )
                              : null
                          }
                        >
                          <span className="se-hw-candidate-avatar">
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

                          <span className="se-hw-candidate-main">
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
                                  ?.currentCompany,
                                "Company not specified"
                              )}
                            </small>
                          </span>

                          <RecruitmentStatusBadge
                            label={
                              statusMeta.label
                            }
                            tone={
                              statusMeta.tone
                            }
                          />

                          <span className="se-hw-candidate-date">
                            {formatRecruitmentDate(
                              candidate
                                ?.updatedAt ||
                              candidate
                                ?.createdAt
                            )}
                          </span>

                          <span className="se-hw-candidate-arrow">
                            →
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>
              ) : (
                <RecruitmentEmptyState
                  icon="C"
                  title="No candidates yet"
                  description={
                    canAddCandidate
                      ? "Add the first candidate to begin recruitment for this role."
                      : addCandidateReason
                  }
                />
              )}
            </article>
          </>
        ) : null}

        {/* =================================================
            CANDIDATES
        ================================================== */}

        {activeTab ===
        "candidates" ? (
          <article className="se-hw-panel se-hw-tab-panel">
            <div className="se-hw-section-head row">
              <div>
                <span>
                  CANDIDATES
                </span>

                <h3>
                  Candidate Pipeline
                </h3>

                <p>
                  Upload and review CVs
                  directly against this
                  hiring requirement.
                </p>
              </div>

              <div className="se-hw-candidate-tab-actions">
                {!canAddCandidate ? (
                  <span className="se-hw-candidate-lock-copy">
                    {
                      addCandidateReason
                    }
                  </span>
                ) : null}

                <button
                  type="button"
                  className="primary"
                  onClick={
                    handleAddCandidate
                  }
                  disabled={
                    !canAddCandidate
                  }
                  title={
                    canAddCandidate
                      ? "Add Candidate"
                      : addCandidateReason
                  }
                >
                  <span>
                    +
                  </span>

                  Add Candidate
                </button>
              </div>
            </div>

            {candidateStatusFilter ? (
              <div className="se-hw-filter-notice">
                <span>
                  F
                </span>

                <p>
                  Showing candidates with
                  status{" "}
                  <strong>
                    {candidateStatusFilter.replaceAll(
                      "_",
                      " "
                    )}
                  </strong>
                </p>

                <button
                  type="button"
                  onClick={
                    clearCandidateFilter
                  }
                >
                  Clear filter
                </button>
              </div>
            ) : null}

            {visibleCandidates.length >
            0 ? (
              <div className="se-hw-candidate-list">
                {visibleCandidates.map(
                  (
                    candidate
                  ) => {
                    const id =
                      getRecordId(
                        candidate
                      );

                    const statusMeta =
                      getCandidateStatusMeta(
                        candidate
                          ?.status
                      );

                    return (
                      <button
                        type="button"
                        key={
                          id ||
                          candidate
                            ?.candidateNumber
                        }
                        onClick={() =>
                          id
                            ? navigate(
                                buildCandidateDetailUrl(
                                  id
                                )
                              )
                            : null
                        }
                      >
                        <span className="se-hw-candidate-avatar">
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

                        <span className="se-hw-candidate-main">
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
                        </span>

                        <RecruitmentStatusBadge
                          label={
                            statusMeta.label
                          }
                          tone={
                            statusMeta.tone
                          }
                        />

                        <span className="se-hw-candidate-date">
                          {formatRecruitmentDate(
                            candidate
                              ?.updatedAt ||
                            candidate
                              ?.createdAt
                          )}
                        </span>

                        <span className="se-hw-candidate-arrow">
                          →
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            ) : (
              <RecruitmentEmptyState
                icon="C"
                title={
                  candidateStatusFilter
                    ? "No candidates in this stage"
                    : "No candidates yet"
                }
                description={
                  candidateStatusFilter
                    ? "No candidates currently match the selected pipeline stage."
                    : canAddCandidate
                      ? "Upload the first CV to begin candidate sourcing."
                      : addCandidateReason
                }
              />
            )}
          </article>
        ) : null}

        {/* =================================================
            FOLLOW UPS
        ================================================== */}

        {activeTab ===
        "follow-ups" ? (
          <article className="se-hw-panel se-hw-tab-panel">
            <div className="se-hw-section-head">
              <div>
                <span>
                  FOLLOW-UPS
                </span>

                <h3>
                  Candidate Follow-ups
                </h3>

                <p>
                  Follow-up actions linked
                  to this requirement.
                </p>
              </div>
            </div>

            {followUps.length >
            0 ? (
              <div className="se-hw-followup-list">
                {followUps.map(
                  (
                    candidate
                  ) => {
                    const id =
                      getRecordId(
                        candidate
                      );

                    return (
                      <button
                        type="button"
                        key={
                          id ||
                          candidate
                            ?.candidateNumber
                        }
                        onClick={() =>
                          id
                            ? navigate(
                                buildCandidateDetailUrl(
                                  id
                                )
                              )
                            : null
                        }
                      >
                        <span className="se-hw-followup-icon">
                          ↻
                        </span>

                        <span>
                          <strong>
                            {safeText(
                              candidate
                                ?.fullName,
                              "Candidate"
                            )}
                          </strong>

                          <small>
                            Follow-up call
                          </small>
                        </span>

                        <span className="se-hw-followup-time">
                          {candidate
                            ?.nextActionAt
                            ? formatRecruitmentDateTime(
                                candidate
                                  .nextActionAt
                              )
                            : "No time set"}
                        </span>

                        <span>
                          →
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            ) : (
              <RecruitmentEmptyState
                icon="✓"
                title="No follow-ups"
                description="There are currently no candidate follow-ups for this role."
              />
            )}
          </article>
        ) : null}

        {/* =================================================
            INTERVIEWS
        ================================================== */}

        {activeTab ===
        "interviews" ? (
          <article className="se-hw-panel se-hw-tab-panel">
            <div className="se-hw-section-head">
              <div>
                <span>
                  INTERVIEWS
                </span>

                <h3>
                  Interview Schedule
                </h3>

                <p>
                  Interviews linked to
                  this hiring requirement.
                </p>
              </div>
            </div>

            {interviews.length >
            0 ? (
              <div className="se-hw-interview-list">
                {interviews.map(
                  (
                    interview
                  ) => {
                    const id =
                      getRecordId(
                        interview
                      );

                    const interviewStatus =
                      String(
                        interview
                          ?.status ||
                          ""
                      ).toUpperCase();

                    return (
                      <button
                        type="button"
                        key={
                          id
                        }
                        onClick={() =>
                          navigate(
                            buildRecruitmentUrl(
                              "interview",
                              {
                                id,
                              }
                            )
                          )
                        }
                      >
                        <span className="se-hw-interview-icon">
                          I
                        </span>

                        <span className="se-hw-interview-main">
                          <strong>
                            {safeText(
                              interview
                                ?.candidate
                                ?.fullName ||
                              interview
                                ?.candidateName,
                              "Candidate"
                            )}
                          </strong>

                          <small>
                            {safeText(
                              interview
                                ?.roundName,
                              `Round ${Number(
                                interview
                                  ?.roundNumber ||
                                  1
                              )}`
                            )}
                          </small>
                        </span>

                        <span className="se-hw-interview-time">
                          <strong>
                            {formatRecruitmentDate(
                              interview
                                ?.scheduledAt
                            )}
                          </strong>

                          <small>
                            {formatRecruitmentDateTime(
                              interview
                                ?.scheduledAt
                            )}
                          </small>
                        </span>

                        <RecruitmentStatusBadge
                          label={
                            safeText(
                              interview
                                ?.status,
                              "Scheduled"
                            ).replaceAll(
                              "_",
                              " "
                            )
                          }
                          tone={
                            interviewStatus ===
                            "COMPLETED"
                              ? "success"
                              : interviewStatus ===
                                  "CANCELLED"
                                ? "danger"
                                : interviewStatus ===
                                    "RESCHEDULED"
                                  ? "warning"
                                  : "blue"
                          }
                        />

                        <span>
                          →
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            ) : (
              <RecruitmentEmptyState
                icon="I"
                title="No interviews scheduled"
                description="Shortlisted candidates will appear here after interview scheduling."
              />
            )}
          </article>
        ) : null}

        {/* =================================================
            CANDIDATE INTAKE

            Still using existing component for this step.

            NEXT STEP:
            AddCandidateDrawer will be transformed into the
            centered premium Candidate Intake modal.
        ================================================== */}

        <AddCandidateDrawer
          open={
            addCandidateOpen
          }
          requirement={
            requirement
          }
          onClose={
            closeAddCandidate
          }
          onCreated={
            handleCandidateCreated
          }
        />
      </section>
    );
  };

export default HiringWorkspacePage;